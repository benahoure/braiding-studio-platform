#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# deploy.sh — Build and deploy braiding-studio-webapp to S3 + CloudFront
# Usage: ./deploy.sh
# ---------------------------------------------------------------------------

WEBAPP_DIR="$(cd "$(dirname "$0")/braiding-studio-webapp" && pwd)"
INFRA_DIR="$(cd "$(dirname "$0")/braiding-studio-aws-infra" && pwd)"
TFVARS="$INFRA_DIR/env/prod.tfvars"

# Resolve outputs from Terraform state
echo "→ Reading Terraform outputs..."
BUCKET=$(cd "$INFRA_DIR" && terraform output -raw site_bucket_name)
DISTRIBUTION_ID=$(cd "$INFRA_DIR" && terraform output -raw cloudfront_distribution_id)

echo "  Bucket:          $BUCKET"
echo "  Distribution ID: $DISTRIBUTION_ID"

# Build the Next.js static export
echo "→ Building Next.js static export..."
cd "$WEBAPP_DIR"
npm run build

# Sync to S3, excluding macOS junk and internal image working directories
echo "→ Syncing out/ → s3://$BUCKET ..."
aws s3 sync "$WEBAPP_DIR/out/" "s3://$BUCKET" \
  --delete \
  --exclude "*.DS_Store" \
  --exclude "*/.DS_Store" \
  --exclude "images/originals/*" \
  --exclude "images/_processed_for_review/*" \
  --exclude "images/_test/*"

# Invalidate CloudFront cache
echo "→ Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text

echo "✓ Deploy complete — https://braidsbydeb.com"
