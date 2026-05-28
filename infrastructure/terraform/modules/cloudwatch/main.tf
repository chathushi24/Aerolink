resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/eks/aerolink/${var.environment}/auth-service"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "flight" {
  name              = "/aws/eks/aerolink/${var.environment}/flight-service"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "booking" {
  name              = "/aws/eks/aerolink/${var.environment}/booking-service"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "payment" {
  name              = "/aws/eks/aerolink/${var.environment}/payment-service"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "baggage" {
  name              = "/aws/eks/aerolink/${var.environment}/baggage-service"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "notification" {
  name              = "/aws/eks/aerolink/${var.environment}/notification-service"
  retention_in_days = 7
}
