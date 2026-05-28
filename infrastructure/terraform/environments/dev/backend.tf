# local terraform state storage
terraform {
  required_version = ">= 1.5.0"
  
  backend "local" {
    path = "terraform.tfstate"
  }

  # In a production context, you would uncomment this S3 Backend configuration:
  # backend "s3" {
  #   bucket         = "aerolink-tfstate-bucket"
  #   key            = "dev/aerolink.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "aerolink-tflock-table"
  #   encrypt        = true
  # }
}
