resource "aws_cloudwatch_event_rule" "reminders" {
  name_prefix         = "${local.prefix}-reminders-"
  schedule_expression = var.reminder_schedule_expression
}

resource "aws_cloudwatch_event_target" "reminders" {
  rule      = aws_cloudwatch_event_rule.reminders.name
  target_id = "lambda-reminders"
  arn       = module.lambda_client_reminders.lambda_function_arn
}
