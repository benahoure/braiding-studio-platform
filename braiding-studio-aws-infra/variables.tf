variable "project_name" {
  description = "Project prefix used for naming AWS resources."
  type        = string
  default     = "braiding-studio"
}

variable "env_suffix" {
  description = "Deployment environment such as dev or prod."
  type        = string
}

variable "aws_region" {
  description = "AWS region for the application stack."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Public site domain such as example.com or book.example.com."
  type        = string
}

variable "hosted_zone_domain" {
  description = "Route 53 hosted zone domain, usually the apex such as example.com."
  type        = string
}

variable "create_hosted_zone" {
  description = "Whether Terraform/OpenTofu should create the public hosted zone."
  type        = bool
  default     = false
}

variable "notification_email_from" {
  description = "Verified SES sender identity."
  type        = string
}

variable "notification_email_to" {
  description = "Studio inbox for operational notifications."
  type        = string
}

variable "enable_sms_reminders" {
  description = "Whether reminder workflows should attempt SMS delivery."
  type        = bool
  default     = false
}

variable "reminder_schedule_expression" {
  description = "EventBridge schedule expression for reminder processing."
  type        = string
  default     = "rate(1 hour)"
}
