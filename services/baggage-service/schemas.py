from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BaggageCreate(BaseModel):
    booking_id: str
    passenger_id: str
    current_status: str = Field("CHECKED_IN", pattern="^(CHECKED_IN|SORTING|IN_TRANSIT|ARRIVED|CLAIMED)$")
    location: str = Field("DEPARTURE_DESK", min_length=2)

class BaggageStatusPatch(BaseModel):
    current_status: str = Field(..., pattern="^(CHECKED_IN|SORTING|IN_TRANSIT|ARRIVED|CLAIMED)$")
    location: str = Field(..., min_length=2)

class BaggageOut(BaseModel):
    baggage_id: str
    booking_id: str
    passenger_id: str
    current_status: str
    last_updated: str
    location: str
class BaggageListOut(BaseModel):
    bags: list[BaggageOut]
