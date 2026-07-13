# GitHub Actions — Environments, Variables & Secrets

The workflows authenticate to AWS with **OIDC** (no stored AWS keys). They read per-environment
`vars` and `secrets` from two GitHub Environments: **`development`** and **`production`**.

Repo: `benahoure/braiding-studio-platform` (the OIDC trust in `infra/github-actions.tf` is scoped to
`repo:benahoure/braiding-studio-platform:*`).

## One-time setup order

1. Create the GitHub repo and push this branch.
2. `terraform apply` **dev** (see `docs/migration-and-bootstrap.md`). This creates the OIDC provider,
   the `braidsbydeb-dev-github-actions` IAM role, Cognito, and CloudFront.
3. Read the values you need from Terraform outputs:
   ```bash
   cd infra
   terraform output github_actions_role_arn      # -> AWS_ROLE_TO_ASSUME (dev)
   terraform output cognito_user_pool_id          # -> VITE_COGNITO_USER_POOL_ID
   terraform output cognito_client_id             # -> VITE_COGNITO_CLIENT_ID
   terraform output frontend_distribution_id      # -> CLOUDFRONT_DISTRIBUTION_ID
   ```
4. Create the **`development`** GitHub Environment and add the vars/secrets below.
5. Repeat 2–4 with **prod** to populate the **`production`** Environment.
6. On the **`production`** environment, add a **required reviewer** protection rule — this is what
   gates the prod deploy step for manual approval.

## Per-environment values

Set these under **Settings → Environments → [development | production]**.

### Variables (not secret)

| Variable | dev value | prod value |
|---|---|---|
| `AWS_ROLE_TO_ASSUME` | `arn:…:role/braidsbydeb-dev-github-actions` | `arn:…:role/braidsbydeb-prod-github-actions` |
| `VITE_COGNITO_USER_POOL_ID` | dev `cognito_user_pool_id` output | prod output |
| `VITE_COGNITO_CLIENT_ID` | dev `cognito_client_id` output | prod output |
| `CLOUDFRONT_DISTRIBUTION_ID` | dev `frontend_distribution_id` output | prod output |
| `VITE_GOOGLE_REVIEW_URL` | your Google review link | your Google review link |

### Secrets

| Secret | dev value | prod value |
|---|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` (test mode) | `pk_live_51SPFZK…` (provided) |

> The Stripe **secret** key and **webhook** secret are NOT GitHub secrets — they live in SSM
> (`/braidsbydeb/{env}/stripe/*`), set out-of-band. Only the *publishable* key is baked into the
> frontend build here.

## What the workflows do

| Workflow | Trigger | Flow |
|---|---|---|
| `deploy-frontend.yml` | push/PR on `apps/web/**` | lint → test → build → deploy dev → (prod on push to main) |
| `deploy-backend.yml` | push/PR on `lambdas/**` | ruff → mypy → pytest → pip-audit/bandit → `apply -target` Lambdas dev → prod |
| `deploy-infra.yml` | manual `workflow_dispatch` | `plan` (artifact) → `apply` (gated by environment protection) |

Infrastructure changes (CloudFront, DynamoDB, Cognito, API GW, etc.) are applied only by
`deploy-infra.yml` or a manual `terraform apply` — the backend workflow deliberately targets only the
two Lambda modules so a code push can't silently mutate infrastructure.
