output "dlq_arn" {
  value = aws_sqs_queue.dlq.arn
}

output "flight_seats_queue_url" {
  value = aws_sqs_queue.flight_seats.url
}

output "flight_seats_queue_arn" {
  value = aws_sqs_queue.flight_seats.arn
}

output "payment_gateway_queue_url" {
  value = aws_sqs_queue.payment_gateway.url
}

output "payment_gateway_queue_arn" {
  value = aws_sqs_queue.payment_gateway.arn
}

output "booking_resolution_queue_url" {
  value = aws_sqs_queue.booking_resolution.url
}

output "booking_resolution_queue_arn" {
  value = aws_sqs_queue.booking_resolution.arn
}

output "baggage_processing_queue_url" {
  value = aws_sqs_queue.baggage_processing.url
}

output "baggage_processing_queue_arn" {
  value = aws_sqs_queue.baggage_processing.arn
}

output "notification_logs_queue_url" {
  value = aws_sqs_queue.notification_logs.url
}

output "notification_logs_queue_arn" {
  value = aws_sqs_queue.notification_logs.arn
}
