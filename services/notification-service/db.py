import os
import boto3

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
NOTIFICATIONS_TABLE_NAME = os.getenv("NOTIFICATIONS_TABLE_NAME", "dev-NotificationsTable")

# Initialize AWS DynamoDB resource natively
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

def get_notifications_table():
    return dynamodb.Table(NOTIFICATIONS_TABLE_NAME)
