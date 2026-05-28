import os
import json
import uuid
import boto3
from datetime import datetime, timezone

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
NOTIFICATIONS_TABLE_NAME = os.getenv("NOTIFICATIONS_TABLE_NAME", "dev-NotificationsTable")

# Initialize DynamoDB Resource
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(NOTIFICATIONS_TABLE_NAME)

def lambda_handler(event, context):
    """
    Serverless AWS Lambda triggered by Amazon SQS NotificationLogsQueue.
    Processes flight events (BookingCreated, PaymentCompleted, BaggageStatusUpdated)
    and logs them into the NotificationsTable.
    """
    print(f"Triggered notification serverless processor event: {json.dumps(event)}")
    
    for record in event.get("Records", []):
        sqs_body = record.get("body", "{}")
        
        try:
            body = json.loads(sqs_body)
            # Check if event comes wrapped in EventBridge format
            event_data = body.get("detail", body) if "detail" in body else body
            
            event_type = event_data.get("event_type")
            user_id = event_data.get("passenger_id") or event_data.get("user_id") or "wildcard-passenger"
            
            if not event_type:
                print("Skipping record. No event_type specified.")
                continue
                
            print(f"Serverless process: Event type {event_type} found for user {user_id}")
            
            # Formulate user notification message
            msg = ""
            if event_type == "BookingCreated":
                msg = f"Your AeroLink ticket (Booking Reference: {event_data.get('booking_id')}) is registered and is PENDING payment."
            elif event_type == "PaymentCompleted":
                msg = f"Payment Confirmed! Your booking {event_data.get('booking_id')} is issued. Reference Code: {event_data.get('transaction_reference')}."
            elif event_type == "PaymentFailed":
                msg = f"Payment Card Declined for booking {event_data.get('booking_id')}. Update card tokens."
            elif event_type == "BaggageStatusUpdated":
                msg = f"Transit Cargo Scan: Luggage [{event_data.get('baggage_id')}] updated to state [{event_data.get('current_status')}] at routing location [{event_data.get('location')}]."
            else:
                msg = f"System Operational Log: Activity {event_type} recorded successfully."
                
            notification_id = f"noti-{uuid.uuid4().hex[:12]}"
            created_at = datetime.now(timezone.utc).isoformat()
            
            notification_item = {
                "notification_id": notification_id,
                "user_id": user_id,
                "event_type": event_type,
                "message": msg,
                "created_at": created_at
            }
            
            # Put item to DynamoDB Table
            table.put_item(Item=notification_item)
            print(f"Notification logged in DynamoDB: {notification_id} for user {user_id}")
            
        except Exception as err:
            print(f"Error handling serverless record parsing: {str(err)}")
            # Raise exception to fail the SQS message and trigger retry/DLQ routing in AWS
            raise err
            
    return {
        "statusCode": 200,
        "body": json.dumps("Serverless SQS logging batch execution successful.")
    }
