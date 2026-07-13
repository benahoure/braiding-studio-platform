# Prod Deployment Runbook — `braidsbydeb.com`

Deploying the Braids by Deb platform to **production**. The legacy
`braiding-studio-*` stack was destroyed on 2026-07-12 (step 1, kept for the record),
so `braidsbydeb.com` is dark until the prod apply + frontend deploy bring the new
platform live. Read this whole document before starting.

Related docs: [dev-deployment.md](dev-deployment.md) ·
[migration-and-bootstrap.md](migration-and-bootstrap.md) ·
[github-environments.md](github-environments.md).

---

## Hard prerequisites

- [ ] **Dev is fully verified** — every item in the dev verification checklist passed,
      including a real test-card booking, emails, admin CRUD, and the portal.
- [ ] Stripe **LIVE** keys at hand (`pk_live_…`, `sk_live_…`) — never used in dev.
- [ ] State backend already bootstrapped (done once, during the dev deploy).
- [ ] `braidsbydeb.com` is currently **dark** (legacy stack destroyed 2026-07-12)
      and stays dark until step 3 (apply) + step 7 (frontend deploy) bring the new
      platform live.

---

# FIRST-TIME DEPLOYMENT (Go-Live)

## 1. Retire the legacy stack — ✅ done 2026-07-12

The legacy `braiding-studio-*` prod stack was destroyed and verified gone (no
tables, Lambdas, buckets, or CloudFront distributions remain). Still in the
account, deliberately:

- The Route 53 hosted zone and the three apex `_domainkey` DKIM CNAMEs — these
  keep the verified `braidsbydeb.com` SES identity alive. **Do not delete.**
- The old state backend, kept only for the record. Remove whenever ready
  (versioned bucket, so empty-and-delete via the S3 console, or):

```bash
lambdas/.venv/bin/python -c "import boto3; b=boto3.resource('s3').Bucket('braiding-studio-terraform-state'); b.object_versions.delete(); b.delete()"
aws dynamodb delete-table --table-name braiding-studio-terraform-locks
```

## 2. Build fresh Lambda packages

```bash
cd lambdas && make build
```

## 3. Apply the prod stack

```bash
cd ../infra
terraform init -backend-config=backend/prod.tfbackend -reconfigure
terraform plan  -var-file=env/prod.tfvars     # review every line; expect creates only
terraform apply -var-file=env/prod.tfvars     # ~15–25 min
terraform output                               # capture all outputs
```

Prod differences vs dev (from `env/prod.tfvars`): **WAF enabled**, 512 MB Lambdas,
30-day logs, `WARNING` log level, no localhost CORS origins.

This creates the apex/www A-records fresh — the site serves as soon as the frontend
is synced in step 7.

## 4. Set LIVE Stripe secrets

```bash
aws ssm put-parameter --name /braidsbydeb/prod/stripe/secret_key \
  --type SecureString --value sk_live_XXXX --overwrite
```

## 5. Seed production data

```bash
cd ../lambdas
TABLE_SERVICES=braidsbydeb-prod-services \
TABLE_BUSINESS_SETTINGS=braidsbydeb-prod-business-settings \
TABLE_REVIEWS=braidsbydeb-prod-reviews \
TABLE_PORTFOLIO=braidsbydeb-prod-portfolio \
CDN_BASE_URL=https://cdn.braidsbydeb.com \
.venv/bin/python scripts/seed_data.py
```

Note: demo reviews are seeded only in dev (`SEED_DEMO_REVIEWS` defaults off for
prod) — prod reviews start empty and grow from real client submissions.

## 6. Create Deb’s admin user

```bash
POOL=<prod cognito_user_pool_id>
aws cognito-idp admin-create-user --user-pool-id $POOL \
  --username deb@example.com \
  --user-attributes Name=email,Value=deb@example.com Name=email_verified,Value=true
aws cognito-idp admin-add-user-to-group --user-pool-id $POOL \
  --username deb@example.com --group-name admins
```

## 7. Build and deploy the frontend (LIVE publishable key)

```bash
cd ../apps/web
VITE_API_BASE_URL=https://braidsbydeb.com/api \
VITE_CDN_BASE_URL=https://cdn.braidsbydeb.com \
VITE_COGNITO_DOMAIN=auth.braidsbydeb.com \
VITE_COGNITO_USER_POOL_ID=<prod output> \
VITE_COGNITO_CLIENT_ID=<prod output> \
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_XXXX \
npm run build

aws s3 sync dist/ s3://braidsbydeb-prod-frontend/ --delete \
  --cache-control "public,max-age=31536000,immutable" --exclude "index.html"
aws s3 cp dist/index.html s3://braidsbydeb-prod-frontend/index.html \
  --cache-control "no-cache,no-store,must-revalidate"
aws s3 sync public/images s3://braidsbydeb-prod-assets/images \
  --cache-control "public,max-age=31536000,immutable" --exclude ".DS_Store"
aws cloudfront create-invalidation \
  --distribution-id <prod frontend_distribution_id> --paths "/*"
```

## 8. Stripe webhook (Dashboard, **Live mode**)

- Endpoint: `https://braidsbydeb.com/api/webhooks/stripe`
- Events: `payment_intent.succeeded`, `charge.refunded`, `refund.created`,
  `refund.updated`, `refund.failed`

```bash
aws ssm put-parameter --name /braidsbydeb/prod/stripe/webhook_secret \
  --type SecureString --value whsec_XXXX --overwrite
```

## 9. Go-live verification checklist

- [ ] `https://braidsbydeb.com` and `https://www.braidsbydeb.com` (301 → apex) serve the new site
- [ ] SES domain identity **verified**; SPF/DKIM/DMARC records present
- [ ] **One real $20 booking with a real card** → confirm → email → portal → then
      refund it from `/admin` (also proves the refund path + webhook)
- [ ] `/admin` login (Deb’s account), appointment visible, photo upload works
- [ ] Contact form → admin alert email received
- [ ] WAF ACL attached (CloudFront console) and alarms exist (`braidsbydeb-prod-*`)
- [ ] Mobile pass on a real phone
- [ ] Cognito hosted-UI branding uploaded (logo + CSS from `apps/web/public/`)

---

# DAY 2 — Operating Production

## Release flow (recommended): CI/CD

With GitHub environments configured ([github-environments.md](github-environments.md)),
every push to `main` deploys **dev automatically**. **Prod never deploys from a
push** — ship it with Actions → select workflow → *Run workflow* → environment
`prod` (plus the `production` environment's required-reviewer approval, where the
GitHub plan enforces it — note: protection rules are not enforced on private
repos on the free plan, which is why prod is dispatch-only at the workflow level):

| Change | Pipeline | Prod trigger |
|---|---|---|
| `apps/web/**` | deploy-frontend | manual `workflow_dispatch` (env `prod`) |
| `lambdas/**` | deploy-backend (tests + security scan first; Lambdas-only apply) | manual `workflow_dispatch` (env `prod`) |
| `infra/**` | deploy-infra — **manual dispatch only**, plan artifact reviewed before apply | manual dispatch |

Golden rule: **never ship anything to prod that didn’t run on dev first.**

## Manual release (fallback)

Same commands as first-time steps 2–3 (backend) and 7 (frontend), always with
`prod.tfbackend` / `env/prod.tfvars` / prod outputs / `pk_live_`.

## Routine operations

| Task | How |
|---|---|
| New admin / stylist login | First-time step 6 with their email |
| Content (services, prices, photos, hours, reviews approval) | **Use `/admin`** — no deploy needed; never re-run the seed against prod once Deb manages content (it overwrites seeded items + settings) |
| Rotate live Stripe keys | SSM `--overwrite` + description-touch both Lambdas to flush the cold-start cache |
| Logs | `aws logs tail /aws/lambda/braidsbydeb-prod-public-api --follow` (+ `-admin-api`); API access log group `braidsbydeb-prod-api-access` |
| Alarms | CloudWatch `braidsbydeb-prod-*` (Lambda errors/throttles, API 4xx/5xx, DDB throttles). Wire notifications by setting `alarm_actions` (SNS topic ARN) in `env/prod.tfvars` |
| WAF tuning | If legit traffic is blocked, set `waf_common_override_count = true` in tfvars temporarily and review sampled requests |
| Backups | All tables have PITR; deletion protection is on in prod |

## Rollback

| Broke | Rollback |
|---|---|
| Frontend | `git checkout <last-good>` of `apps/web` → rebuild → S3 sync → invalidate (minutes) |
| Lambda code | Rebuild from last-good commit → `terraform apply -target=module.public_api -target=module.admin_api` |
| Infra change | `terraform apply` the previous configuration (state is versioned in S3 — the bucket keeps noncurrent versions 180 days) |
| Prod completely broken | Dev is a full working replica — reproduce there, fix forward, and ship via the normal pipeline; there is no legacy stack to fall back to |

## Incident quick checks

1. Site down? → CloudFront distribution status, then S3 `index.html` exists.
2. Bookings failing? → `public-api` logs; Stripe Dashboard → webhook delivery attempts;
   SSM secrets present and non-`REPLACE_ME`.
3. Emails missing? → SES sending statistics + suppression list; sender domain still verified.
4. Admin 401s? → Cognito app client hasn’t changed; JWT authorizer audience matches
   `cognito_client_id`; user is in the `admins` group.
