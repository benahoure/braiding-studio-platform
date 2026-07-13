resource "aws_dynamodb_table" "services" {
  name                        = "braidsbydeb-${var.env}-services"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "serviceId"
  deletion_protection_enabled = var.env == "prod"

  attribute {
    name = "serviceId"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.data.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "appointments" {
  name                        = "braidsbydeb-${var.env}-appointments"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "appointmentId"
  deletion_protection_enabled = var.env == "prod"

  attribute {
    name = "appointmentId"
    type = "S"
  }

  attribute {
    name = "clientEmail"
    type = "S"
  }

  attribute {
    name = "preferredDate"
    type = "S"
  }

  attribute {
    name = "statusKey"
    type = "S"
  }

  attribute {
    name = "appointmentToken"
    type = "S"
  }

  global_secondary_index {
    name            = "clientEmail-date-index"
    hash_key        = "clientEmail"
    range_key       = "preferredDate"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-date-index"
    hash_key        = "statusKey"
    range_key       = "preferredDate"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "token-index"
    hash_key        = "appointmentToken"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.data.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "portfolio" {
  name                        = "braidsbydeb-${var.env}-portfolio"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "styleId"
  deletion_protection_enabled = var.env == "prod"

  attribute {
    name = "styleId"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "displayOrder"
    type = "N"
  }

  global_secondary_index {
    name            = "category-order-index"
    hash_key        = "category"
    range_key       = "displayOrder"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.data.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "reviews" {
  name                        = "braidsbydeb-${var.env}-reviews"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "reviewId"
  deletion_protection_enabled = var.env == "prod"

  attribute {
    name = "reviewId"
    type = "S"
  }

  attribute {
    name = "approvedKey"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "approved-date-index"
    hash_key        = "approvedKey"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.data.arn
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "contact_messages" {
  name                        = "braidsbydeb-${var.env}-contact-messages"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "messageId"
  deletion_protection_enabled = var.env == "prod"

  attribute {
    name = "messageId"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.data.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "business_settings" {
  name                        = "braidsbydeb-${var.env}-business-settings"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "settingId"
  range_key                   = "version"
  deletion_protection_enabled = var.env == "prod"

  attribute {
    name = "settingId"
    type = "S"
  }

  attribute {
    name = "version"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.data.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "admin_audit_log" {
  name                        = "braidsbydeb-${var.env}-admin-audit-log"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "logId"
  deletion_protection_enabled = var.env == "prod"

  attribute {
    name = "logId"
    type = "S"
  }

  attribute {
    name = "adminId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "adminId-date-index"
    hash_key        = "adminId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.data.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "idempotency" {
  name                        = "braidsbydeb-${var.env}-idempotency"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "id"
  deletion_protection_enabled = var.env == "prod"

  attribute {
    name = "id"
    type = "S"
  }

  ttl {
    attribute_name = "expiration"
    enabled        = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.data.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}
