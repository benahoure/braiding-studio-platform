#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# deploy.sh — Build and deploy braiding-studio-webapp to S3 + CloudFront
# Usage: ./deploy.sh
# ---------------------------------------------------------------------------

WEBAPP_DIR="$(cd "$(dirname "$0")/braiding-studio-webapp" && pwd)"
INFRA_DIR="$(cd "$(dirname "$0")/braiding-studio-aws-infra" && pwd)"
BACKEND_CONFIG="$INFRA_DIR/backend/prod.backend.hcl"

# Ensure Terraform is pointed at the prod remote backend before reading outputs
echo "→ Initializing Terraform backend..."
cd "$INFRA_DIR"
terraform init -backend-config="$BACKEND_CONFIG" -reconfigure >/dev/null

read_output() {
  local output_name="$1"
  local value

  value="$(terraform output -raw "$output_name" 2>/dev/null || true)"
  if [[ -z "$value" || "$value" == *"Warning: No outputs found"* || "$value" == *"╷"* ]]; then
    echo "Error: Terraform state for this backend has no usable output named '$output_name'." >&2
    echo "Run 'terraform output' in $INFRA_DIR and confirm you are pointing at the correct backend/state before deploying." >&2
    exit 1
  fi

  printf '%s' "$value"
}

# Resolve outputs from Terraform state
echo "→ Reading Terraform outputs..."
API_BASE_URL="$(read_output api_endpoint)"
BUCKET="$(read_output site_bucket_name)"
DISTRIBUTION_ID="$(read_output cloudfront_distribution_id)"

echo "  API Base URL:    $API_BASE_URL"
echo "  Bucket:          $BUCKET"
echo "  Distribution ID: $DISTRIBUTION_ID"

# Build the Next.js static export
echo "→ Building Next.js static export..."
cd "$WEBAPP_DIR"
NEXT_PUBLIC_API_BASE_URL="$API_BASE_URL" npm run build

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
