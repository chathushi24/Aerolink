variable "vpc_cidr" {
  type        = string
  description = "The VPC network block range"
}

variable "public_subnets_cidrs" {
  type        = list(string)
  description = "Public subnets CIDR configurations"
}

variable "private_subnets_cidrs" {
  type        = list(string)
  description = "Private subnets CIDR configurations"
}

variable "azs" {
  type        = list(string)
  description = "Availability zones list to bind subnets to"
}

variable "environment" {
  type        = string
  description = "Target deployment workspace (dev/prod)"
}
