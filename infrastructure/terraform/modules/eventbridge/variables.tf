variable "environment" {
  type        = string
  description = "Target deployment workspace"
}

variable "flight_seats_queue_arn" {
  type        = string
  description = "AWS SQS FlightSeatsQueue ARN to forward BookingCreated events"
}

variable "payment_gateway_queue_arn" {
  type        = string
  description = "AWS SQS PaymentGatewayQueue ARN to forward BookingCreated events"
}

variable "notification_logs_queue_arn" {
  type        = string
  description = "AWS SQS NotificationLogsQueue ARN to forward all messaging events"
}
