data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewerExceptHostHeader"
}

# Strips the /api prefix before forwarding to API Gateway
resource "aws_cloudfront_function" "api_rewrite" {
  name    = "braidsbydeb-${var.env}-api-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Strip /api prefix before forwarding to API Gateway"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      if (uri.startsWith('/api/')) {
        request.uri = uri.slice(4);
      } else if (uri === '/api') {
        request.uri = '/';
      }
      return request;
    }
  EOT
}

resource "aws_cloudfront_function" "www_redirect" {
  name    = "braidsbydeb-${var.env}-www-redirect"
  runtime = "cloudfront-js-2.0"
  comment = "301 redirect www to apex domain"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var host = event.request.headers.host.value;
      if (host.startsWith('www.')) {
        var qs = event.request.querystring;
        var pairs = [];
        for (var k in qs) {
          var mv = qs[k].multiValue;
          if (mv) {
            for (var i = 0; i < mv.length; i++) {
              pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(mv[i].value));
            }
          } else {
            pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(qs[k].value));
          }
        }
        var location = 'https://' + host.slice(4) + event.request.uri;
        if (pairs.length) location += '?' + pairs.join('&');
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: { location: { value: location } }
        };
      }
      return event.request;
    }
  EOT
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "braidsbydeb-${var.env}-frontend-oac"
  description                       = "Frontend S3 origin access control"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "assets" {
  name                              = "braidsbydeb-${var.env}-assets-oac"
  description                       = "Assets S3 origin access control"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "frontend_security" {
  name = "braidsbydeb-${var.env}-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    content_type_options {
      override = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      content_security_policy = join("; ", [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' https://js.stripe.com https://*.js.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://cdn.${var.domain_name} https://maps.gstatic.com https://*.stripe.com https://*.link.com",
        "connect-src 'self' https://auth.${var.domain_name} https://cognito-idp.${var.aws_region}.amazonaws.com https://braidsbydeb-${var.env}-assets.s3.amazonaws.com https://braidsbydeb-${var.env}-assets.s3.${var.aws_region}.amazonaws.com https://api.stripe.com https://link.com https://*.link.com",
        "frame-src https://www.google.com https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://link.com https://*.link.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ])
      override = true
    }
  }
}

resource "aws_cloudfront_response_headers_policy" "assets_cors" {
  name = "braidsbydeb-${var.env}-assets-cors"

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["Accept", "Authorization", "Content-Type", "Origin"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD"]
    }

    access_control_allow_origins {
      items = [var.allowed_origin]
    }

    origin_override = true
  }

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  aliases             = [var.domain_name, "www.${var.domain_name}"]
  enabled             = true
  default_root_object = "index.html"
  web_acl_id          = var.enable_waf ? aws_wafv2_web_acl.this[0].arn : null

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontend-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # API Gateway origin — raw execute-api URL, never exposed publicly
  origin {
    domain_name = replace(aws_apigatewayv2_api.this.api_endpoint, "https://", "")
    origin_id   = "api-gateway"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 29
      origin_keepalive_timeout = 5
    }
  }

  # /api/* → API Gateway (evaluated before the default S3 behavior)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-gateway"
    compress         = true

    viewer_protocol_policy   = "redirect-to-https"
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.api_rewrite.arn
    }
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.frontend_security.id
    target_origin_id           = "frontend-s3"
    viewer_protocol_policy     = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.www_redirect.arn
    }
  }

  logging_config {
    bucket          = aws_s3_bucket.access_logs.bucket_domain_name
    include_cookies = false
    prefix          = "cloudfront/frontend/"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }
}

resource "aws_cloudfront_distribution" "assets" {
  aliases             = ["cdn.${var.domain_name}"]
  enabled             = true
  default_root_object = "index.html"
  web_acl_id          = var.enable_waf ? aws_wafv2_web_acl.this[0].arn : null

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "assets-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_cors.id
    target_origin_id           = "assets-s3"
    viewer_protocol_policy     = "redirect-to-https"
  }

  logging_config {
    bucket          = aws_s3_bucket.access_logs.bucket_domain_name
    include_cookies = false
    prefix          = "cloudfront/assets/"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }
}

data "aws_iam_policy_document" "frontend_bucket" {
  statement {
    actions   = ["s3:GetObject"]
    effect    = "Allow"
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket.json
}

data "aws_iam_policy_document" "assets_bucket" {
  statement {
    actions   = ["s3:GetObject"]
    effect    = "Allow"
    resources = ["${aws_s3_bucket.assets.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.assets.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id
  policy = data.aws_iam_policy_document.assets_bucket.json
}
