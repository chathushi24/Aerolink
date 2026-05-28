resource "aws_iam_role" "lambda" {
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

resource "aws_iam_policy" "lambda" {
  name = "${var.environment}-aerolink-lambda-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Effect   = "Allow"
        Resource = var.notification_logs_queue_arn
      },
      {
        Action   = ["dynamodb:PutItem", "dynamodb:UpdateItem"]
        Effect   = "Allow"
        Resource = var.notifications_table_arn
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
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda.arn
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../../aws/lambda/notification_processor.py"
  output_path = "${path.module}/notification_processor.zip"
}

resource "aws_lambda_function" "processor" {
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  function_name    = "${var.environment}-aerolink-notification-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "notification_processor.lambda_handler"
  runtime          = "python3.10"

  environment {
    variables = {
      NOTIFICATIONS_TABLE_NAME = var.notifications_table_name
    }
  }
}

resource "aws_lambda_event_source_mapping" "sqs" {
  event_source_arn = var.notification_logs_queue_arn
  function_name    = aws_lambda_function.processor.arn
  batch_size       = 5
}
