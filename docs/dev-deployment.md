# Dev Deployment Runbook — `dev.braidsbydeb.com`

Deploying the Braids by Deb platform to the **dev** environment. Dev lives on its own
subdomain and its own resources (`braidsbydeb-dev-*`) — nothing here touches the live
site or the prod stack.

Related docs: [migration-and-bootstrap.md](migration-and-bootstrap.md) (state strategy,
old-stack coexistence) · [github-environments.md](github-environments.md) (CI/CD setup).

---

## Prerequisites (once)

| Requirement | Check |
|---|---|
| AWS CLI authenticated as an admin-capable principal | `aws sts get-caller-identity` |
| Terraform ≥ 1.7 | `terraform version` |
| Node 22+ / npm | `node --version` |
| Python 3.14 + lambdas venv | `cd lambdas && pip install -r requirements-dev.txt` |
| Stripe **TEST** keys | `pk_test_…`, `sk_test_…` (Dashboard → Test mode → Developers → API keys) |
| Route 53 hosted zone `braidsbydeb.com` exists | `aws route53 list-hosted-zones` |

> ℹ️ The GitHub Actions OIDC provider is created by `infra/bootstrap` (step 1), not by
> the env stacks — both tfvars set `create_oidc_provider = false`. If the account ever
> already has a `token.actions.githubusercontent.com` provider from another project,
> `terraform import` it into bootstrap instead of creating it.

---

# FIRST-TIME DEPLOYMENT

## 1. Bootstrap the Terraform state backend (account-wide, once ever)

```bash
cd infra/bootstrap
terraform init
terraform apply        # braidsbydeb-tfstatefiles + braidsbydeb-tflock + GitHub OIDC provider
```

Safe to run alongside the legacy `braiding-studio-*` stack — all names are distinct.
Bootstrap also owns the account-level GitHub Actions OIDC provider, so destroying a
dev or prod env stack never breaks the other environment's CI/CD trust. Re-run this
apply if you bootstrapped before the OIDC provider was added here.

## 2. Build the Lambda packages

The root module references `lambdas/dist/*.zip`, so they must exist before any apply:

```bash
cd lambdas
make build             # → dist/public-api.zip + dist/admin-api.zip (arm64)
```

## 3. Apply the dev stack (~15–20 min, mostly CloudFront/ACM)

```bash
cd ../infra
terraform init -backend-config=backend/dev.tfbackend -reconfigure
terraform plan  -var-file=env/dev.tfvars     # review first
terraform apply -var-file=env/dev.tfvars
```

Capture the outputs — the frontend build needs them:

```bash
terraform output
# cognito_user_pool_id, cognito_client_id, frontend_distribution_id,
# frontend_bucket_name, assets_bucket_name, api_endpoint, github_actions_role_arn
```

## 4. Set the Stripe secrets (SSM — never in code or state)

```bash
aws ssm put-parameter --name /braidsbydeb/dev/stripe/secret_key \
  --type SecureString --value sk_test_XXXX --overwrite
# webhook_secret is set in step 8 after the webhook exists
```

## 5. Seed the catalog, settings, portfolio, and demo reviews

```bash
cd ../lambdas
TABLE_SERVICES=braidsbydeb-dev-services \
TABLE_BUSINESS_SETTINGS=braidsbydeb-dev-business-settings \
TABLE_REVIEWS=braidsbydeb-dev-reviews \
TABLE_PORTFOLIO=braidsbydeb-dev-portfolio \
CDN_BASE_URL=https://cdn.dev.braidsbydeb.com \
.venv/bin/python scripts/seed_data.py
```

## 6. Create the admin user

```bash
POOL=<cognito_user_pool_id output>
aws cognito-idp admin-create-user --user-pool-id $POOL \
  --username you@example.com \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true
aws cognito-idp admin-add-user-to-group --user-pool-id $POOL \
  --username you@example.com --group-name admins
```

First login at `https://dev.braidsbydeb.com/admin` walks the temp-password flow.

## 7. Build and deploy the frontend

```bash
cd ../apps/web
VITE_API_BASE_URL=https://dev.braidsbydeb.com/api \
VITE_CDN_BASE_URL=https://cdn.dev.braidsbydeb.com \
VITE_COGNITO_DOMAIN=auth.dev.braidsbydeb.com \
VITE_COGNITO_USER_POOL_ID=<output> \
VITE_COGNITO_CLIENT_ID=<output> \
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_<GET IT FROM STRIPE> \
npm run build

aws s3 sync dist/ s3://braidsbydeb-dev-frontend/ --delete \
  --cache-control "public,max-age=31536000,immutable" --exclude "index.html"
aws s3 cp dist/index.html s3://braidsbydeb-dev-frontend/index.html \
  --cache-control "no-cache,no-store,must-revalidate"
aws s3 sync public/images s3://braidsbydeb-dev-assets/images \
  --cache-control "public,max-age=31536000,immutable" --exclude ".DS_Store"
aws cloudfront create-invalidation \
  --distribution-id <frontend_distribution_id> --paths "/*"
```

## 8. Stripe webhook (Dashboard, **Test mode**)

- Endpoint: `https://dev.braidsbydeb.com/api/webhooks/stripe`
- Events: `payment_intent.succeeded`, `charge.refunded`, `refund.created`,
  `refund.updated`, `refund.failed`
- Put the signing secret into SSM:

```bash
aws ssm put-parameter --name /braidsbydeb/dev/stripe/webhook_secret \
  --type SecureString --value whsec_XXXX --overwrite
```

## 9. Verification checklist

- [ ] `https://dev.braidsbydeb.com` loads; services/gallery show seeded content
- [ ] SES: domain identity shows **verified** (DKIM records were created by Terraform)
- [ ] Book an appointment end-to-end with test card `4242 4242 4242 4242`
- [ ] Confirmation email arrives (client + admin alert)
- [ ] Appointment portal link in the email works (reschedule/cancel)
- [ ] `/admin` login works; the test appointment is visible
- [ ] Admin: upload a photo, create a service → appears on the public site
- [ ] Submit a contact message + a review; approve the review in admin → it publishes
- [ ] Mobile pass: home, services, booking wizard

---

# DAY 2 — Updating a Running Dev Environment

## Option A (recommended): CI/CD via GitHub Actions

One-time: push to `benahoure/braiding-studio-platform` and configure the
`development` environment per [github-environments.md](github-environments.md)
(`AWS_ROLE_TO_ASSUME` from `terraform output github_actions_role_arn`, Cognito
vars, `VITE_STRIPE_PUBLISHABLE_KEY` secret, `CLOUDFRONT_DISTRIBUTION_ID`).

Then updates are just pushes to `main`:

| You changed | Workflow that runs | What it does |
|---|---|---|
| `apps/web/**` | `deploy-frontend.yml` | lint → test → build → S3 sync → invalidation |
| `lambdas/**` | `deploy-backend.yml` | ruff/mypy/pytest/audit → `terraform apply -target` (Lambdas only) → SSM cache flush |
| `infra/**` | `deploy-infra-plan.yml` then `deploy-infra-apply.yml` (both **manual** `workflow_dispatch`, always) | run Plan → review its output → run Apply with the printed `plan_run_id` |

## Option B: manual updates

**Frontend change:** repeat step 7 (build with the same `VITE_` vars → sync → invalidate).

**Backend (Lambda code) change:**
```bash
cd lambdas && make build
cd ../infra
terraform apply -var-file=env/dev.tfvars \
  -target=module.public_api -target=module.admin_api
```

**Infrastructure change (new table, route, CloudFront, etc.):**
```bash
cd infra
terraform plan  -var-file=env/dev.tfvars   # always review
terraform apply -var-file=env/dev.tfvars
```

## Routine operations

| Task | How |
|---|---|
| Add another admin | Step 6 commands with the new email |
| Rotate Stripe secret | `aws ssm put-parameter … --overwrite`, then force a cold start: `aws lambda update-function-configuration --function-name braidsbydeb-dev-public-api --description "rotate-$(date +%s)"` (repeat for `-admin-api`) |
| Re-seed services/settings | Re-run step 5. **Caution:** overwrites business settings and re-prunes seed-owned services in dev; admin-created services with other IDs are kept, admin edits to *seeded* items are overwritten |
| Tail API logs | `aws logs tail /aws/lambda/braidsbydeb-dev-public-api --follow` (same for `-admin-api`) |
| Check alarms | CloudWatch → alarms prefixed `braidsbydeb-dev-` |
| CSP / header changes | Edit `infra/cloudfront.tf` → apply → **must** invalidate CloudFront `/*` |
| Cognito hosted-UI branding | Console → User pool → App integration → upload `apps/web/public/Cognito-logo-braidsbydebs.png` + `cognito-hosted-ui.css` |
| Tear down dev entirely | `terraform destroy -var-file=env/dev.tfvars` (dev buckets have `force_destroy`; the OIDC provider lives in bootstrap so prod CI/CD is unaffected) |

## Troubleshooting quick hits

- **422/400 from admin or booking** → contract drift; run `pytest` + `npm test` and diff `serviceCategories.ts` vs `services/models.py`/`handler.py`.
- **Payment succeeds but no confirmation** → check `/booking/success` redirect flow and the webhook secret in SSM; logs of `public-api`.
- **Images 404 on services** → `public/images` not synced to the assets bucket, or seed ran with the wrong `CDN_BASE_URL`.
- **Admin login loops** → CSP `connect-src` must include `auth.dev.braidsbydeb.com`; invalidate CloudFront after any CSP apply.
- **Stale content after deploy** → you forgot the CloudFront invalidation.
