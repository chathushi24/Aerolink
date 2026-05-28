resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.environment}-aerolink-jwt-secret-key"
  description             = "JWT Signer Secret Credentials"
  recovery_window_in_days = 7
  kms_key_id              = var.kms_key_id

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret_version" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({
    JWT_SECRET = "aerolink-super-secret-jwt-key-2026-prod-encryption"
  })
}
