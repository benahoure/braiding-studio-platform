data "aws_route53_zone" "this" {
  name         = var.hosted_zone_name
  private_zone = false
}

resource "aws_acm_certificate" "site" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  certificate_validation_records = {
    for option in aws_acm_certificate.site.domain_validation_options :
    "site-${option.domain_name}" => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each        = local.certificate_validation_records
  zone_id         = data.aws_route53_zone.this.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.site.arn
  validation_record_fqdns = [
    for key, record in aws_route53_record.certificate_validation :
    record.fqdn if startswith(key, "site-")
  ]
}

# allow_overwrite lets the new stack take ownership of the apex / www records
# during the cutover from the legacy braiding-studio-* stack that currently owns
# them. For dev (dev.braidsbydeb.com) and the new cdn./auth. subdomains this is
# harmless. See docs/migration-and-bootstrap.md for the teardown ordering.
resource "aws_route53_record" "frontend" {
  zone_id         = data.aws_route53_zone.this.zone_id
  name            = var.domain_name
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id         = data.aws_route53_zone.this.zone_id
  name            = "www.${var.domain_name}"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cdn" {
  zone_id         = data.aws_route53_zone.this.zone_id
  name            = "cdn.${var.domain_name}"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_cloudfront_distribution.assets.domain_name
    zone_id                = aws_cloudfront_distribution.assets.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "auth" {
  zone_id         = data.aws_route53_zone.this.zone_id
  name            = "auth.${var.domain_name}"
  type            = "CNAME"
  ttl             = 300
  allow_overwrite = true
  records         = [aws_cognito_user_pool_domain.auth.cloudfront_distribution]
}
