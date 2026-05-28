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

  tags = {
    Environment = var.environment
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
