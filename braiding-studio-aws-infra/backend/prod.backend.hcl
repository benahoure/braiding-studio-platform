bucket         = "braiding-studio-terraform-state"
key            = "platform/prod/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "braiding-studio-terraform-locks"
