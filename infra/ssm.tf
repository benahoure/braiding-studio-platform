# ---------------------------------------------------------------------------
# Secrets live in SSM Parameter Store as SecureString parameters encrypted with
# the data KMS key. Terraform seeds them with "REPLACE_ME" and ignores value
# drift, so real secret values are set out-of-band and never stored in state:
#
#   aws ssm put-parameter --name /braidsbydeb/prod/stripe/secret_key \
#     --type SecureString --value sk_live_xxx --overwrite
#
# Email uses SES directly (domain identity in ses.tf), so no SMTP secrets here.
# ---------------------------------------------------------------------------

resource "aws_ssm_parameter" "stripe_secret_key" {
  name        = "/braidsbydeb/${var.env}/stripe/secret_key"
  type        = "SecureString"
  value       = "REPLACE_ME"
  description = "Stripe secret key for Braids by Deb ${var.env}"
  key_id      = aws_kms_key.data.arn

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Environment = var.env
    ManagedBy   = "terraform"
  }
}

resource "aws_ssm_parameter" "stripe_webhook_secret" {
  name        = "/braidsbydeb/${var.env}/stripe/webhook_secret"
  type        = "SecureString"
  value       = "REPLACE_ME"
  description = "Stripe webhook signing secret for Braids by Deb ${var.env}"
  key_id      = aws_kms_key.data.arn

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Environment = var.env
    ManagedBy   = "terraform"
  }
}
