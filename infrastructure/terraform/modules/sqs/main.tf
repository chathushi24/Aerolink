resource "aws_sqs_queue" "dlq" {
  name                      = "${var.environment}-aerolink-dlq"
  message_retention_seconds = 1209600
  kms_master_key_id         = var.kms_key_id
}

resource "aws_sqs_queue" "flight_seats" {
  name                      = "${var.environment}-aerolink-FlightSeatsQueue"
  message_retention_seconds = 86400
  kms_master_key_id         = var.kms_key_id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "payment_gateway" {
  name                      = "${var.environment}-aerolink-PaymentGatewayQueue"
  message_retention_seconds = 86400
  kms_master_key_id         = var.kms_key_id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "booking_resolution" {
  name                      = "${var.environment}-aerolink-BookingResolutionQueue"
  message_retention_seconds = 86400
  kms_master_key_id         = var.kms_key_id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "baggage_processing" {
  name                      = "${var.environment}-aerolink-BaggageProcessingQueue"
  message_retention_seconds = 86400
  kms_master_key_id         = var.kms_key_id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "notification_logs" {
  name                      = "${var.environment}-aerolink-NotificationLogsQueue"
  message_retention_seconds = 86400
  kms_master_key_id         = var.kms_key_id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}
