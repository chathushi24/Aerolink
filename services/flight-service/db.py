import os
import boto3

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
FLIGHTS_TABLE_NAME = os.getenv("FLIGHTS_TABLE_NAME", "dev-FlightsTable")

# Initialize AWS DynamoDB resource natively
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

def get_flights_table():
    return dynamodb.Table(FLIGHTS_TABLE_NAME)
