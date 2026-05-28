import os
import boto3

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
PAYMENTS_TABLE_NAME = os.getenv("PAYMENTS_TABLE_NAME", "dev-PaymentsTable")

# Initialize AWS DynamoDB resource natively
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

def get_payments_table():
    return dynamodb.Table(PAYMENTS_TABLE_NAME)
