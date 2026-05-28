import uuid
from datetime import datetime, timezone
import logging
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from boto3.dynamodb.conditions import Key

from db import get_users_table
from schemas import UserRegister, UserLogin, Token, UserOut, ProfileOut
from auth_utils import hash_password, verify_password, create_access_token, get_current_user

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("auth-service")

app = FastAPI(
    title="AeroLink Auth Service",
    description="Identity and access management microservice for AeroLink Airline Systems Platform.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Utilities"])
def health_check():
    return {"status": "healthy", "service": "auth-service", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register_user(user: UserRegister):
    table = get_users_table()
    
    try:
        response = table.query(
            IndexName="EmailIndex",
            KeyConditionExpression=Key("email").eq(user.email)
        )
        if response.get("Items"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    except Exception as e:
        logger.error(f"Error querying table for email registration: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    password_hash = hash_password(user.password)
    
    user_item = {
        "user_id": user_id,
        "name": user.name,
        "email": user.email,
        "password_hash": password_hash,
        "role": user.role,
        "created_at": created_at
    }
    
    try:
        table.put_item(Item=user_item)
        logger.info(f"User {user.email} successfully registered with role {user.role}")
        return {
            "user_id": user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": created_at
        }
    except Exception as e:
        logger.error(f"Error inserting user item into DynamoDB: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save user data to database."
        )

@app.post("/auth/login", response_model=Token, tags=["Authentication"])
def login_user(credentials: UserLogin):
    table = get_users_table()
    
    try:
        response = table.query(
            IndexName="EmailIndex",
            KeyConditionExpression=Key("email").eq(credentials.email)
        )
        items = response.get("Items", [])
        if not items:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        user_record = items[0]
        if not verify_password(credentials.password, user_record["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
            
        access_token = create_access_token(
            data={
                "sub": user_record["user_id"],
                "email": user_record["email"],
                "role": user_record["role"],
                "name": user_record["name"]
            }
        )
        logger.info(f"User {credentials.email} successfully logged in.")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user_record["role"]
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error performing login query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error communicating with database"
        )

@app.get("/auth/profile", response_model=ProfileOut, tags=["Authentication"])
def get_user_profile(current_user: dict = Depends(get_current_user)):
    table = get_users_table()
    user_id = current_user.get("sub")
    
    try:
        response = table.get_item(Key={"user_id": user_id})
        item = response.get("Item")
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return {
            "user_id": item["user_id"],
            "name": item["name"],
            "email": item["email"],
            "role": item["role"],
            "created_at": item["created_at"]
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve user profile from database"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
