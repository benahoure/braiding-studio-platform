.PHONY: bootstrap init-dev init-prod plan-dev plan-prod apply-dev apply-prod destroy-dev fmt validate

bootstrap:
	cd bootstrap && terraform init && terraform apply

init-dev:
	terraform init -backend-config=backend/dev.tfbackend -reconfigure

init-prod:
	terraform init -backend-config=backend/prod.tfbackend -reconfigure

plan-dev:
	terraform plan -var-file=env/dev.tfvars

plan-prod:
	terraform plan -var-file=env/prod.tfvars

apply-dev:
	terraform apply -var-file=env/dev.tfvars

apply-prod:
	terraform apply -var-file=env/prod.tfvars

destroy-dev:
	terraform destroy -var-file=env/dev.tfvars

fmt:
	terraform fmt -recursive

validate:
	terraform validate
