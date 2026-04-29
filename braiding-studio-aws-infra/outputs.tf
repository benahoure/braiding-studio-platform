output "cloudfront_distribution_domain_name" {
  value       = aws_cloudfront_distribution.site.domain_name
  description = "CloudFront domain name for the static site."
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.site.id
  description = "CloudFront distribution ID for cache invalidations."
}

output "site_bucket_name" {
  value       = aws_s3_bucket.site.bucket
  description = "S3 bucket that stores static web assets."
}

output "api_endpoint" {
  value       = aws_apigatewayv2_api.platform.api_endpoint
  description = "HTTP API endpoint for the web app backend."
}

output "appointments_table_name" {
  value       = aws_dynamodb_table.appointments.name
  description = "Appointments DynamoDB table."
}

output "ses_verification_email" {
  value       = aws_ses_email_identity.notifications.email
  description = "SES sender identity that must be verified before email sending works."
}
