output "frontend_distribution_domain" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "assets_distribution_domain" {
  value = aws_cloudfront_distribution.assets.domain_name
}

output "assets_distribution_id" {
  value = aws_cloudfront_distribution.assets.id
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.this.api_endpoint
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.admin.id
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "assets_bucket_name" {
  value = aws_s3_bucket.assets.bucket
}
