  # This function intentionally runs outside a VPC because the current workload does not
  # depend on private network resources.

module "lambda_client_contact" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "8.0.0"
  function_name = "${local.prefix}-client-contact"
  description   = "Client contact API handler for braiding studio platform"
  handler       = "lambda_client_contact.handler"
  runtime       = "python3.12"
  timeout       = 15
  memory_size   = 256
  source_path   = "${path.module}/src"
  hash_extra    = "client-contact"

  create_role = true
  role_name   = "${local.prefix}-client-contact-role"

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
