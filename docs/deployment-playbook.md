# Deployment Playbook — one page

The operating rules for shipping braidsbydeb.com. Detailed runbooks:
[dev-deployment.md](dev-deployment.md) · [prod-deployment.md](prod-deployment.md) ·
[github-environments.md](github-environments.md).

## The five principles

1. **`main` is the only source of truth.** Everything deploys from `main`; feature
   branches may only ever target dev (via the workflow branch dropdown), never prod.
2. **Dev is the proving ground.** Merging to `main` deploys dev automatically.
   Nothing reaches prod that didn't run on dev first.
3. **Prod is always a deliberate act.** There is no automatic path to prod —
   you dispatch it: Actions → workflow → *Run workflow* → environment `prod`.
4. **Infra is two deliberate acts** — run *Deploy Infra — Plan*, read the plan,
   then run *Deploy Infra — Apply* with that run's ID. Never blind-apply.
5. **Content is not code.** Services, prices, photos, hours, days off, reviews —
   all through `/admin`, live instantly, no deployment involved.

## What changed → what to run

| You changed | After merging to main | Then for prod |
|---|---|---|
| `apps/web/**` | dev frontend deploys itself | dispatch **Deploy Frontend** → `prod` |
| `lambdas/**` | dev backend deploys itself (tests gate it) | dispatch **Deploy Backend** → `prod` |
| Both of the above | both dev jobs run | dispatch **Backend first, then Frontend** |
| `infra/**` | nothing automatic | **Plan** → review → **Apply**, dev first, then repeat for prod |
| Code **and** infra | — | order: **infra → backend → frontend** (resources must exist before code that uses them) |
| Stripe secrets | — | CloudShell: SSM `put-parameter --overwrite` + Lambda description-touch (no deploy) |
| GitHub env vars (Cognito IDs, dist IDs, pk keys) | — | edit in repo Settings → re-run the relevant workflow |

## Verification gates (don't skip)

- **After dev auto-deploy:** click through what you changed on dev.braidsbydeb.com,
  including one `/admin` login if the change touched admin or auth.
- **After prod dispatch:** same click-through on braidsbydeb.com. If payments were
  touched: one real booking + refund from `/admin`.

## Rollback

- **Code:** revert the PR on GitHub → merge (dev redeploys the revert) → dispatch
  the prod workflow(s). Or re-run a previous green workflow run from the Actions
  history if the bad change hasn't compounded.
- **Infra:** re-run Plan/Apply from the last good commit — Terraform state is
  versioned in S3 (180-day history) if things get truly tangled.
- **Content mistakes:** fix in `/admin`; never re-run the seed against prod.

## Habits that keep this safe

- One feature per PR — small merges make dev verification meaningful and reverts clean.
- Ship prod promptly once dev is verified — long dev/prod drift makes the next
  prod deploy a bundle of surprises.
- If a prod dispatch fails mid-run, fix forward through the same pipeline; don't
  hand-patch prod from a laptop (that's how drift is born).
