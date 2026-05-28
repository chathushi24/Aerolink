output "bucket_name" {
  value = aws_s3_bucket.bucket.bucket
}

output "bucket_regional_domain" {
  value = aws_s3_bucket.bucket.bucket_regional_domain_name
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.cdn.domain_name
}
