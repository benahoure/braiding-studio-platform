resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = local.lambda_alarm_functions

  alarm_name          = "braidsbydeb-${var.env}-${each.key}-lambda-errors"
  alarm_description   = "Lambda ${each.value} returned errors."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = var.lambda_error_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    FunctionName = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  for_each = local.lambda_alarm_functions

  alarm_name          = "braidsbydeb-${var.env}-${each.key}-lambda-throttles"
  alarm_description   = "Lambda ${each.value} was throttled."
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = var.lambda_throttle_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    FunctionName = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "api_4xx_spike" {
  alarm_name          = "braidsbydeb-${var.env}-api-4xx-spike"
  alarm_description   = "HTTP API 4xx responses spiked above the expected public traffic baseline."
  namespace           = "AWS/ApiGateway"
  metric_name         = "4xx"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.api_4xx_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    ApiId = aws_apigatewayv2_api.this.id
    Stage = aws_apigatewayv2_stage.this.name
  }
}

resource "aws_cloudwatch_metric_alarm" "api_5xx_spike" {
  alarm_name          = "braidsbydeb-${var.env}-api-5xx-spike"
  alarm_description   = "HTTP API 5xx responses indicate backend/API failures."
  namespace           = "AWS/ApiGateway"
  metric_name         = "5xx"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = var.api_5xx_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    ApiId = aws_apigatewayv2_api.this.id
    Stage = aws_apigatewayv2_stage.this.name
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttles" {
  for_each = local.dynamodb_alarm_table_names

  alarm_name          = "braidsbydeb-${var.env}-${each.key}-ddb-read-throttles"
  alarm_description   = "DynamoDB table ${each.value} had read throttle events."
  namespace           = "AWS/DynamoDB"
  metric_name         = "ReadThrottleEvents"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = var.dynamodb_throttle_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    TableName = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttles" {
  for_each = local.dynamodb_alarm_table_names

  alarm_name          = "braidsbydeb-${var.env}-${each.key}-ddb-write-throttles"
  alarm_description   = "DynamoDB table ${each.value} had write throttle events."
  namespace           = "AWS/DynamoDB"
  metric_name         = "WriteThrottleEvents"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = var.dynamodb_throttle_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    TableName = each.value
  }
}
