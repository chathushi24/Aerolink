resource "aws_kms_key" "key" {
  description             = "Customer Managed KMS Key for AeroLink Platform Data Encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
  }
}

resource "aws_kms_alias" "alias" {
  name          = "alias/${var.environment}-aerolink-kms"
  target_key_id = aws_kms_key.key.key_id
}
