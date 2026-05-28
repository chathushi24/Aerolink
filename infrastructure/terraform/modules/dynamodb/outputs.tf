output "users_table_arn" {
  value = aws_dynamodb_table.users.arn
}

output "flights_table_arn" {
  value = aws_dynamodb_table.flights.arn
}

output "bookings_table_arn" {
  value = aws_dynamodb_table.bookings.arn
}

output "payments_table_arn" {
  value = aws_dynamodb_table.payments.arn
}

output "baggage_table_arn" {
  value = aws_dynamodb_table.baggage.arn
}

output "notifications_table_arn" {
  value = aws_dynamodb_table.notifications.arn
}
