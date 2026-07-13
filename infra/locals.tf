locals {
  public_api_zip = "${path.module}/../lambdas/dist/public-api.zip"
  admin_api_zip  = "${path.module}/../lambdas/dist/admin-api.zip"

  public_lambda_name = "braidsbydeb-${var.env}-public-api"
  admin_lambda_name  = "braidsbydeb-${var.env}-admin-api"

  api_allowed_origins = distinct(concat([var.allowed_origin], var.additional_allowed_origins))

  public_submission_route_throttles = {
    "POST /appointments/payment-intent" = {
      rate_limit  = var.api_submission_throttle_rate_limit
      burst_limit = var.api_submission_throttle_burst_limit
    }
    "POST /contact" = {
      rate_limit  = var.api_submission_throttle_rate_limit
      burst_limit = var.api_submission_throttle_burst_limit
    }
    "POST /reviews" = {
      rate_limit  = var.api_submission_throttle_rate_limit
      burst_limit = var.api_submission_throttle_burst_limit
    }
    "POST /webhooks/stripe" = {
      rate_limit  = 100
      burst_limit = 50
    }
  }

  dynamodb_table_arns = [
    aws_dynamodb_table.services.arn,
    aws_dynamodb_table.appointments.arn,
    aws_dynamodb_table.portfolio.arn,
    aws_dynamodb_table.reviews.arn,
    aws_dynamodb_table.contact_messages.arn,
    aws_dynamodb_table.business_settings.arn,
    aws_dynamodb_table.admin_audit_log.arn,
    aws_dynamodb_table.idempotency.arn,
  ]

  dynamodb_index_arns = [
    "${aws_dynamodb_table.services.arn}/index/*",
    "${aws_dynamodb_table.appointments.arn}/index/*",
    "${aws_dynamodb_table.portfolio.arn}/index/*",
    "${aws_dynamodb_table.reviews.arn}/index/*",
    "${aws_dynamodb_table.contact_messages.arn}/index/*",
    "${aws_dynamodb_table.business_settings.arn}/index/*",
    "${aws_dynamodb_table.admin_audit_log.arn}/index/*",
    "${aws_dynamodb_table.idempotency.arn}/index/*",
  ]

  public_read_table_arns = [
    aws_dynamodb_table.services.arn,
    "${aws_dynamodb_table.services.arn}/index/*",
    aws_dynamodb_table.portfolio.arn,
    "${aws_dynamodb_table.portfolio.arn}/index/*",
    aws_dynamodb_table.reviews.arn,
    "${aws_dynamodb_table.reviews.arn}/index/*",
    aws_dynamodb_table.business_settings.arn,
  ]

  lambda_alarm_functions = {
    public_api = module.public_api.lambda_function_name
    admin_api  = module.admin_api.lambda_function_name
  }

  dynamodb_alarm_table_names = {
    services          = aws_dynamodb_table.services.name
    appointments      = aws_dynamodb_table.appointments.name
    portfolio         = aws_dynamodb_table.portfolio.name
    reviews           = aws_dynamodb_table.reviews.name
    contact_messages  = aws_dynamodb_table.contact_messages.name
    business_settings = aws_dynamodb_table.business_settings.name
    admin_audit_log   = aws_dynamodb_table.admin_audit_log.name
    idempotency       = aws_dynamodb_table.idempotency.name
  }

  public_routes = toset([
    "GET /services",
    "GET /services/{serviceId}",
    "GET /portfolio",
    "GET /reviews",
    "GET /business-settings",
    "GET /availability",
    # Booking flow
    "POST /appointments/payment-intent",
    "POST /appointments/{appointmentId}/confirm",
    # Client portal
    "GET /appointments/portal/{token}",
    "POST /appointments/portal/{token}/reschedule",
    "POST /appointments/portal/{token}/cancel",
    # Stripe webhook
    "POST /webhooks/stripe",
    # Other public forms
    "POST /contact",
    "POST /reviews",
  ])

  admin_routes = toset([
    "POST /admin/upload-url",
    "GET /admin/services",
    "POST /admin/services",
    "PATCH /admin/services/{serviceId}",
    "DELETE /admin/services/{serviceId}",
    "GET /admin/portfolio",
    "POST /admin/portfolio",
    "PATCH /admin/portfolio/{styleId}",
    "DELETE /admin/portfolio/{styleId}",
    "GET /admin/reviews",
    "POST /admin/reviews",
    "PATCH /admin/reviews/{reviewId}",
    "DELETE /admin/reviews/{reviewId}",
    "GET /admin/appointments",
    "PATCH /admin/appointments/{appointmentId}",
    "POST /admin/appointments/{appointmentId}/cancel-refund",
    "POST /admin/appointments/{appointmentId}/reschedule",
    "POST /admin/appointments/{appointmentId}/refund",
    "POST /admin/appointments/{appointmentId}/forfeit",
    "POST /admin/appointments/{appointmentId}/override",
    "GET /admin/contact-messages",
    "PATCH /admin/contact-messages/{messageId}",
    "POST /admin/contact-messages/{messageId}/reply",
    "GET /admin/business-settings",
    "PATCH /admin/business-settings",
    "GET /admin/audit-log",
  ])
}
