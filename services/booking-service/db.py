import os
import boto3

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BOOKINGS_TABLE_NAME = os.getenv("BOOKINGS_TABLE_NAME", "dev-BookingsTable")

# Initialize AWS DynamoDB resource natively
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

def get_bookings_table():
    return dynamodb.Table(BOOKINGS_TABLE_NAME)
