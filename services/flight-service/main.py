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
from boto3.dynamodb.conditions import Key, Attr
import boto3

from db import get_flights_table
from schemas import (
    FlightCreate, FlightUpdate, FlightSeatsPatch, 
    FlightPricePatch, FlightSchedulePatch, FlightOut
)
from auth_utils import get_current_user, RoleChecker

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("flight-service")

app = FastAPI(
    title="AeroLink Flight Service",
    description="Microservice responsible for managing flight catalog, routing tables, and seat availability.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

admin_or_staff = RoleChecker(allowed_roles=["ADMIN", "STAFF"])

# Pure AWS SQS configurations
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
SQS_FLIGHT_QUEUE_URL = os.getenv("SQS_FLIGHT_SEATS_QUEUE_URL", "")

def sqs_flight_seats_consumer():
    """Background SQS daemon to listen to native AWS SQS BookingCreated events and decrease seats."""
    if not SQS_FLIGHT_QUEUE_URL:
        logger.warning("SQS_FLIGHT_SEATS_QUEUE_URL not defined. SQS consumer disabled.")
        return
        
    logger.info(f"Starting AWS native SQS consumer. Queue: {SQS_FLIGHT_QUEUE_URL}")
    sqs = boto3.client("sqs", region_name=AWS_REGION)
        
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=SQS_FLIGHT_QUEUE_URL,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=20 # Native SQS long polling
            )
            
            messages = response.get("Messages", [])
            for message in messages:
                receipt_handle = message["ReceiptHandle"]
                body_str = message["Body"]
                
                logger.info(f"Received message from AWS SQS: {body_str}")
                
                try:
                    body = json.loads(body_str)
                    # Support parsing EventBridge routing envelop
                    event_data = body.get("detail", body) if "detail" in body else body
                    
                    event_type = event_data.get("event_type")
                    if event_type == "BookingCreated":
                        flight_id = event_data.get("flight_id")
                        seat_count = int(event_data.get("seat_count", 0))
                        
                        logger.info(f"Decrementing available seats in AWS for flight {flight_id} by {seat_count}")
                        
                        table = get_flights_table()
                        table.update_item(
                            Key={"flight_id": flight_id},
                            UpdateExpression="ADD available_seats :dec",
                            ConditionExpression="available_seats >= :seats",
                            ExpressionAttributeValues={
                                ":dec": -seat_count,
                                ":seats": seat_count
                            }
                        )
                        logger.info(f"Successfully decremented {seat_count} seats for flight {flight_id}")
                            
                except Exception as parse_error:
                    logger.error(f"Error parsing AWS SQS flight seats message body: {str(parse_error)}")
                    
                sqs.delete_message(QueueUrl=SQS_FLIGHT_QUEUE_URL, ReceiptHandle=receipt_handle)
                
        except Exception as e:
            logger.error(f"Error in AWS SQS flight seats consumer loop: {str(e)}")
            time.sleep(5)

@app.on_event("startup")
def startup_event():
    # Start pure AWS SQS Daemon
    t = threading.Thread(target=sqs_flight_seats_consumer, daemon=True)
    t.start()

@app.get("/health", tags=["Utilities"])
def health_check():
    return {"status": "healthy", "service": "flight-service", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/flights", response_model=FlightOut, status_code=status.HTTP_201_CREATED, tags=["Flights"])
def create_flight(flight: FlightCreate, current_user: dict = Depends(admin_or_staff)):
    table = get_flights_table()
    flight_id = str(uuid.uuid4())
    
    flight_item = {
        "flight_id": flight_id,
        "flight_number": flight.flight_number,
        "origin": flight.origin.upper(),
        "destination": flight.destination.upper(),
        "departure_time": flight.departure_time,
        "arrival_time": flight.arrival_time,
        "price": float(flight.price),
        "total_seats": int(flight.total_seats),
        "available_seats": int(flight.available_seats),
        "status": flight.status
    }
    
    try:
        # Convert float to decimal for real DynamoDB compatibility
        from decimal import Decimal
        decimal_item = flight_item.copy()
        decimal_item["price"] = Decimal(str(flight_item["price"]))
        
        table.put_item(Item=decimal_item)
        logger.info(f"Flight {flight.flight_number} created successfully in AWS.")
        return flight_item
    except Exception as e:
        logger.error(f"Error saving flight record to AWS DynamoDB: {str(e)}")
        raise HTTPException(status_code=500, detail="Database write failed")

# Free-form airport city/country mapping dictionary
AIRPORT_MAP = {
    "JFK": ["JFK", "NEW YORK", "NYC", "UNITED STATES", "USA", "AMERICA"],
    "LHR": ["LHR", "LONDON", "HEATHROW", "UNITED KINGDOM", "UK", "ENGLAND", "GREAT BRITAIN"],
    "NRT": ["NRT", "TOKYO", "NARITA", "JAPAN", "TOKYO NARITA"],
    "ORD": ["ORD", "CHICAGO", "O'HARE", "UNITED STATES", "USA", "ILLINOIS"],
    "LAX": ["LAX", "LOS ANGELES", "CALIFORNIA", "USA", "UNITED STATES"],
    "LHE": ["LHE", "LAHORE", "ALLAMA IQBAL", "PAKISTAN"],
    "DXB": ["DXB", "DUBAI", "UNITED ARAB EMIRATES", "UAE"],
    "SIN": ["SIN", "SINGAPORE", "CHANGI"],
    "CDG": ["CDG", "PARIS", "CHARLES DE GAULLE", "FRANCE"]
}

def resolve_iata(search_str: Optional[str]) -> Optional[str]:
    """Helper to resolve free-form city/country names to 3-letter IATA codes."""
    if not search_str:
        return None
    
    s = search_str.strip().upper()
    if len(s) == 3:
        return s
        
    for iata, keywords in AIRPORT_MAP.items():
        for kw in keywords:
            if s in kw or kw in s:
                return iata
                
    return s

@app.get("/flights", response_model=List[FlightOut], tags=["Flights"])
def get_flights(
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
    date: Optional[str] = Query(None)
):
    table = get_flights_table()
    
    resolved_origin = resolve_iata(origin)
    resolved_destination = resolve_iata(destination)
    
    try:
        if resolved_origin and resolved_destination:
            response = table.query(
                IndexName="RouteIndex",
                KeyConditionExpression=Key("origin").eq(resolved_origin.upper()) & Key("destination").eq(resolved_destination.upper())
            )
            items = response.get("Items", [])
        else:
            response = table.scan()
            items = response.get("Items", [])
            
            if resolved_origin:
                items = [x for x in items if x["origin"] == resolved_origin.upper()]
            if resolved_destination:
                items = [x for x in items if x["destination"] == resolved_destination.upper()]
                
        if date:
            items = [x for x in items if x["departure_time"].startswith(date)]
            
        for x in items:
            x["price"] = float(x["price"])
            x["total_seats"] = int(x["total_seats"])
            x["available_seats"] = int(x["available_seats"])
            
        return items
    except Exception as e:
        logger.error(f"Error querying AWS DynamoDB FlightsTable: {str(e)}")
        raise HTTPException(status_code=500, detail="Database fetch failed")

@app.get("/flights/{flight_id}", response_model=FlightOut, tags=["Flights"])
def get_flight_by_id(flight_id: str):
    table = get_flights_table()
    try:
        response = table.get_item(Key={"flight_id": flight_id})
        item = response.get("Item")
        if not item:
            raise HTTPException(status_code=404, detail="Flight not found")
            
        item["price"] = float(item["price"])
        item["total_seats"] = int(item["total_seats"])
        item["available_seats"] = int(item["available_seats"])
        return item
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching flight {flight_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database lookup error")

@app.put("/flights/{flight_id}", response_model=FlightOut, tags=["Flights"])
def update_flight(flight_id: str, flight: FlightUpdate, current_user: dict = Depends(admin_or_staff)):
    table = get_flights_table()
    
    response = table.get_item(Key={"flight_id": flight_id})
    if not response.get("Item"):
        raise HTTPException(status_code=404, detail="Flight not found")
        
    updated_item = {
        "flight_id": flight_id,
        "flight_number": flight.flight_number,
        "origin": flight.origin.upper(),
        "destination": flight.destination.upper(),
        "departure_time": flight.departure_time,
        "arrival_time": flight.arrival_time,
        "price": float(flight.price),
        "total_seats": int(flight.total_seats),
        "available_seats": int(flight.available_seats),
        "status": flight.status
    }
    
    try:
        from decimal import Decimal
        decimal_item = updated_item.copy()
        decimal_item["price"] = Decimal(str(updated_item["price"]))
        
        table.put_item(Item=decimal_item)
        logger.info(f"Flight {flight_id} updated in AWS by {current_user.get('email')}")
        return updated_item
    except Exception as e:
        logger.error(f"Error updating flight {flight_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database update failed")

@app.patch("/flights/{flight_id}/seats", response_model=FlightOut, tags=["Flights"])
def patch_flight_seats(flight_id: str, seat_patch: FlightSeatsPatch, current_user: dict = Depends(get_current_user)):
    table = get_flights_table()
    
    try:
        response = table.update_item(
            Key={"flight_id": flight_id},
            UpdateExpression="SET available_seats = available_seats - :res",
            ConditionExpression="available_seats >= :res",
            ExpressionAttributeValues={":res": seat_patch.seats_to_reserve},
            ReturnValues="ALL_NEW"
        )
        updated = response.get("Attributes")
        updated["price"] = float(updated["price"])
        updated["total_seats"] = int(updated["total_seats"])
        updated["available_seats"] = int(updated["available_seats"])
        return updated
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        raise HTTPException(status_code=400, detail="Not enough seats available on this flight")
    except Exception as e:
        logger.error(f"Error patching seats for flight {flight_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database patch failed")

@app.patch("/flights/{flight_id}/price", response_model=FlightOut, tags=["Flights"])
def patch_flight_price(flight_id: str, price_patch: FlightPricePatch, current_user: dict = Depends(admin_or_staff)):
    table = get_flights_table()
    
    try:
        response = table.update_item(
            Key={"flight_id": flight_id},
            UpdateExpression="SET price = :p",
            ExpressionAttributeValues={":p": float(price_patch.price)},
            ReturnValues="ALL_NEW"
        )
        updated = response.get("Attributes")
        updated["price"] = float(updated["price"])
        updated["total_seats"] = int(updated["total_seats"])
        updated["available_seats"] = int(updated["available_seats"])
        return updated
    except Exception as e:
        logger.error(f"Error patching price for flight {flight_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database patch failed")

@app.patch("/flights/{flight_id}/schedule", response_model=FlightOut, tags=["Flights"])
def patch_flight_schedule(flight_id: str, schedule_patch: FlightSchedulePatch, current_user: dict = Depends(admin_or_staff)):
    table = get_flights_table()
    
    update_expr = "SET departure_time = :dt, arrival_time = :at"
    expr_vals = {
        ":dt": schedule_patch.departure_time,
        ":at": schedule_patch.arrival_time
    }
    
    if schedule_patch.status:
        update_expr += ", #s = :status"
        expr_vals[":status"] = schedule_patch.status
        expr_attr_names = {"#s": "status"}
    else:
        expr_attr_names = None
        
    try:
        kwargs = {
            "Key": {"flight_id": flight_id},
            "UpdateExpression": update_expr,
            "ExpressionAttributeValues": expr_vals,
            "ReturnValues": "ALL_NEW"
        }
        if expr_attr_names:
            kwargs["ExpressionAttributeNames"] = expr_attr_names
            
        response = table.update_item(**kwargs)
        updated = response.get("Attributes")
        updated["price"] = float(updated["price"])
        updated["total_seats"] = int(updated["total_seats"])
        updated["available_seats"] = int(updated["available_seats"])
        return updated
    except Exception as e:
        logger.error(f"Error patching schedule for flight {flight_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database patch failed")

@app.delete("/flights/{flight_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Flights"])
def delete_flight(flight_id: str, current_user: dict = Depends(admin_or_staff)):
    table = get_flights_table()
    
    response = table.get_item(Key={"flight_id": flight_id})
    if not response.get("Item"):
        raise HTTPException(status_code=404, detail="Flight not found")
        
    try:
        table.delete_item(Key={"flight_id": flight_id})
        logger.info(f"Flight {flight_id} deleted from AWS by {current_user.get('email')}")
        return
    except Exception as e:
        logger.error(f"Error deleting flight {flight_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database delete failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
