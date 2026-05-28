variable "environment" {
  type        = string
  description = "Target deployment workspace (dev/prod)"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "EKS node private subnet IDs list"
}

variable "desired_size" {
  type        = number
  default     = 2
  description = "Initial scaling group count"
}

variable "max_size" {
  type        = number
  default     = 4
  description = "Limit of nodes to scale up to"
}

variable "min_size" {
  type        = number
  default     = 1
  description = "Limit of nodes to scale down to"
}

variable "instance_types" {
  type        = list(string)
  default     = ["t3.small"]
  description = "Node instances machine specifications"
}
