from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BookingCreate(BaseModel):
    passenger_id: str
    flight_id: str
    seat_count: int = Field(..., gt=0)

class BookingStatusPatch(BaseModel):
    booking_status: str = Field(..., pattern="^(PENDING|SUCCESS|FAILED)$")
    payment_status: Optional[str] = Field(None, pattern="^(UNPAID|PAID|REFUNDED)$")

class BookingOut(BaseModel):
    booking_id: str
    passenger_id: str
    flight_id: str
    seat_count: int
    booking_status: str
    payment_status: str
    created_at: str
