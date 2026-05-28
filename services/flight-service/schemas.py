from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class FlightCreate(BaseModel):
    flight_number: str = Field(..., min_length=2, max_length=10)
    origin: str = Field(..., min_length=3, max_length=3)  # IATA Code
    destination: str = Field(..., min_length=3, max_length=3)
    departure_time: str
    arrival_time: str
    price: float = Field(..., gt=0)
    total_seats: int = Field(..., gt=0)
    available_seats: int = Field(..., ge=0)
    status: str = Field("SCHEDULED", pattern="^(SCHEDULED|DELAYED|DEPARTED|CANCELLED)$")

class FlightUpdate(BaseModel):
    flight_number: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    price: float
    total_seats: int
    available_seats: int
    status: str

class FlightSeatsPatch(BaseModel):
    seats_to_reserve: int = Field(..., ge=1)

class FlightPricePatch(BaseModel):
    price: float = Field(..., gt=0)

class FlightSchedulePatch(BaseModel):
    departure_time: str
    arrival_time: str
    status: Optional[str] = None

class FlightOut(BaseModel):
    flight_id: str
    flight_number: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    price: float
    total_seats: int
    available_seats: int
    status: str
