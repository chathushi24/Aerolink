import uuid
import os
import time
import json
import logging
import threading
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from boto3.dynamodb.conditions import Key
import boto3

from db import get_bookings_table
from schemas import BookingCreate, BookingStatusPatch, BookingOut
from auth_utils import get_current_user
from event_publisher import publish_event

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("booking-service")

app = FastAPI(
    title="AeroLink Booking Service",
    description="Microservice responsible for creating reservations, handling ticketing flows, and orchestrating booking lifecycle events.",
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
SQS_BOOKING_QUEUE_URL = os.getenv("SQS_BOOKING_RESOLUTION_QUEUE_URL", "")

def sqs_booking_resolution_consumer():
    """Background SQS daemon to listen to AWS SQS Payment events and resolve booking state."""
    if not SQS_BOOKING_QUEUE_URL:
        logger.warning("SQS_BOOKING_RESOLUTION_QUEUE_URL not defined. SQS consumer disabled.")
        return
        
    logger.info(f"Starting native SQS consumer. Queue: {SQS_BOOKING_QUEUE_URL}")
    sqs = boto3.client("sqs", region_name=AWS_REGION)
        
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=SQS_BOOKING_QUEUE_URL,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=20
            )
            
            messages = response.get("Messages", [])
            for message in messages:
                receipt_handle = message["ReceiptHandle"]
                body_str = message["Body"]
                
                logger.info(f"Received message from SQS queue: {body_str}")
                
                try:
                    body = json.loads(body_str)
                    event_data = body.get("detail", body) if "detail" in body else body
                    
                    event_type = event_data.get("event_type")
                    booking_id = event_data.get("booking_id")
                    
                    if event_type in ["PaymentCompleted", "PaymentFailed"] and booking_id:
                        new_booking_status = "SUCCESS" if event_type == "PaymentCompleted" else "FAILED"
                        new_payment_status = "PAID" if event_type == "PaymentCompleted" else "FAILED"
                        
                        logger.info(f"Updating AWS DynamoDB booking status for {booking_id} to {new_booking_status}")
                        
                        table = get_bookings_table()
                        table.update_item(
                            Key={"booking_id": booking_id},
                            UpdateExpression="SET booking_status = :bs, payment_status = :ps",
                            ExpressionAttributeValues={
                                ":bs": new_booking_status,
                                ":ps": new_payment_status
                            }
                        )
                        logger.info(f"Booking {booking_id} resolved successfully.")
                        
                except Exception as parse_error:
                    logger.error(f"Error parsing SQS booking resolution message: {str(parse_error)}")
                    
                sqs.delete_message(QueueUrl=SQS_BOOKING_QUEUE_URL, ReceiptHandle=receipt_handle)
                
        except Exception as e:
            logger.error(f"Error in AWS SQS booking consumer loop: {str(e)}")
            time.sleep(5)

@app.on_event("startup")
def startup_event():
    # Start pure AWS SQS Daemon
    t = threading.Thread(target=sqs_booking_resolution_consumer, daemon=True)
    t.start()

@app.get("/health", tags=["Utilities"])
def health_check():
    return {"status": "healthy", "service": "booking-service", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED, tags=["Bookings"])
def create_booking(booking: BookingCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    user_role = current_user.get("role")
    
    if user_role == "PASSENGER" and booking.passenger_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Passengers can only reserve flights in their own name."
        )
        
    table = get_bookings_table()
    booking_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    
    booking_item = {
        "booking_id": booking_id,
        "passenger_id": booking.passenger_id,
        "flight_id": booking.flight_id,
        "seat_count": int(booking.seat_count),
        "booking_status": "PENDING",
        "payment_status": "UNPAID",
        "created_at": created_at
    }
    
    try:
        table.put_item(Item=booking_item)
        logger.info(f"Booking {booking_id} saved in PENDING state. Publishing Event...")
        
        # Publish BookingCreated event
        publish_event("BookingCreated", {
            "booking_id": booking_id,
            "passenger_id": booking.passenger_id,
            "flight_id": booking.flight_id,
            "seat_count": booking.seat_count
        })
        
        return booking_item
    except Exception as e:
        logger.error(f"Error executing booking in AWS: {str(e)}")
        raise HTTPException(status_code=500, detail="Booking pipeline transaction failed")

@app.get("/bookings/{booking_id}", response_model=BookingOut, tags=["Bookings"])
def get_booking_by_id(booking_id: str, current_user: dict = Depends(get_current_user)):
    table = get_bookings_table()
    user_id = current_user.get("sub")
    user_role = current_user.get("role")
    
    try:
        response = table.get_item(Key={"booking_id": booking_id})
        item = response.get("Item")
        if not item:
            raise HTTPException(status_code=404, detail="Booking not found")
            
        if user_role == "PASSENGER" and item["passenger_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to booking invoice."
            )
            
        item["seat_count"] = int(item["seat_count"])
        return item
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving booking {booking_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database fetch failed")

@app.get("/bookings/passenger/{passenger_id}", response_model=List[BookingOut], tags=["Bookings"])
def get_bookings_by_passenger(passenger_id: str, current_user: dict = Depends(get_current_user)):
    table = get_bookings_table()
    user_id = current_user.get("sub")
    user_role = current_user.get("role")
    
    if user_role == "PASSENGER" and passenger_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to other passenger records."
        )
        
    try:
        response = table.query(
            IndexName="PassengerIndex",
            KeyConditionExpression=Key("passenger_id").eq(passenger_id)
        )
        items = response.get("Items", [])
        for x in items:
            x["seat_count"] = int(x["seat_count"])
        return items
    except Exception as e:
        logger.error(f"Error querying passenger bookings: {str(e)}")
        raise HTTPException(status_code=500, detail="Database query failed")

@app.patch("/bookings/{booking_id}/status", response_model=BookingOut, tags=["Bookings"])
def patch_booking_status(
    booking_id: str, 
    status_patch: BookingStatusPatch, 
    current_user: dict = Depends(get_current_user)
):
    table = get_bookings_table()
    
    response = table.get_item(Key={"booking_id": booking_id})
    item = response.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    update_expr = "SET booking_status = :bs"
    expr_vals = {":bs": status_patch.booking_status}
    
    if status_patch.payment_status:
        update_expr += ", payment_status = :ps"
        expr_vals[":ps"] = status_patch.payment_status
        
    try:
        res = table.update_item(
            Key={"booking_id": booking_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_vals,
            ReturnValues="ALL_NEW"
        )
        updated = res.get("Attributes")
        updated["seat_count"] = int(updated["seat_count"])
        return updated
    except Exception as e:
        logger.error(f"Error patching booking status: {str(e)}")
        raise HTTPException(status_code=500, detail="Database patch failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
