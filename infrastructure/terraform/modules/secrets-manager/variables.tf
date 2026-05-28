variable "environment" {
  type        = string
  description = "Target deployment workspace (dev/prod)"
}

variable "kms_key_id" {
  type        = string
  description = "AWS KMS key ID to encrypt secrets"
}
