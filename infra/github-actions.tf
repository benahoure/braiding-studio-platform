# GitHub Actions authenticates to AWS via OIDC — no long-lived access keys are
# stored. GitHub issues a signed JWT; AWS IAM validates it against the OIDC
# provider and this role's trust policy, then hands back temporary credentials.

variable "create_oidc_provider" {
  description = "Create the GitHub Actions OIDC provider in this env stack. Normally false: the provider is account-level and owned by infra/bootstrap, so destroying an env stack can't break the other env's CI/CD trust."
  type        = bool
  default     = false
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  count           = var.create_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_openid_connect_provider" "github_actions" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? (
    aws_iam_openid_connect_provider.github_actions[0].arn
    ) : (
    data.aws_iam_openid_connect_provider.github_actions[0].arn
  )
}

resource "aws_iam_role" "github_actions" {
  name        = "braidsbydeb-${var.env}-github-actions"
  description = "Assumed by GitHub Actions for ${var.env} deployments"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = local.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:benahoure/braiding-studio-platform:*"
        }
      }
    }]
  })
}

# Terraform manages KMS, IAM, Cognito, CloudFront, DynamoDB, Lambda, S3, WAF —
# AdministratorAccess is the practical choice for a Terraform deployment role.
resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "github_actions_role_arn" {
  description = "Paste this into the GitHub environment variable AWS_ROLE_TO_ASSUME"
  value       = aws_iam_role.github_actions.arn
}
