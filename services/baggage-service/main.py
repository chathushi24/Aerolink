import uuid
import os
import time
import json
import logging
import threading
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from boto3.dynamodb.conditions import Key
import boto3

from db import get_baggage_table
from schemas import BaggageCreate, BaggageStatusPatch, BaggageOut
from auth_utils import get_current_user, RoleChecker
from event_publisher import publish_event

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("baggage-service")

app = FastAPI(
    title="AeroLink Baggage Tracking Service",
    description="Microservice responsible for managing checked baggage, tracking barcode coordinates, and emitting routing updates.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

staff_or_admin = RoleChecker(allowed_roles=["STAFF", "ADMIN"])

# SQS background listener configuration
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
SQS_BAGGAGE_QUEUE_URL = os.getenv("SQS_BAGGAGE_PROCESSING_QUEUE_URL", "")

def sqs_baggage_consumer():
    """Background SQS daemon to listen to native AWS SQS PaymentCompleted events and automatically initialize baggage."""
    if not SQS_BAGGAGE_QUEUE_URL:
        logger.warning("SQS_BAGGAGE_PROCESSING_QUEUE_URL not defined. SQS consumer disabled.")
        return
        
    logger.info(f"Starting native SQS consumer. Queue: {SQS_BAGGAGE_QUEUE_URL}")
    sqs = boto3.client("sqs", region_name=AWS_REGION)
        
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=SQS_BAGGAGE_QUEUE_URL,
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
                    if event_type == "PaymentCompleted":
                        booking_id = event_data.get("booking_id")
                        passenger_id = event_data.get("passenger_id")
                        
                        logger.info(f"Auto-initializing baggage in AWS. Booking: {booking_id}")
                        
                        baggage_id = f"bag-{uuid.uuid4().hex[:10]}"
                        last_updated = datetime.now(timezone.utc).isoformat()
                        
                        bag_item = {
                            "baggage_id": baggage_id,
                            "booking_id": booking_id,
                            "passenger_id": passenger_id,
                            "current_status": "CHECKED_IN",
                            "last_updated": last_updated,
                            "location": "JFK_DEPARTURE_TERMINAL"
                        }
                        
                        table = get_baggage_table()
                        table.put_item(Item=bag_item)
                        logger.info(f"Auto-registered baggage: {baggage_id}")
                        
                        # Publish baggage event
                        publish_event("BaggageStatusUpdated", {
                            "baggage_id": baggage_id,
                            "booking_id": booking_id,
                            "passenger_id": passenger_id,
                            "current_status": "CHECKED_IN",
                            "location": "JFK_DEPARTURE_TERMINAL"
                        })
                        
                except Exception as parse_error:
                    logger.error(f"Error parsing SQS baggage message body: {str(parse_error)}")
                    
                sqs.delete_message(QueueUrl=SQS_BAGGAGE_QUEUE_URL, ReceiptHandle=receipt_handle)
                
        except Exception as e:
            logger.error(f"Error in SQS baggage consumer: {str(e)}")
            time.sleep(5)

@app.on_event("startup")
def startup_event():
    # Start native AWS SQS Daemon
    t = threading.Thread(target=sqs_baggage_consumer, daemon=True)
    t.start()

@app.get("/health", tags=["Utilities"])
def health_check():
    return {"status": "healthy", "service": "baggage-service", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/baggage", response_model=BaggageOut, status_code=status.HTTP_201_CREATED, tags=["Baggage"])
def create_baggage(baggage: BaggageCreate, current_user: dict = Depends(get_current_user)):
    table = get_baggage_table()
    baggage_id = f"bag-{uuid.uuid4().hex[:10]}"
    last_updated = datetime.now(timezone.utc).isoformat()
    
    baggage_item = {
        "baggage_id": baggage_id,
        "booking_id": baggage.booking_id,
        "passenger_id": baggage.passenger_id,
        "current_status": baggage.current_status,
        "last_updated": last_updated,
        "location": baggage.location
    }
    
    try:
        table.put_item(Item=baggage_item)
        logger.info(f"Baggage record {baggage_id} created manually in AWS.")
        
        publish_event("BaggageStatusUpdated", {
            "baggage_id": baggage_id,
            "booking_id": baggage.booking_id,
            "passenger_id": baggage.passenger_id,
            "current_status": baggage.current_status,
            "location": baggage.location
        })
        
        return baggage_item
    except Exception as e:
        logger.error(f"Error creating baggage: {str(e)}")
        raise HTTPException(status_code=500, detail="Database write failed")

@app.get("/baggage/{booking_id}", response_model=List[BaggageOut], tags=["Baggage"])
def get_baggage_by_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    table = get_baggage_table()
    user_id = current_user.get("sub")
    user_role = current_user.get("role")
    
    try:
        response = table.query(
            IndexName="BookingIndex",
            KeyConditionExpression=Key("booking_id").eq(booking_id)
        )
        items = response.get("Items", [])
        
        if user_role == "PASSENGER" and items:
            if items[0]["passenger_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to baggage tracking records."
                )
                
        return items
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching baggage for booking {booking_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database query failed")

@app.patch("/baggage/{baggage_id}/status", response_model=BaggageOut, tags=["Baggage"])
def patch_baggage_status(
    baggage_id: str, 
    status_patch: BaggageStatusPatch, 
    current_user: dict = Depends(staff_or_admin)
):
    table = get_baggage_table()
    
    response = table.get_item(Key={"baggage_id": baggage_id})
    item = response.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Baggage record not found")
        
    last_updated = datetime.now(timezone.utc).isoformat()
    
    try:
        res = table.update_item(
            Key={"baggage_id": baggage_id},
            UpdateExpression="SET current_status = :cs, last_updated = :lu, #l = :loc",
            ExpressionAttributeNames={"#l": "location"},
            ExpressionAttributeValues={
                ":cs": status_patch.current_status,
                ":lu": last_updated,
                ":loc": status_patch.location
            },
            ReturnValues="ALL_NEW"
        )
        updated = res.get("Attributes")
        logger.info(f"Baggage {baggage_id} state updated in AWS.")
        
        publish_event("BaggageStatusUpdated", {
            "baggage_id": baggage_id,
            "booking_id": updated["booking_id"],
            "passenger_id": updated["passenger_id"],
            "current_status": status_patch.current_status,
            "location": status_patch.location
        })
        
        return updated
    except Exception as e:
        logger.error(f"Error updating baggage record status: {str(e)}")
        raise HTTPException(status_code=500, detail="Database update failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
