resource "aws_cloudwatch_event_bus" "bus" {
  name = "${var.environment}-aerolink-event-bus"
}

resource "aws_cloudwatch_event_rule" "booking_created" {
  name           = "${var.environment}-BookingCreatedRule"
  event_bus_name = aws_cloudwatch_event_bus.bus.name
  event_pattern = jsonencode({
    "detail-type" = ["BookingCreated"]
  })
}

resource "aws_cloudwatch_event_target" "flight" {
  rule           = aws_cloudwatch_event_rule.booking_created.name
  event_bus_name = aws_cloudwatch_event_bus.bus.name
  arn            = var.flight_seats_queue_arn
}

resource "aws_cloudwatch_event_target" "payment" {
  rule           = aws_cloudwatch_event_rule.booking_created.name
  event_bus_name = aws_cloudwatch_event_bus.bus.name
  arn            = var.payment_gateway_queue_arn
}

resource "aws_cloudwatch_event_rule" "all_alerts" {
  name           = "${var.environment}-AllOperationalAlertsRule"
  event_bus_name = aws_cloudwatch_event_bus.bus.name
  event_pattern = jsonencode({
    "detail-type" = ["BookingCreated", "PaymentCompleted", "PaymentFailed", "BaggageStatusUpdated"]
  })
}

resource "aws_cloudwatch_event_target" "notification" {
  rule           = aws_cloudwatch_event_rule.all_alerts.name
  event_bus_name = aws_cloudwatch_event_bus.bus.name
  arn            = var.notification_logs_queue_arn
}
