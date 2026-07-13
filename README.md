# braiding-studio-platform

Full-stack platform for **Braids by Deb** (braidsbydeb.com) — a braiding salon in
Dallas, TX. Public site with online booking and Stripe deposits, a Cognito-protected
admin dashboard, serverless Python APIs, and Terraform-managed AWS infrastructure
with GitHub Actions CI/CD.

## Repository layout

```text
braiding-studio-platform/
  apps/web/          React 18 + Vite + TypeScript + Tailwind SPA (public site, booking wizard, /admin)
  lambdas/           Python 3.14 (arm64) Lambdas — public-api + admin-api from one codebase
  infra/             Terraform: CloudFront, S3, HTTP API Gateway, DynamoDB, Cognito, SES, SSM, WAF
    bootstrap/       Account-level one-timers: state backend + GitHub OIDC provider
    env/             dev.tfvars / prod.tfvars
  .github/workflows/ deploy-frontend, deploy-backend, deploy-infra (OIDC auth, no stored keys)
  docs/              Runbooks — start here
```

## Environments

| Env | URL | Notes |
|---|---|---|
| dev | https://dev.braidsbydeb.com | Stripe test mode, WAF off, DEBUG logs |
| prod | https://braidsbydeb.com | Stripe live mode, WAF on, deletion protection |

Each env is a fully separate stack (`braidsbydeb-{env}-*`) with its own state key.

## Key features

- 5-step booking wizard with real availability, a $20 Stripe deposit, confirmation
  emails (SES), and a self-service reschedule/cancel portal
- Admin dashboard: appointments (refund/reschedule/override), services & pricing,
  portfolio photo uploads, reviews moderation, contact inbox, business hours
- Honest-by-design content: reviews are text-first, no stock photography

## Getting started

- **Local dev:** `cd apps/web && npm install && npm run dev` (mock payment mode when
  `VITE_STRIPE_PUBLISHABLE_KEY` is empty). Backend tests: `cd lambdas && pytest`.
- **Deploy dev:** [docs/dev-deployment.md](docs/dev-deployment.md)
- **Deploy prod (go-live):** [docs/prod-deployment.md](docs/prod-deployment.md)
- **State/bootstrap background:** [docs/migration-and-bootstrap.md](docs/migration-and-bootstrap.md)
- **CI/CD setup:** [docs/github-environments.md](docs/github-environments.md)

> The previous implementation (Next.js prototype + `braiding-studio-*` AWS stack)
> was retired on 2026-07-12; its infrastructure was destroyed and the modules were
> removed from this repo.
