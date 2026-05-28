variable "environment" {
  type        = string
  description = "Target deployment workspace"
}

variable "kms_key_arn" {
  type        = string
  description = "Customer Managed Key ARN to handle encryption at rest"
}
