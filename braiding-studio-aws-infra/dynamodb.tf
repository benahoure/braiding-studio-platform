resource "aws_dynamodb_table" "appointments" {
  name         = "${local.prefix}-appointments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "appointmentId"

  attribute {
    name = "appointmentId"
    type = "S"
  }

  attribute {
    name = "clientEmail"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "appointmentDate"
    type = "S"
  }

  attribute {
    name = "appointmentTime"
    type = "S"
  }

  global_secondary_index {
    name            = "byClientEmail"
    hash_key        = "clientEmail"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "byAppointmentDate"
    hash_key        = "appointmentDate"
    range_key       = "appointmentTime"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "clients" {
  name         = "${local.prefix}-clients"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "clientId"

  attribute {
    name = "clientId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "phoneNumber"
    type = "S"
  }

  global_secondary_index {
    name            = "byEmail"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "byPhoneNumber"
    hash_key        = "phoneNumber"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "contact_messages" {
  name         = "${local.prefix}-contact-messages"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "messageId"

  attribute {
    name = "messageId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "reviews" {
  name         = "${local.prefix}-reviews"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "reviewId"

  attribute {
    name = "reviewId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "byStatus"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "payments" {
  name         = "${local.prefix}-payments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "paymentId"

  attribute {
    name = "paymentId"
    type = "S"
  }

  attribute {
    name = "appointmentId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "byAppointmentId"
    hash_key        = "appointmentId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}
