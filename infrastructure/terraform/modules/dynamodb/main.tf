resource "aws_dynamodb_table" "users" {
  name         = "${var.environment}-UsersTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "flights" {
  name         = "${var.environment}-FlightsTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "flight_id"

  attribute {
    name = "flight_id"
    type = "S"
  }

  attribute {
    name = "origin"
    type = "S"
  }

  attribute {
    name = "destination"
    type = "S"
  }

  global_secondary_index {
    name            = "RouteIndex"
    hash_key        = "origin"
    range_key       = "destination"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "bookings" {
  name         = "${var.environment}-BookingsTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "booking_id"

  attribute {
    name = "booking_id"
    type = "S"
  }

  attribute {
    name = "passenger_id"
    type = "S"
  }

  global_secondary_index {
    name            = "PassengerIndex"
    hash_key        = "passenger_id"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "payments" {
  name         = "${var.environment}-PaymentsTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "payment_id"

  attribute {
    name = "payment_id"
    type = "S"
  }

  attribute {
    name = "booking_id"
    type = "S"
  }

  global_secondary_index {
    name            = "BookingIndex"
    hash_key        = "booking_id"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "baggage" {
  name         = "${var.environment}-BaggageTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "baggage_id"

  attribute {
    name = "baggage_id"
    type = "S"
  }

  attribute {
    name = "booking_id"
    type = "S"
  }

  global_secondary_index {
    name            = "BookingIndex"
    hash_key        = "booking_id"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "notifications" {
  name         = "${var.environment}-NotificationsTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "notification_id"

  attribute {
    name = "notification_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIndex"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  tags = {
    Environment = var.environment
  }
}
