# Braids by Deb — Web App

Next.js 14 static site for the Braids by Deb booking platform.

## Tech stack

- **Next.js 14** (App Router, static export)
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (icons)

## Prerequisites

- Node.js 18+
- npm

---

## Running the site locally

```bash
# Install dependencies (first time only, or after pulling new changes)
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page hot-reloads automatically as you save files — no restart needed.

---

## Project structure

```
braiding-studio-webapp/
  app/                    # Next.js App Router — pages and root layout
  components/
    sections/             # Page sections (Hero, Services, Gallery, About, Contact…)
    ui/                   # Reusable UI primitives (buttons, cards, modals…)
  lib/
    data.ts               # All site content — services, prices, testimonials, contact info
  public/
    images/               # Images served by the site (referenced as /images/filename)
  _image-assets/          # Raw/unprocessed working images — NOT deployed, NOT committed
```

---

## Making changes

### Updating text content

Almost all copy (service names, prices, descriptions, testimonials, phone number) is centralized in [`lib/data.ts`](lib/data.ts). Edit it there and every component that uses it updates automatically.

### Adding or replacing images

1. Drop the new image into `public/images/`.
2. Reference it in `lib/data.ts` or a component as `/images/your-file.jpg`.

Keep raw, unprocessed, or staging images in `_image-assets/` — that folder is excluded from both deploys and git.

### Editing a page section

Each section of the homepage is its own component under `components/sections/`. Find the relevant file (e.g. `HeroSection.tsx`, `ServicesSection.tsx`) and edit it directly.

---

## Deploying to production

From the **project root** (one level above this folder):

```bash
./deploy.sh
```

This single command:

1. Builds the Next.js static export (`out/` folder)
2. Syncs `out/` to the S3 bucket, excluding macOS metadata and internal image directories
3. Invalidates the CloudFront cache so visitors see the new version within ~30 seconds

> **Requirement:** AWS CLI must be configured with credentials that have access to the S3 bucket and CloudFront distribution.

### When NOT to run `deploy.sh`

`deploy.sh` only deploys the website code. If you changed AWS infrastructure (a Lambda, a new DynamoDB table, DNS, etc.), run Terraform first from `braiding-studio-aws-infra/`:

```bash
cd ../braiding-studio-aws-infra
terraform apply -var-file=env/prod.tfvars
```

Then run `./deploy.sh` if the site also needs updating.

---

## Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server at http://localhost:3000 |
| `npm run build` | Build static export into `out/` (no deploy) |
| `npm run lint` | Run ESLint |
