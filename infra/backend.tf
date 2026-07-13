terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 6.45.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}

# CloudFront ACM certificates and WAF (scope = CLOUDFRONT) must live in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
