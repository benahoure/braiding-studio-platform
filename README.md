# braiding-studio-platform

`braiding-studio-platform` is a portfolio-friendly platform repository for a braiding studio website, online booking flow, appointment management, admin operations, and future AWS delivery infrastructure. The current implementation includes a dedicated Next.js web app module today, with a separate AWS infrastructure module reserved for the Route 53, CloudFront, ACM, and S3 setup that will follow.

## Overview

This repository is designed to serve as the foundation for a modern braiding studio platform. Today, it includes a polished marketing site, a guided booking experience, appointment history views, and an admin dashboard inside the web app module. Over time, the AWS infrastructure module will house the cloud resources needed to deploy and deliver the site.

## Features

- Branded landing page with hero, services, gallery, testimonials, about, and contact sections
- Service catalog for multiple braid styles, pricing, durations, and categories
- Multi-step booking flow with service selection, date/time selection, client details, and deposit method capture
- Appointment history page for customers to review and manage bookings
- Admin dashboard for filtering, updating, exporting, and deleting appointments
- Responsive navigation and polished salon-focused UI styling

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- `date-fns`
- `react-day-picker`
- `lucide-react`

## Project Structure

The repository now follows a module-based structure so the application and infrastructure can evolve independently while staying in one codebase.

```text
braiding-studio-platform/
  braiding-studio-webapp/
    app/                 Next.js App Router pages
    components/          Shared UI and section components
    lib/                 Service data, business info, and appointment helpers
    public/              Images and static assets
    types/               Shared TypeScript types
    package.json         App scripts and dependencies
  braiding-studio-aws-infra/
    README.md            Planned AWS infrastructure module
```

`braiding-studio-aws-infra/` is reserved for future AWS infrastructure work and does not yet contain implementation code.

## Current Experience

The app currently includes:

- A marketing homepage for Braids by Deb in Dallas, Texas
- A booking experience for braid services such as box braids, knotless braids, cornrows, boho braids, Fulani braids, and kids styles
- A customer-facing appointments page
- An admin view for operational management

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Run locally

```bash
cd braiding-studio-webapp
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Data and Storage

The current booking and appointment workflow uses browser `localStorage` for persistence. This keeps the app lightweight for development and demonstration, but it is not yet backed by a production database or server-side booking API.

## Why This Repo Exists

This repository is meant to be the single home for both product experience and platform evolution: a polished web presence for a braiding studio today, and a deployment-ready cloud-backed platform as AWS infrastructure is added.

## Roadmap

Planned next steps for the platform include:

- Route 53 for DNS management
- CloudFront for CDN delivery
- ACM for SSL/TLS certificate management
- S3 origin/static hosting setup
- Infrastructure-as-code for repeatable deployment and environment management

## Repository Description

`Next.js braiding studio platform with booking, appointments, admin tools, and planned AWS hosting infrastructure.`

## Suggested GitHub Topics

```text
nextjs
react
typescript
tailwindcss
booking-app
appointment-scheduling
beauty-salon
braiding
small-business-website
aws
cloudfront
route53
```
