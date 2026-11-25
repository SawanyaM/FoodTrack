
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from database import users_collection
from pymongo.errors import DuplicateKeyError

import hashlib
import secrets
import re
import hmac


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

# Admin API router
admin_router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

# User registration data model
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str
    phone_number: str = Field(..., min_length=11, max_length=12)
    password: str = Field(..., min_length=6)


# User login data model
class UserLogin(BaseModel):
    email: str
    password: str


# Hash password securely before storing it
def hash_password(password):
    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        310000
    )

    return salt.hex(), password_hash.hex()


# Register a new user
@router.post("/register")
def register_user(user: UserRegister):

    email = user.email.strip().lower()

    email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

    if not re.match(email_pattern, email):
        raise HTTPException(
            status_code=400,
            detail="Invalid email address!"
        )

    phone_number = user.phone_number.strip()

    if not phone_number.isdigit():
        raise HTTPException(
            status_code=400,
            detail="Invalid phone number!"
        )

    existing_user = users_collection.find_one({
        "email": email
    })

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered. Please use another email."
        )

    salt, password_hash = hash_password(user.password)

    new_user = {
        "full_name": user.full_name.strip(),
        "email": email,
        "phone_number": phone_number,
        "password_hash": password_hash,
        "password_salt": salt,
        "role": "user"
    }

    try:
        result = users_collection.insert_one(new_user)

    except DuplicateKeyError:
        raise HTTPException(
            status_code=400,
            detail="Email already registered. Please use another email."
        )

    return {
        "message": "User registered successfully!",
        "user_id": str(result.inserted_id),
        "role": "user"
    }


# Verify the entered password
def verify_password(password, stored_salt, stored_hash):

    salt = bytes.fromhex(stored_salt)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        310000
    )

    return hmac.compare_digest(
        password_hash.hex(),
        stored_hash
    )


# Login an existing user
@router.post("/login")
def login_user(user: UserLogin):

    email = user.email.strip().lower()

    existing_user = users_collection.find_one({
        "email": email
    })

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="Email not registered!"
        )

    password_correct = verify_password(
        user.password,
        existing_user["password_salt"],
        existing_user["password_hash"]
    )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Incorrect password!"
        )

    # Get user role
    role = existing_user.get("role", "user")

    return {
        "message": "Login successful!",
        "user_id": str(existing_user["_id"]),
        "full_name": existing_user["full_name"],
        "phone_number": existing_user.get("phone_number", ""),
        "role": role
    }

# Get all registered users for Admin Dashboard
@admin_router.get("/users")
def get_all_users():

    users = list(users_collection.find(
        {},
        {
            "_id": 1,
            "full_name": 1,
            "email": 1,
            "phone_number": 1,
            "role": 1
        }
    ))

    for user in users:
        user["_id"] = str(user["_id"])

    return users
