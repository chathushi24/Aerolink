provider "aws" {
  region = var.aws_region
}

# 1. KMS Encryption Module
module "kms" {
  source      = "../../modules/kms"
  environment = var.environment
}

# 2. Secrets Manager Module
module "secrets_manager" {
  source      = "../../modules/secrets-manager"
  environment = var.environment
  kms_key_id  = module.kms.key_id
}

# 3. Core Networking VPC Module
module "vpc" {
  source                = "../../modules/vpc"
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  public_subnets_cidrs  = var.public_subnets_cidrs
  private_subnets_cidrs = var.private_subnets_cidrs
  azs                   = var.azs
}

# 4. Amazon Cognito Authentication Module
module "cognito" {
  source      = "../../modules/cognito"
  environment = var.environment
}

# 5. Amazon ECR Registries
module "ecr_auth" {
  source       = "../../modules/ecr"
  environment  = var.environment
  service_name = "auth-service"
}

module "ecr_flight" {
  source       = "../../modules/ecr"
  environment  = var.environment
  service_name = "flight-service"
}

module "ecr_booking" {
  source       = "../../modules/ecr"
  environment  = var.environment
  service_name = "booking-service"
}

module "ecr_payment" {
  source       = "../../modules/ecr"
  environment  = var.environment
  service_name = "payment-service"
}

module "ecr_baggage" {
  source       = "../../modules/ecr"
  environment  = var.environment
  service_name = "baggage-service"
}

module "ecr_notification" {
  source       = "../../modules/ecr"
  environment  = var.environment
  service_name = "notification-service"
}

module "ecr_frontend" {
  source       = "../../modules/ecr"
  environment  = var.environment
  service_name = "frontend"
}

# 6. AWS SQS Messaging Queues
module "sqs" {
  source      = "../../modules/sqs"
  environment = var.environment
  kms_key_id  = module.kms.key_id
}

# 7. Amazon EventBridge Core Bus & Rules
module "eventbridge" {
  source                      = "../../modules/eventbridge"
  environment                 = var.environment
  flight_seats_queue_arn      = module.sqs.flight_seats_queue_arn
  payment_gateway_queue_arn   = module.sqs.payment_gateway_queue_arn
  notification_logs_queue_arn = module.sqs.notification_logs_queue_arn
}

# 8. Serverless AWS Lambda Log Processors
module "lambda" {
  source                      = "../../modules/lambda"
  environment                 = var.environment
  notification_logs_queue_arn = module.sqs.notification_logs_queue_arn
  notifications_table_arn     = module.dynamodb.notifications_table_arn
  notifications_table_name    = "${var.environment}-NotificationsTable"
}

# 9. Amazon EKS Kubernetes Cluster Group
module "eks" {
  source             = "../../modules/eks"
  environment        = var.environment
  private_subnet_ids = module.vpc.private_subnets_ids
  desired_size       = 2
  max_size           = 4
  min_size           = 1
  instance_types     = ["t3.medium"]
}

# 10. Amazon S3 static web assets & CloudFront CDN
module "s3_cloudfront" {
  source      = "../../modules/s3-cloudfront"
  environment = var.environment
}

# 11. AWS DynamoDB Serverless Database Module
module "dynamodb" {
  source      = "../../modules/dynamodb"
  environment = var.environment
  kms_key_arn = module.kms.key_arn
}

# 12. Amazon CloudWatch Central Container Logging Logs
module "cloudwatch" {
  source      = "../../modules/cloudwatch"
  environment = var.environment
}
