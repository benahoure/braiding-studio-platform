resource "aws_ses_domain_identity" "this" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "this" {
  domain = aws_ses_domain_identity.this.domain
}

resource "aws_route53_record" "ses_dkim" {
  count           = 3
  zone_id         = data.aws_route53_zone.this.zone_id
  name            = "${aws_ses_domain_dkim.this.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type            = "CNAME"
  ttl             = 600
  records         = ["${aws_ses_domain_dkim.this.dkim_tokens[count.index]}.dkim.amazonses.com"]
  allow_overwrite = true
}

resource "aws_ses_domain_mail_from" "this" {
  domain           = aws_ses_domain_identity.this.domain
  mail_from_domain = "mail.${var.domain_name}"
}

resource "aws_route53_record" "spf" {
  zone_id         = data.aws_route53_zone.this.zone_id
  name            = var.domain_name
  type            = "TXT"
  ttl             = 600
  records         = ["v=spf1 include:amazonses.com ~all"]
  allow_overwrite = true
}

resource "aws_route53_record" "dmarc" {
  zone_id         = data.aws_route53_zone.this.zone_id
  name            = "_dmarc.${var.domain_name}"
  type            = "TXT"
  ttl             = 600
  records         = ["v=DMARC1; p=quarantine; rua=mailto:${var.ses_sender_email}"]
  allow_overwrite = true
}
