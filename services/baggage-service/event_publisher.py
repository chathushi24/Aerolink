import os
import json
import logging
import boto3
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("baggage-event-publisher")

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
EVENT_BUS_NAME = os.getenv("EVENT_BUS_NAME", "dev-aerolink-event-bus")

# Native AWS EventBridge client
eb_client = boto3.client("events", region_name=AWS_REGION)

def publish_event(event_type: str, detail: dict):
    logger.info(f"Publishing baggage event {event_type} to EventBridge: {json.dumps(detail)}")
    
    enriched_detail = detail.copy()
    enriched_detail["event_type"] = event_type
    enriched_detail["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    try:
        response = eb_client.put_events(
            Entries=[
                {
                    "Source": "aerolink.baggage-service",
                    "DetailType": event_type,
                    "Detail": json.dumps(enriched_detail),
                    "EventBusName": EVENT_BUS_NAME
                }
            ]
        )
        logger.info(f"Successfully published baggage event to EventBridge. Response: {json.dumps(response)}")
        return response
    except Exception as e:
        logger.error(f"EventBridge failed for baggage: {str(e)}")
        raise e
