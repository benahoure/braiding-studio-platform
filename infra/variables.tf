variable "aws_region" {
  description = "AWS region for regional resources."
  type        = string
  default     = "us-east-1"
}

variable "env" {
  description = "Deployment environment. Must be dev or prod."
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.env)
    error_message = "env must be dev or prod."
  }
}

variable "domain_name" {
  description = "Fully qualified site domain for this environment."
  type        = string
}

variable "hosted_zone_name" {
  description = "Existing Route 53 hosted zone name to use for DNS records."
  type        = string
}

variable "lambda_memory_public" {
  description = "Memory size in MB for the public API Lambda."
  type        = number
}

variable "lambda_memory_admin" {
  description = "Memory size in MB for the admin API Lambda."
  type        = number
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds. Keep below API Gateway's 30 second limit."
  type        = number
  default     = 29
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days."
  type        = number
  default     = 30
}

variable "enable_waf" {
  description = "Whether to create the WAF Web ACL. Enabled in prod only — dev skips WAF to reduce cost."
  type        = bool
  default     = false
}

variable "waf_rate_limit" {
  description = "WAF rate limit per five-minute window per IP. Only used when enable_waf = true."
  type        = number
  default     = 1000
}

variable "waf_common_override_count" {
  description = "Whether the WAF Common Rule Set should run in count mode instead of block mode. Only used when enable_waf = true."
  type        = bool
  default     = false
}

variable "log_level" {
  description = "Lambda application log level."
  type        = string
}

variable "cognito_callback_urls" {
  description = "Allowed Cognito OAuth callback URLs."
  type        = list(string)
}

variable "cognito_logout_urls" {
  description = "Allowed Cognito logout URLs."
  type        = list(string)
}

variable "ses_sender_email" {
  description = "Verified SES sender email address used for transactional email."
  type        = string
}

variable "admin_alert_email" {
  description = "Inbox(es) that receive appointment and contact notifications — comma-separated for multiple recipients."
  type        = string
}

variable "allowed_origin" {
  description = "Allowed browser origin for CORS."
  type        = string
}

variable "additional_allowed_origins" {
  description = "Optional additional CORS origins for non-production environments, such as local frontend development."
  type        = list(string)
  default     = []

  validation {
    condition     = var.env != "prod" || length(var.additional_allowed_origins) == 0
    error_message = "additional_allowed_origins must be empty in prod."
  }
}

variable "api_default_throttle_rate_limit" {
  description = "Default API Gateway steady-state requests per second per route."
  type        = number
  default     = 50
}

variable "api_default_throttle_burst_limit" {
  description = "Default API Gateway burst requests per route."
  type        = number
  default     = 100
}

variable "api_submission_throttle_rate_limit" {
  description = "Tighter API Gateway steady-state requests per second for public write submission routes."
  type        = number
  default     = 2
}

variable "api_submission_throttle_burst_limit" {
  description = "Tighter API Gateway burst requests for public write submission routes."
  type        = number
  default     = 10
}

variable "public_api_reserved_concurrent_executions" {
  description = "Reserved concurrency for the public API Lambda. Use -1 to leave concurrency unreserved."
  type        = number
  default     = -1
}

variable "admin_api_reserved_concurrent_executions" {
  description = "Reserved concurrency for the admin API Lambda. Use -1 to leave concurrency unreserved."
  type        = number
  default     = -1
}

variable "alarm_actions" {
  description = "Optional CloudWatch alarm action ARNs, such as SNS topics. Empty keeps alarms visible without notifications."
  type        = list(string)
  default     = []
}

variable "lambda_error_alarm_threshold" {
  description = "Lambda errors within one minute that should alarm."
  type        = number
  default     = 1
}

variable "lambda_throttle_alarm_threshold" {
  description = "Lambda throttles within one minute that should alarm."
  type        = number
  default     = 1
}

variable "api_4xx_alarm_threshold" {
  description = "API Gateway 4xx responses within five minutes that should alarm."
  type        = number
  default     = 25
}

variable "api_5xx_alarm_threshold" {
  description = "API Gateway 5xx responses within one minute that should alarm."
  type        = number
  default     = 1
}

variable "dynamodb_throttle_alarm_threshold" {
  description = "DynamoDB throttle events within one minute that should alarm."
  type        = number
  default     = 1
}
