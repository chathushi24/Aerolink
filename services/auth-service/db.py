import os
import boto3

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
USERS_TABLE_NAME = os.getenv("USERS_TABLE_NAME", "dev-UsersTable")

# Initialize AWS DynamoDB resource natively
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

def get_users_table():
    return dynamodb.Table(USERS_TABLE_NAME)
