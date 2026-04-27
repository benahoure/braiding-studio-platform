resource "aws_ses_email_identity" "notifications" {
  email = var.notification_email_from
}
