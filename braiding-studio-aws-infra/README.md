# braiding-studio-aws-infra

Terraform/OpenTofu infrastructure module for the `braiding-studio-platform` AWS stack, using Python Lambda handlers and an HCL workflow that matches common platform engineering practice.

## What this module provisions

This module scaffolds the first production-oriented AWS foundation for the platform:

- `Route 53` DNS records for the site domain
- `ACM` certificate for the public website
- `S3` bucket for static web app assets
- `CloudFront` distribution for HTTPS delivery and caching
- `API Gateway` HTTP API for bookings, contacts, and reviews
- `Lambda` functions for backend workflows
- `DynamoDB` tables for appointments, contact messages, reviews, and payments
- `SES` email identity for booking and admin emails
- `EventBridge` scheduled rule for reminder processing

## Module structure

```text
braiding-studio-aws-infra/
  locals.tf
  route53.tf
  acm.tf
  s3.tf
  cloudfront.tf
  dynamodb.tf
  ses.tf
  lambda-client-booking.tf
  lambda-client-contact.tf
  lambda-clients-reviews.tf
  lambda-client-reminders.tf
  apigateway.tf
  eventbridge.tf
  variables.tf
  outputs.tf
  versions.tf
  terraform.tfvars.example
  env/
    dev.tfvars
    prod.tfvars
  src/
    common.py
    lambda_client_booking.py
    lambda_client_contact.py
    lambda_clients_reviews.py
    lambda_client_reminders.py
```

## Tooling

This module is written in standard HCL and works with either:

- `terraform`
- `tofu` (OpenTofu)

The examples below use `terraform`, but you can replace that command with `tofu` if you prefer.

## Configuration

Important variables:

- `project_name`: project prefix for AWS resource names
- `stage`: deployment stage such as `dev` or `prod`
- `aws_region`: AWS region for the stack, defaults to `us-east-1`
- `domain_name`: public site domain such as `example.com` or `book.example.com`
- `hosted_zone_domain`: hosted zone domain, usually the apex such as `example.com`
- `create_hosted_zone`: set to `true` only if this module should create the public hosted zone
- `notification_email_from`: SES sender identity to verify
- `notification_email_to`: inbox for operational booking emails
- `enable_sms_reminders`: toggles reminder workflow intent for SMS support
- `reminder_schedule_expression`: EventBridge schedule expression, defaults to `rate(1 hour)`

## Deploy flow

```bash
cd braiding-studio-aws-infra
terraform init
terraform plan -var-file=env/dev.tfvars
terraform apply -var-file=env/dev.tfvars
```

With OpenTofu:

```bash
cd braiding-studio-aws-infra
tofu init
tofu plan -var-file=env/dev.tfvars
tofu apply -var-file=env/dev.tfvars
```

## Current status

This module now has real Lambda handler implementations for the core product flows, with the frontend integration still pending.

What is already modeled:

- hosting resources
- API entrypoints
- table layout
- SES identity wiring
- reminder schedule
- client booking workflow with DynamoDB persistence and email notifications
- contact submission persistence and email notifications
- review submission and moderation endpoints
- reminder sweep for upcoming confirmed appointments

What still needs implementation:

- web app integration with the deployed API
- admin authentication and authorization
- payment/deposit webhook flow
- CI/CD deployment for the static web app bundle into the S3 origin
- full AWS End User Messaging setup for SMS delivery

## Notes

- The stack defaults to `us-east-1`, which keeps CloudFront certificate handling straightforward.
- The placeholder `index.html` object exists only so CloudFront has valid content before CI/CD is wired up.
- If you use a subdomain like `book.example.com`, set `domain_name=book.example.com` and `hosted_zone_domain=example.com`.
- SES sender verification still has to be completed in AWS before application emails will work.
- SMS delivery is optional and currently expects extra runtime env vars such as `SMS_APPLICATION_ID` and optionally `SMS_ORIGINATION_NUMBER`.
