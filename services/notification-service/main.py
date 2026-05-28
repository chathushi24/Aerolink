import uuid
import os
import time
import json
import logging
import threading
from datetime import datetime, timezone
from typing import List
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from boto3.dynamodb.conditions import Key
import boto3

from db import get_notifications_table
from schemas import NotificationOut
from auth_utils import get_current_user

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("notification-service")

app = FastAPI(
    title="AeroLink Notification Log Service",
    description="Microservice responsible for collecting event logs and serving user push/notification records.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQS background listener configuration
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
SQS_NOTIFICATION_QUEUE_URL = os.getenv("SQS_NOTIFICATION_LOGS_QUEUE_URL", "")

def sqs_notification_logs_consumer():
    """Background SQS daemon to collect AWS events and record user notifications."""
    if not SQS_NOTIFICATION_QUEUE_URL:
        logger.warning("SQS_NOTIFICATION_LOGS_QUEUE_URL not defined. SQS consumer disabled.")
        return
        
    logger.info(f"Starting native SQS consumer. Queue: {SQS_NOTIFICATION_QUEUE_URL}")
    sqs = boto3.client("sqs", region_name=AWS_REGION)
        
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=SQS_NOTIFICATION_QUEUE_URL,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=20
            )
            
            messages = response.get("Messages", [])
            for message in messages:
                receipt_handle = message["ReceiptHandle"]
                body_str = message["Body"]
                
                logger.info(f"Received message from AWS SQS queue: {body_str}")
                
                try:
                    body = json.loads(body_str)
                    event_data = body.get("detail", body) if "detail" in body else body
                    
                    event_type = event_data.get("event_type")
                    passenger_id = event_data.get("passenger_id") or event_data.get("user_id")
                    
                    if not passenger_id and "booking_id" in event_data:
                        passenger_id = "wildcard-passenger"
                        
                    if event_type and passenger_id:
                        logger.info(f"Compiling notification in AWS for User: {passenger_id}")
                        
                        msg = ""
                        if event_type == "BookingCreated":
                            msg = f"Your reservation (Booking: {event_data.get('booking_id')}) has been created successfully and is now PENDING payment."
                        elif event_type == "PaymentCompleted":
                            msg = f"Payment Successful! Your ticket for Booking {event_data.get('booking_id')} is confirmed. Ref: {event_data.get('transaction_reference')}."
                        elif event_type == "PaymentFailed":
                            msg = f"Payment Failed for Booking {event_data.get('booking_id')}. Please update your payment card information."
                        elif event_type == "BaggageStatusUpdated":
                            msg = f"Baggage status update: Baggage [{event_data.get('baggage_id')}] is now [{event_data.get('current_status')}] at location [{event_data.get('location')}]."
                        else:
                            msg = f"Operational alert: Event {event_type} processed successfully."
                            
                        notification_id = str(uuid.uuid4())
                        created_at = datetime.now(timezone.utc).isoformat()
                        
                        noti_item = {
                            "notification_id": notification_id,
                            "user_id": passenger_id,
                            "event_type": event_type,
                            "message": msg,
                            "created_at": created_at
                        }
                        
                        table = get_notifications_table()
                        table.put_item(Item=noti_item)
                        logger.info(f"Notification registered in AWS: {notification_id}")
                        
                except Exception as parse_error:
                    logger.error(f"Error parsing SQS notification log body: {str(parse_error)}")
                    
                sqs.delete_message(QueueUrl=SQS_NOTIFICATION_QUEUE_URL, ReceiptHandle=receipt_handle)
                
        except Exception as e:
            logger.error(f"Error in SQS notification logs consumer: {str(e)}")
            time.sleep(5)

@app.on_event("startup")
def startup_event():
    # Start pure AWS SQS Daemon
    t = threading.Thread(target=sqs_notification_logs_consumer, daemon=True)
    t.start()

@app.get("/health", tags=["Utilities"])
def health_check():
    return {"status": "healthy", "service": "notification-service", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/notifications/{user_id}", response_model=List[NotificationOut], tags=["Notifications"])
def get_user_notifications(user_id: str, current_user: dict = Depends(get_current_user)):
    table = get_notifications_table()
    current_sub = current_user.get("sub")
    current_role = current_user.get("role")
    
    if current_role == "PASSENGER" and user_id != current_sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to requested notification logs."
        )
        
    try:
        response = table.query(
            IndexName="UserIndex",
            KeyConditionExpression=Key("user_id").eq(user_id)
        )
        items = response.get("Items", [])
        return items
    except Exception as e:
        logger.error(f"Error querying notification logs from AWS: {str(e)}")
        raise HTTPException(status_code=500, detail="Database query failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8006, reload=True)
