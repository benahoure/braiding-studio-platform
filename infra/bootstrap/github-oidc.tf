# GitHub Actions OIDC identity provider — exactly one exists per AWS account,
# and both the dev and prod deploy roles trust it. It lives here in bootstrap
# (account-level, like the state backend) rather than in an env stack, so that
# destroying dev or prod can never break the other environment's CI/CD trust.
resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

output "github_oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.github_actions.arn
}
