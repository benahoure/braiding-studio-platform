locals {
  prefix       = "${var.project_name}-${var.env_suffix}"
  include_www  = var.domain_name == var.hosted_zone_domain
  site_domains = local.include_www ? [var.domain_name, "www.${var.domain_name}"] : [var.domain_name]

  record_name = var.domain_name == var.hosted_zone_domain ? var.domain_name : trimsuffix(var.domain_name, ".${var.hosted_zone_domain}")

  lambda_policy_statements = {
    dynamodb = {
      effect = "Allow"
      actions = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
      ]
      resources = [
        aws_dynamodb_table.appointments.arn,
        "${aws_dynamodb_table.appointments.arn}/index/*",
        aws_dynamodb_table.clients.arn,
        "${aws_dynamodb_table.clients.arn}/index/*",
        aws_dynamodb_table.contact_messages.arn,
        aws_dynamodb_table.reviews.arn,
        "${aws_dynamodb_table.reviews.arn}/index/*",
        aws_dynamodb_table.payments.arn,
        "${aws_dynamodb_table.payments.arn}/index/*",
      ]
    }
    ses = {
      effect = "Allow"
      actions = [
        "ses:SendEmail",
        "ses:SendRawEmail",
      ]
      resources = ["*"]
    }
    sms = {
      effect = "Allow"
      actions = [
        "sms-voice:SendTextMessage",
        "mobiletargeting:SendMessages",
      ]
      resources = ["*"]
    }
  }
}
