provider "aws" {
  region = var.aws_region
}

# ==========================================================================
# 1. ENCRYPTION KEYS (AWS KMS)
# ==========================================================================
resource "aws_kms_key" "aerolink_kms" {
  description             = "KMS Key for AeroLink Table Encryption and Secrets Manager"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
  }
}

resource "aws_kms_alias" "aerolink_kms_alias" {
  name          = "alias/aerolink-kms"
  target_key_id = aws_kms_key.aerolink_kms.key_id
}

# ==========================================================================
# 2. NETWORKING (VPC MODULE)
# ==========================================================================
module "vpc" {
  source                = "../../modules/vpc"
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  public_subnets_cidrs  = var.public_subnets_cidrs
  private_subnets_cidrs = var.private_subnets_cidrs
  azs                   = var.azs
}

# ==========================================================================
# 3. DATABASES (DYNAMODB MODULE)
# ==========================================================================
module "dynamodb" {
  source      = "../../modules/dynamodb"
  environment = var.environment
  kms_key_arn = aws_kms_key.aerolink_kms.arn
}

# ==========================================================================
# 4. IDENTITY PROVIDER (AMAZON COGNITO)
# ==========================================================================
resource "aws_cognito_user_pool" "pool" {
  name = "${var.environment}-aerolink-user-pool"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 2
      max_length = 20
    }
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "${var.environment}-aerolink-client"
  user_pool_id = aws_cognito_user_pool.pool.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}

resource "aws_cognito_user_group" "passenger" {
  name         = "PASSENGER"
  user_pool_id = aws_cognito_user_pool.pool.id
  description  = "AeroLink Flight Passengers Group"
}

resource "aws_cognito_user_group" "staff" {
  name         = "STAFF"
  user_pool_id = aws_cognito_user_pool.pool.id
  description  = "AeroLink Operations Ground Staff Group"
}

resource "aws_cognito_user_group" "admin" {
  name         = "ADMIN"
  user_pool_id = aws_cognito_user_pool.pool.id
  description  = "AeroLink Corporate Administrators Group"
}

# ==========================================================================
# 5. CONTAINER REGISTRIES (AMAZON ECR)
# ==========================================================================
resource "aws_ecr_repository" "repos" {
  for_each             = toset(["auth-service", "flight-service", "booking-service", "payment-service", "baggage-service", "notification-service", "frontend"])
  name                 = "${var.environment}-aerolink-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ==========================================================================
# 6. ASYNCHRONOUS EVENT CORE (EVENTBRIDGE & SQS)
# ==========================================================================
resource "aws_cloudwatch_event_bus" "custom_bus" {
  name = "${var.environment}-aerolink-event-bus"
}

# SQS Queues
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.environment}-aerolink-dlq"
  message_retention_seconds = 1209600 # 14 days
  kms_master_key_id         = aws_kms_key.aerolink_kms.arn
}

resource "aws_sqs_queue" "queues" {
  for_each                  = toset(["FlightSeatsQueue", "PaymentGatewayQueue", "BookingResolutionQueue", "BaggageProcessingQueue", "NotificationLogsQueue"])
  name                      = "${var.environment}-aerolink-${each.key}"
  message_retention_seconds = 86400
  kms_master_key_id         = aws_kms_key.aerolink_kms.arn

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

# EventBridge Rules to SQS mappings
resource "aws_cloudwatch_event_rule" "booking_created" {
  name           = "BookingCreatedRule"
  event_bus_name = aws_cloudwatch_event_bus.custom_bus.name
  event_pattern = jsonencode({
    "detail-type" = ["BookingCreated"]
  })
}

resource "aws_cloudwatch_event_target" "flight_seats" {
  rule           = aws_cloudwatch_event_rule.booking_created.name
  event_bus_name = aws_cloudwatch_event_bus.custom_bus.name
  arn            = aws_sqs_queue.queues["FlightSeatsQueue"].arn
}

resource "aws_cloudwatch_event_target" "payment_gateway" {
  rule           = aws_cloudwatch_event_rule.booking_created.name
  event_bus_name = aws_cloudwatch_event_bus.custom_bus.name
  arn            = aws_sqs_queue.queues["PaymentGatewayQueue"].arn
}

# Notification Logs capture all operational events
resource "aws_cloudwatch_event_rule" "all_alerts" {
  name           = "AllOperationalAlertsRule"
  event_bus_name = aws_cloudwatch_event_bus.custom_bus.name
  event_pattern = jsonencode({
    "detail-type" = ["BookingCreated", "PaymentCompleted", "PaymentFailed", "BaggageStatusUpdated"]
  })
}

resource "aws_cloudwatch_event_target" "notification_logs" {
  rule           = aws_cloudwatch_event_rule.all_alerts.name
  event_bus_name = aws_cloudwatch_event_bus.custom_bus.name
  arn            = aws_sqs_queue.queues["NotificationLogsQueue"].arn
}

# ==========================================================================
# 7. SERVERLESS LOGIC (AWS LAMBDA)
# ==========================================================================
resource "aws_iam_role" "lambda_role" {
  name = "${var.environment}-aerolink-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "lambda_policy" {
  name = "${var.environment}-aerolink-lambda-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Effect   = "Allow"
        Resource = aws_sqs_queue.queues["NotificationLogsQueue"].arn
      },
      {
        Action   = ["dynamodb:PutItem", "dynamodb:UpdateItem"]
        Effect   = "Allow"
        Resource = module.dynamodb.notifications_table_arn
      },
      {
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# ==========================================================================
# 8. EKS CONTAINER CLUSTER (AMAZON EKS)
# ==========================================================================
resource "aws_iam_role" "eks_cluster" {
  name = "${var.environment}-aerolink-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_eks_cluster" "eks" {
  name     = "${var.environment}-aerolink-eks"
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids = module.vpc.private_subnets_ids
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

resource "aws_iam_role" "eks_nodes" {
  name = "${var.environment}-aerolink-eks-nodes-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_node_policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_registry_policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_eks_node_group" "nodes" {
  cluster_name    = aws_eks_cluster.eks.name
  node_group_name = "${var.environment}-node-group"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = module.vpc.private_subnets_ids

  scaling_config {
    desired_size = 2
    max_size     = 4
    min_size     = 1
  }

  instance_types = ["t3.medium"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_registry_policy
  ]
}

# ==========================================================================
# 9. FRONTEND STATIC HOSTING & CDN (S3 + CLOUDFRONT)
# ==========================================================================
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.environment}-aerolink-web-assets"
  force_destroy = true
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.environment}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3FrontendOrigin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3FrontendOrigin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Environment = var.environment
  }
}
