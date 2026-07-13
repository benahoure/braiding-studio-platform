# State, Bootstrap & Migration Runbook

## The situation

There is already a **live, deployed stack** in this AWS account:

- Config: `braiding-studio-aws-infra/` (flat Terraform)
- Resources: named `braiding-studio-{env}-*` (site bucket, one CloudFront dist, 5 DynamoDB tables, 4 Lambdas, HTTP API)
- State backend: S3 bucket `braiding-studio-terraform-state` + DynamoDB lock table `braiding-studio-terraform-locks`
- `braidsbydeb.com` currently resolves (via Route53 alias) to that stack's CloudFront.

The **new** stack (`infra/`) is a *different* Terraform configuration: different resource names
(`braidsbydeb-{env}-*`) and its own state. This is a **parallel (blue/green) rebuild in the same
account**, not an in-place migration.

## Why the existing state file is not a blocker

Terraform state is **per-configuration**. The new `infra/` never reads or writes the old state, and
the new bootstrap creates a **new** backend bucket/table whose names do **not** collide with the old
ones:

| | Old (existing) | New (this repo) |
|---|---|---|
| State bucket | `braiding-studio-terraform-state` | `braidsbydeb-tfstatefiles` |
| Lock table | `braiding-studio-terraform-locks` | `braidsbydeb-tflock` |
| Resource prefix | `braiding-studio-{env}-` | `braidsbydeb-{env}-` |
| State keys | `platform/prod/terraform.tfstate` | `dev/…`, `prod/…` |

So `cd infra/bootstrap && terraform apply` is **safe to run** — it can't clash with anything that
already exists. The old stack keeps running, untouched, the entire time.

## Recommended approach: dedicated new backend (Option A)

Run the new bootstrap once. Clean, self-contained, matches the Grace pattern, and keeps the old and
new lifecycles fully separate so tearing the old stack down later is a clean `terraform destroy` with
nothing shared.

> Alternative (Option B): skip `infra/bootstrap` and point `backend/*.tfbackend` at the existing
> `braiding-studio-terraform-state` bucket with new keys. Fewer buckets, but the state bucket then
> outlives the old stack and must be excluded from old-stack teardown. Option A is preferred.

## Runbook

### 1. Bootstrap the new backend + OIDC provider (once)
```bash
cd infra/bootstrap
terraform init
terraform apply          # braidsbydeb-tfstatefiles + braidsbydeb-tflock + GitHub OIDC provider
```
The GitHub Actions OIDC provider lives here (account-level) — not in the env stacks — so a
`terraform destroy` of dev or prod can never break the other environment's CI/CD trust. Both
env tfvars set `create_oidc_provider = false` and look it up via a `data` source.

### 2. Deploy the new stack to **dev** — zero impact on prod/old stack
`dev.braidsbydeb.com` is a distinct subdomain, so nothing the old stack owns is touched.
```bash
# Build the Lambda zips first — the root module references lambdas/dist/*.zip
(cd ../lambdas && make build)

cd infra
terraform init -backend-config=backend/dev.tfbackend -reconfigure
terraform plan  -var-file=env/dev.tfvars      # review first
terraform apply -var-file=env/dev.tfvars
```
The per-env backend key (`dev/terraform.tfstate`) isolates dev state, so no Terraform workspaces are
needed — switching environments is just a re-`init` with the other `-backend-config`.

Then: set SSM secrets, verify SES DKIM, create a Cognito admin user, and run the app end-to-end.

### 3. Retire the old stack **before** the prod apply — ✅ done 2026-07-12
The old site was never handed to the client, so there is no traffic to protect — destroying it
first is simpler than the overwrite-then-state-rm cutover dance, and it means the prod apply is a
plain create with no shared ownership at all. (Executed 2026-07-12; the
`braiding-studio-aws-infra/` and `braiding-studio-webapp/` folders were removed from the repo
afterwards. Only the old state backend remains in AWS — see prod-deployment.md step 1 for cleanup.)

```bash
cd ../braiding-studio-aws-infra
terraform init -backend-config=backend/prod.backend.hcl -reconfigure

# Sanity check: the hosted zone must NOT be in this state (create_hosted_zone=false → data source)
terraform state list | grep route53_zone   # expect no output

# Empty the site bucket first — destroy fails on non-empty buckets
aws s3 ls | grep braiding-studio           # find the braiding-studio-prod-site-… bucket
aws s3 rm s3://braiding-studio-prod-site-XXXX --recursive

terraform destroy -var-file=env/prod.tfvars
```
`braidsbydeb.com` stops resolving at this point and stays dark until step 4 — acceptable, since
the old site never had client traffic. The hosted zone, the verified `braidsbydeb.com` SES domain
identity (created outside Terraform), and the registrar NS delegation are all untouched.

### 4. Deploy the new stack to **prod** (go-live)
```bash
(cd ../lambdas && make build)
cd infra
terraform init -backend-config=backend/prod.tfbackend -reconfigure
terraform plan  -var-file=env/prod.tfvars
terraform apply -var-file=env/prod.tfvars
```
With the legacy stack already gone this is a pure create — the apex/www A-records are fresh, not
overwrites. The site is live as soon as CloudFront finishes deploying and the frontend is synced.

## Account-global / domain-unique resources to watch at apply time

These are the only real conflict points (all handled, but confirm before prod apply):

- **Route53 hosted zone** — read-only `data` source in both stacks (`create_hosted_zone = false`
  in the legacy prod tfvars, verified). Neither destroy nor apply can touch the zone or its NS
  delegation.
- **Apex / www A-records** — legacy is destroyed before the prod apply, so these are plain
  creates. (`allow_overwrite = true` remains as a harmless safety net.)
- **ACM certificate** — new stack requests its own; ACM allows multiple certs per domain. No conflict.
- **SES** — the verified `braidsbydeb.com` **domain** identity exists in the account but is *not*
  in the legacy Terraform state (legacy only owns a failed `bookings@…` email identity), so the
  legacy destroy can't delete it. The prod stack's `aws_ses_domain_identity` create is idempotent
  (VerifyDomainIdentity) and simply adopts it.
- **GitHub OIDC provider** — one per account, owned by `infra/bootstrap`. Both env stacks set
  `create_oidc_provider = false` and reference it via a `data` source, so destroying either env
  never breaks the other's CI/CD trust.
