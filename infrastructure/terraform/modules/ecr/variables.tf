variable "environment" {
  type        = string
  description = "Target deployment environment (dev/prod)"
}

variable "service_name" {
  type        = string
  description = "Name of the microservice for ECR registry"
}
