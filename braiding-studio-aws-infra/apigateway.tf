resource "aws_apigatewayv2_api" "platform" {
  name          = "${local.prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["content-type", "authorization"]
    allow_methods = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    allow_origins = local.include_www ? ["https://${var.domain_name}", "https://www.${var.domain_name}"] : ["https://${var.domain_name}"]
  }
}

resource "aws_apigatewayv2_integration" "booking" {
  api_id                 = aws_apigatewayv2_api.platform.id
  integration_type       = "AWS_PROXY"
  integration_uri        = module.lambda_client_booking.lambda_function_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "contact" {
  api_id                 = aws_apigatewayv2_api.platform.id
  integration_type       = "AWS_PROXY"
  integration_uri        = module.lambda_client_contact.lambda_function_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "reviews" {
  api_id                 = aws_apigatewayv2_api.platform.id
  integration_type       = "AWS_PROXY"
  integration_uri        = module.lambda_clients_reviews.lambda_function_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "appointments" {
  api_id    = aws_apigatewayv2_api.platform.id
  route_key = "GET /appointments"
  target    = "integrations/${aws_apigatewayv2_integration.booking.id}"
}

resource "aws_apigatewayv2_route" "appointments_create" {
  api_id    = aws_apigatewayv2_api.platform.id
  route_key = "POST /appointments"
  target    = "integrations/${aws_apigatewayv2_integration.booking.id}"
}

resource "aws_apigatewayv2_route" "appointment_by_id_get" {
  api_id    = aws_apigatewayv2_api.platform.id
  route_key = "GET /appointments/{appointmentId}"
  target    = "integrations/${aws_apigatewayv2_integration.booking.id}"
}

resource "aws_apigatewayv2_route" "appointment_by_id_patch" {
  api_id    = aws_apigatewayv2_api.platform.id
  route_key = "PATCH /appointments/{appointmentId}"
  target    = "integrations/${aws_apigatewayv2_integration.booking.id}"
}

resource "aws_apigatewayv2_route" "appointment_by_id_delete" {
  api_id    = aws_apigatewayv2_api.platform.id
  route_key = "DELETE /appointments/{appointmentId}"
  target    = "integrations/${aws_apigatewayv2_integration.booking.id}"
}

resource "aws_apigatewayv2_route" "contacts" {
  api_id    = aws_apigatewayv2_api.platform.id
  route_key = "POST /contacts"
  target    = "integrations/${aws_apigatewayv2_integration.contact.id}"
}

resource "aws_apigatewayv2_route" "reviews_get" {
  api_id    = aws_apigatewayv2_api.platform.id
  route_key = "GET /reviews"
  target    = "integrations/${aws_apigatewayv2_integration.reviews.id}"
}

resource "aws_apigatewayv2_route" "reviews_post" {
  api_id    = aws_apigatewayv2_api.platform.id
  route_key = "POST /reviews"
  target    = "integrations/${aws_apigatewayv2_integration.reviews.id}"
}

resource "aws_apigatewayv2_route" "review_by_id_patch" {
  api_id    = aws_apigatewayv2_api.platform.id
  route_key = "PATCH /reviews/{reviewId}"
  target    = "integrations/${aws_apigatewayv2_integration.reviews.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.platform.id
  name        = "$default"
  auto_deploy = true
}
