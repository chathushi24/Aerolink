import os
import json
import logging
import boto3
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("event-publisher")

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
EVENT_BUS_NAME = os.getenv("EVENT_BUS_NAME", "dev-aerolink-event-bus")

# Native AWS EventBridge client
eb_client = boto3.client("events", region_name=AWS_REGION)

def publish_event(event_type: str, detail: dict):
    """Publishes operational event notifications to Amazon EventBridge natively in AWS."""
    logger.info(f"Publishing event {event_type} to EventBridge: {json.dumps(detail)}")
    
    enriched_detail = detail.copy()
    enriched_detail["event_type"] = event_type
    enriched_detail["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    try:
        response = eb_client.put_events(
            Entries=[
                {
                    "Source": "aerolink.booking-service",
                    "DetailType": event_type,
                    "Detail": json.dumps(enriched_detail),
                    "EventBusName": EVENT_BUS_NAME
                }
            ]
        )
        logger.info(f"Successfully published event to EventBridge. Response: {json.dumps(response)}")
        return response
    except Exception as eb_err:
        logger.error(f"EventBridge publishing failed: {str(eb_err)}")
        raise eb_err
