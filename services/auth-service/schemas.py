from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field("PASSENGER", pattern="^(PASSENGER|STAFF|ADMIN)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserOut(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    role: str
    created_at: str

class ProfileOut(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    role: str
    created_at: str
