resource "aws_cloudwatch_log_group" "api_access" {
  name              = "braidsbydeb-${var.env}-api-access"
  kms_key_id        = aws_kms_key.data.arn
  retention_in_days = 365
}

resource "aws_apigatewayv2_api" "this" {
  name          = "braidsbydeb-${var.env}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = local.api_allowed_origins
    allow_methods = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "this" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = true
    throttling_burst_limit   = var.api_default_throttle_burst_limit
    throttling_rate_limit    = var.api_default_throttle_rate_limit
  }

  dynamic "route_settings" {
    for_each = local.public_submission_route_throttles

    content {
      route_key                = route_settings.key
      detailed_metrics_enabled = true
      throttling_burst_limit   = route_settings.value.burst_limit
      throttling_rate_limit    = route_settings.value.rate_limit
    }
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  depends_on = [
    aws_apigatewayv2_route.public,
    aws_apigatewayv2_route.admin,
  ]
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.this.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "braidsbydeb-${var.env}-jwt"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.admin.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.this.id}"
  }
}

resource "aws_apigatewayv2_integration" "public_api" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = module.public_api.lambda_function_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "admin_api" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = module.admin_api.lambda_function_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "public" {
  for_each  = local.public_routes
  api_id    = aws_apigatewayv2_api.this.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.public_api.id}"
}

resource "aws_apigatewayv2_route" "admin" {
  for_each           = local.admin_routes
  api_id             = aws_apigatewayv2_api.this.id
  route_key          = each.key
  target             = "integrations/${aws_apigatewayv2_integration.admin_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}
