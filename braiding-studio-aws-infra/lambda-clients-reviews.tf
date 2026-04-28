# Reviews logic stays outside a VPC until the platform adds a real private dependency. This keeps costs down by avoiding NAT and endpoint charges.
module "lambda_clients_reviews" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "8.0.0"
  function_name = "${local.prefix}-clients-reviews"
  description   = "Client reviews API handler for braiding studio platform"
  handler       = "handler.handler"
  runtime       = "python3.12"
  timeout       = 15
  memory_size   = 256
  source_path = [
    "${path.module}/src/clients_reviews",
    {
      path          = "${path.module}/src/shared"
      prefix_in_zip = "shared"
    }
  ]
  hash_extra    = "clients-reviews"
  # Keep trigger permissions on the unqualified function ARN for now.
  # We are not publishing named Lambda versions/aliases yet.
  create_current_version_allowed_triggers = false
  create_unqualified_alias_allowed_triggers = true

  create_role = true
  role_name   = "${local.prefix}-clients-reviews-role"

  environment_variables = {
    APPOINTMENTS_TABLE_NAME     = aws_dynamodb_table.appointments.name
    CLIENTS_TABLE_NAME          = aws_dynamodb_table.clients.name
    CONTACT_MESSAGES_TABLE_NAME = aws_dynamodb_table.contact_messages.name
    REVIEWS_TABLE_NAME          = aws_dynamodb_table.reviews.name
    PAYMENTS_TABLE_NAME         = aws_dynamodb_table.payments.name
    NOTIFICATION_EMAIL_FROM     = var.notification_email_from
    NOTIFICATION_EMAIL_TO       = var.notification_email_to
    ENABLE_SMS_REMINDERS        = tostring(var.enable_sms_reminders)
  }

  attach_policy_statements = true
  policy_statements        = local.lambda_policy_statements

  allowed_triggers = {
    ApiGateway = {
      service    = "apigateway"
      source_arn = "${aws_apigatewayv2_api.platform.execution_arn}/*/*"
    }
  }
}
