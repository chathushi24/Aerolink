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
import boto3

from db import get_payments_table
from schemas import PaymentCreate, PaymentStatusPatch, PaymentOut
from auth_utils import get_current_user
from event_publisher import publish_event

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("payment-service")

app = FastAPI(
    title="AeroLink Payment Service",
    description="PCI-DSS compliant mock payment gateway processor resolving transaction status events.",
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
SQS_PAYMENT_QUEUE_URL = os.getenv("SQS_PAYMENT_GATEWAY_QUEUE_URL", "")

def sqs_payment_consumer():
    """Background SQS daemon to listen to AWS SQS BookingCreated events and charge mock gateway."""
    if not SQS_PAYMENT_QUEUE_URL:
        logger.warning("SQS_PAYMENT_GATEWAY_QUEUE_URL not defined. SQS consumer disabled.")
        return
        
    logger.info(f"Starting native SQS consumer. Queue: {SQS_PAYMENT_QUEUE_URL}")
    sqs = boto3.client("sqs", region_name=AWS_REGION)
        
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=SQS_PAYMENT_QUEUE_URL,
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
                    if event_type == "BookingCreated":
                        booking_id = event_data.get("booking_id")
                        passenger_id = event_data.get("passenger_id")
                        seat_count = int(event_data.get("seat_count", 1))
                        
                        logger.info(f"Processing BookingCreated payment flow in AWS. Booking: {booking_id}")
                        mock_amount = float(seat_count * 600)
                        
                        payment_id = str(uuid.uuid4())
                        transaction_ref = f"tx_ref_{uuid.uuid4().hex[:8]}"
                        created_at = datetime.now(timezone.utc).isoformat()
                        
                        payment_item = {
                            "payment_id": payment_id,
                            "booking_id": booking_id,
                            "amount": mock_amount,
                            "payment_status": "SUCCEEDED",
                            "payment_method": "CREDIT_CARD_MOCK",
                            "transaction_reference": transaction_ref,
                            "created_at": created_at
                        }
                        
                        table = get_payments_table()
                        from decimal import Decimal
                        decimal_item = payment_item.copy()
                        decimal_item["amount"] = Decimal(str(mock_amount))
                        table.put_item(Item=decimal_item)
                        
                        logger.info(f"Payment recorded in AWS: {payment_id}")
                        
                        publish_event("PaymentCompleted", {
                            "payment_id": payment_id,
                            "booking_id": booking_id,
                            "amount": mock_amount,
                            "passenger_id": passenger_id,
                            "transaction_reference": transaction_ref
                        })
                        
                except Exception as parse_error:
                    logger.error(f"Error parsing SQS payment message body: {str(parse_error)}")
                    
                sqs.delete_message(QueueUrl=SQS_PAYMENT_QUEUE_URL, ReceiptHandle=receipt_handle)
                
        except Exception as e:
            logger.error(f"Error in SQS payment consumer: {str(e)}")
            time.sleep(5)

@app.on_event("startup")
def startup_event():
    # Start native AWS SQS Daemon
    t = threading.Thread(target=sqs_payment_consumer, daemon=True)
    t.start()

@app.get("/health", tags=["Utilities"])
def health_check():
    return {"status": "healthy", "service": "payment-service", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED, tags=["Payments"])
def process_payment(payment: PaymentCreate, current_user: dict = Depends(get_current_user)):
    table = get_payments_table()
    payment_id = str(uuid.uuid4())
    transaction_ref = f"tx_ref_{uuid.uuid4().hex[:8]}"
    created_at = datetime.now(timezone.utc).isoformat()
    
    payment_status = "SUCCEEDED"
    if payment.card_token == "tok_fail":
        payment_status = "FAILED"
        
    payment_item = {
        "payment_id": payment_id,
        "booking_id": payment.booking_id,
        "amount": float(payment.amount),
        "payment_status": payment_status,
        "payment_method": payment.payment_method,
        "transaction_reference": transaction_ref,
        "created_at": created_at
    }
    
    try:
        from decimal import Decimal
        decimal_item = payment_item.copy()
        decimal_item["amount"] = Decimal(str(payment_item["amount"]))
        table.put_item(Item=decimal_item)
        logger.info(f"Synchronous payment recorded in AWS: {payment_id} ({payment_status})")
        
        event_name = "PaymentCompleted" if payment_status == "SUCCEEDED" else "PaymentFailed"
        publish_event(event_name, {
            "payment_id": payment_id,
            "booking_id": payment.booking_id,
            "amount": float(payment.amount),
            "passenger_id": current_user.get("sub"),
            "transaction_reference": transaction_ref
        })
        
        return payment_item
    except Exception as e:
        logger.error(f"Error executing checkout transaction: {str(e)}")
        raise HTTPException(status_code=500, detail="Transaction processor communication failed")

@app.get("/payments/{payment_id}", response_model=PaymentOut, tags=["Payments"])
def get_payment_details(payment_id: str, current_user: dict = Depends(get_current_user)):
    table = get_payments_table()
    try:
        response = table.get_item(Key={"payment_id": payment_id})
        item = response.get("Item")
        if not item:
            raise HTTPException(status_code=404, detail="Invoice record not found")
            
        item["amount"] = float(item["amount"])
        return item
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching payment {payment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database lookup failed")

@app.patch("/payments/{payment_id}/status", response_model=PaymentOut, tags=["Payments"])
def patch_payment_status(payment_id: str, status_patch: PaymentStatusPatch, current_user: dict = Depends(get_current_user)):
    table = get_payments_table()
    
    try:
        response = table.update_item(
            Key={"payment_id": payment_id},
            UpdateExpression="SET payment_status = :ps",
            ExpressionAttributeValues={":ps": status_patch.payment_status},
            ReturnValues="ALL_NEW"
        )
        updated = response.get("Attributes")
        updated["amount"] = float(updated["amount"])
        logger.info(f"Payment {payment_id} status updated to {status_patch.payment_status}")
        
        event_name = "PaymentCompleted" if status_patch.payment_status == "SUCCEEDED" else "PaymentFailed"
        publish_event(event_name, {
            "payment_id": payment_id,
            "booking_id": updated["booking_id"],
            "amount": float(updated["amount"]),
            "transaction_reference": updated["transaction_reference"]
        })
        
        return updated
    except Exception as e:
        logger.error(f"Error updating payment record status: {str(e)}")
        raise HTTPException(status_code=500, detail="Database patch operation failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)
