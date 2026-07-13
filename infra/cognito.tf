resource "aws_cognito_user_pool" "this" {
  name                     = "braidsbydeb-${var.env}-pool"
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OPTIONAL"
  username_attributes      = ["email"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    attribute_data_type = "String"
    mutable             = true
    name                = "role"
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }
}

resource "aws_cognito_user_pool_client" "admin" {
  name                                 = "admin-client"
  user_pool_id                         = aws_cognito_user_pool.this.id
  generate_secret                      = false
  explicit_auth_flows                  = ["ALLOW_USER_SRP_AUTH", "ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  callback_urls                        = var.cognito_callback_urls
  logout_urls                          = var.cognito_logout_urls
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  supported_identity_providers         = ["COGNITO"]
  prevent_user_existence_errors        = "ENABLED"
  access_token_validity                = 60
  id_token_validity                    = 60
  refresh_token_validity               = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_domain" "auth" {
  domain          = "auth.${var.domain_name}"
  certificate_arn = aws_acm_certificate_validation.site.certificate_arn
  user_pool_id    = aws_cognito_user_pool.this.id

  depends_on = [aws_route53_record.frontend]
}

resource "aws_cognito_user_group" "admins" {
  name         = "admins"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Braids by Deb administrators"
}
