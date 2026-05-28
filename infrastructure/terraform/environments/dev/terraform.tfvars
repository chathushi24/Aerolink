aws_region            = "us-east-1"
environment           = "dev"
vpc_cidr              = "10.0.0.0/16"
public_subnets_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
azs                   = ["us-east-1a", "us-east-1b"]
