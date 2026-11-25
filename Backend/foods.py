
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from bson import ObjectId
from bson.errors import InvalidId

from database import foods_collection, food_waste_collection

router = APIRouter()


# Food data model
class Food(BaseModel):
    name: str
    category: str
    expiry_date: date
    quantity: float
    unit: str
    price: float = Field(default=0, ge=0)


# Automatically move expired foods into Food Waste Tracking
def archive_expired_foods():

    today = date.today()

    food_items = list(foods_collection.find())

    for food in food_items:

        expiry_date = date.fromisoformat(food["expiry_date"])

        if expiry_date < today:

            food_id = str(food["_id"])

            # Check whether this food was already archived
            existing_waste = food_waste_collection.find_one({
                "original_food_id": food_id
            })

            if not existing_waste:

                waste_data = {
                    "original_food_id": food_id,
                    "name": food["name"],
                    "category": food.get("category", ""),
                    "expiry_date": food["expiry_date"],
                    "quantity": food.get("quantity", 0),
                    "unit": food.get("unit", ""),
                    "price": food.get("price", 0),
                    "price_recorded": "price" in food,
                    "wasted_at": datetime.now()
                }

                # Save the expired food in waste collection
                food_waste_collection.insert_one(waste_data)

            # Remove the expired food from active foods
            foods_collection.delete_one({"_id": food["_id"]})


# Add food items
@router.post("/foods")
def add_food(food: Food):

    food_data = food.model_dump()

    food_data["expiry_date"] = food.expiry_date.isoformat()

    # Check whether the same food item already exists
    existing_food = foods_collection.find_one({
        "name": food_data["name"],
        "category": food_data["category"],
        "expiry_date": food_data["expiry_date"],
        "unit": food_data["unit"]
    })

    if existing_food:

        new_quantity = existing_food.get("quantity", 0) + food_data["quantity"]
        new_price = existing_food.get("price", 0) + food_data["price"]

        foods_collection.update_one(
            {"_id": existing_food["_id"]},
            {
                "$inc": {
                    "quantity": food_data["quantity"],
                    "price": food_data["price"]
                }
            }
        )

        return {
            "message": "Food quantity and price updated successfully!",
            "food_id": str(existing_food["_id"]),
            "food": {
                "name": food_data["name"],
                "category": food_data["category"],
                "expiry_date": food_data["expiry_date"],
                "quantity": new_quantity,
                "unit": food_data["unit"],
                "price": new_price
            }
        }

    else:

        result = foods_collection.insert_one(food_data)

        return {
            "message": "Food added successfully!",
            "food_id": str(result.inserted_id),
            "food": {
                "name": food_data["name"],
                "category": food_data["category"],
                "expiry_date": food_data["expiry_date"],
                "quantity": food_data["quantity"],
                "unit": food_data["unit"],
                "price": food_data["price"]
            }
        }


# Get all active food items
@router.get("/foods")
def get_foods():

    archive_expired_foods()

    food_items = list(foods_collection.find())

    for food in food_items:
        food["_id"] = str(food["_id"])

    return food_items


# Update food items
@router.put("/foods/{food_id}")
def update_food(food_id: str, food: Food):

    try:
        object_id = ObjectId(food_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid food ID")

    food_data = food.model_dump()

    food_data["expiry_date"] = food.expiry_date.isoformat()

    result = foods_collection.update_one(
        {"_id": object_id},
        {"$set": food_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Food not found")

    return {
        "message": "Food updated successfully!",
        "food_id": food_id,
        "food": food_data
    }


# Delete food items
@router.delete("/foods/{food_id}")
def delete_food(food_id: str):

    try:
        object_id = ObjectId(food_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid food ID")

    result = foods_collection.delete_one({"_id": object_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Food not found")

    return {
        "message": "Food deleted successfully!",
        "food_id": food_id
    }


# Get food expiry status
@router.get("/foods/expiry-status")
def get_expiry_status():

    archive_expired_foods()

    food_items = list(foods_collection.find())

    today = date.today()

    results = []

    for food in food_items:

        expiry_date = date.fromisoformat(food["expiry_date"])

        remaining_days = (expiry_date - today).days

        if remaining_days <= 3:
            status = "Expiring Soon"
        else:
            status = "Fresh"

        results.append({
            "food_id": str(food["_id"]),
            "name": food["name"],
            "expiry_date": food["expiry_date"],
            "remaining_days": remaining_days,
            "status": status
        })

    return results


# Get food items expiring within 7 days
@router.get("/foods/expiring-soon")
def get_expiring_soon_foods():

    archive_expired_foods()

    food_items = list(foods_collection.find())

    today = date.today()

    results = []

    for food in food_items:

        expiry_date = date.fromisoformat(food["expiry_date"])

        remaining_days = (expiry_date - today).days

        if 0 <= remaining_days <= 7:

            results.append({
                "food_id": str(food["_id"]),
                "name": food["name"],
                "expiry_date": food["expiry_date"],
                "remaining_days": remaining_days,
                "status": "Expiring Soon"
            })

    return results


# Get expired foods from Food Waste Tracking
@router.get("/foods/expired")
def get_expired_foods():

    archive_expired_foods()

    waste_items = list(food_waste_collection.find())

    results = []

    for food in waste_items:

        results.append({
            "food_id": str(food.get("original_food_id", "")),
            "name": food["name"],
            "expiry_date": food["expiry_date"],
            "remaining_days": (
                date.fromisoformat(food["expiry_date"]) - date.today()
            ).days,
            "status": "Expired"
        })

    return results


# Get all food waste records
@router.get("/food-waste")
def get_food_waste():

    archive_expired_foods()

    waste_items = list(
        food_waste_collection.find().sort("wasted_at", -1)
    )

    for food in waste_items:

        food["_id"] = str(food["_id"])

        if isinstance(food.get("wasted_at"), datetime):
            food["wasted_at"] = food["wasted_at"].isoformat()

    return waste_items


# Get monthly food waste summary
@router.get("/food-waste/monthly-summary")
def get_monthly_waste_summary(
    year: Optional[int] = None,
    month: Optional[int] = None
):

    archive_expired_foods()

    today = date.today()

    selected_year = year if year is not None else today.year
    selected_month = month if month is not None else today.month

    if selected_month < 1 or selected_month > 12:
        raise HTTPException(
            status_code=400,
            detail="Month must be between 1 and 12"
        )

    if selected_year < 1:
        raise HTTPException(
            status_code=400,
            detail="Invalid year"
        )

    start_date = datetime(selected_year, selected_month, 1)

    if selected_month == 12:
        end_date = datetime(selected_year + 1, 1, 1)
    else:
        end_date = datetime(selected_year, selected_month + 1, 1)

    waste_items = list(food_waste_collection.find({
        "wasted_at": {
            "$gte": start_date,
            "$lt": end_date
        }
    }))

    # Use Decimal to avoid floating-point calculation errors
    total_waste_amount = Decimal("0.00")
    recorded_price_items = 0
    unrecorded_price_items = 0

    for food in waste_items:

        if food.get("price_recorded", "price" in food):

            price = Decimal(str(food.get("price", 0)))
            total_waste_amount += price
            recorded_price_items += 1

        else:
            unrecorded_price_items += 1

    return {
        "year": selected_year,
        "month": selected_month,
        "total_wasted_items": len(waste_items),
        "total_waste_amount": float(
            total_waste_amount.quantize(Decimal("0.01"))
        ),
        "recorded_price_items": recorded_price_items,
        "unrecorded_price_items": unrecorded_price_items
    }


# Dashboard summary
@router.get("/dashboard/summary")
def get_dashboard_summary():

    archive_expired_foods()

    food_items = list(foods_collection.find())

    today = date.today()

    total_foods = len(food_items)
    safe_foods = 0
    expiring_soon = 0

    for food in food_items:

        expiry_date = date.fromisoformat(food["expiry_date"])

        remaining_days = (expiry_date - today).days

        if remaining_days <= 7:
            expiring_soon += 1
        else:
            safe_foods += 1

    expired_foods = food_waste_collection.count_documents({})

    return {
        "total_foods": total_foods,
        "safe_foods": safe_foods,
        "expiring_soon": expiring_soon,
        "expired_foods": expired_foods
    }
