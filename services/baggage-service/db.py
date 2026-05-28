import os
import boto3

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BAGGAGE_TABLE_NAME = os.getenv("BAGGAGE_TABLE_NAME", "dev-BaggageTable")

# Initialize AWS DynamoDB resource natively
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

def get_baggage_table():
    return dynamodb.Table(BAGGAGE_TABLE_NAME)
