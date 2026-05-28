from pydantic import BaseModel
from datetime import datetime

class NotificationOut(BaseModel):
    notification_id: str
    user_id: str
    event_type: str
    message: str
    created_at: str
