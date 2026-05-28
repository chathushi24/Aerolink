output "log_group_names" {
  value = [
    aws_cloudwatch_log_group.auth.name,
    aws_cloudwatch_log_group.flight.name,
    aws_cloudwatch_log_group.booking.name,
    aws_cloudwatch_log_group.payment.name,
    aws_cloudwatch_log_group.baggage.name,
    aws_cloudwatch_log_group.notification.name
  ]
}
