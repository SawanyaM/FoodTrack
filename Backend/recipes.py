# Step 1: Import required libraries

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import date
from bson import ObjectId 

# Import the MongoDB database
from database import db, foods_collection


# Step 2: Create a recipe API router
router = APIRouter()


# Step 3: Select the recipes collection
recipes_collection = db["recipes"]

# Step 3: Define the Recipe data model

class Recipe(BaseModel):

    # Store the recipe name
    name: str

    # Store the main ingredient used in the recipe
    main_ingredient: str

    # Store all required ingredients
    ingredients: List[str]

    # Store cooking instructions
    instructions: List[str]

    # Store the cooking time in minutes
    cooking_time: int

    # Store the recipe image URL
    image_url: str

    # Step 4: Add a new recipe to MongoDB

@router.post("/recipes")
def add_recipe(recipe: Recipe):

    # Convert the recipe data into a dictionary
    recipe_data = recipe.model_dump()

    # Insert the recipe into MongoDB
    result = recipes_collection.insert_one(recipe_data)

    # Return a success message
    return {
        "message": "Recipe added successfully!",
        "recipe_id": str(result.inserted_id)
    }

# Step 5: Get all recipes from MongoDB

@router.get("/recipes")
def get_all_recipes():

    # Retrieve all recipes from MongoDB
    recipes = list(recipes_collection.find())

    # Convert MongoDB ObjectId into string
    for recipe in recipes:
        recipe["_id"] = str(recipe["_id"])

    # Return all recipes
    return recipes

# Step 6: Get user's available food ingredients

@router.get("/recipes/recommendations")
def get_recipe_recommendations():

    # Retrieve all food items from the user's inventory
    available_foods = list(foods_collection.find())

   # Extract unique food names from the database
    available_ingredients = list(set(
    food["name"].strip().lower()
    for food in available_foods
    ))

    # Create a list to store ingredients that are expiring soon
    expiring_ingredients = []

    # Check the expiry date of each food item
    for food in available_foods:

        # Convert the expiry date string into a date object
        expiry_date = date.fromisoformat(food["expiry_date"])

        # Calculate the remaining days
        remaining_days = (expiry_date - date.today()).days

        # Check whether the food expires within 7 days
        if 0 <= remaining_days <= 7:

            # Add the food name to the expiring ingredients list
            expiring_ingredients.append(
                food["name"].strip().lower()
            )

    # Retrieve all recipes from MongoDB
    all_recipes = list(recipes_collection.find())

    # Create a list to store recommended recipes
    recommended_recipes = []

    # Check each recipe
    for recipe in all_recipes:

        # Get all required ingredients of the recipe
        recipe_ingredients = recipe.get("ingredients", [])

        # Find ingredients already available
        matched_ingredients = [
            ingredient for ingredient in recipe_ingredients
            if ingredient.strip().lower() in available_ingredients
        ]

        # Recommend the recipe if at least one ingredient matches
        if matched_ingredients:

            # Find ingredients that are missing
            missing_ingredients = [
                ingredient for ingredient in recipe_ingredients
                if ingredient.strip().lower() not in available_ingredients
            ]

            # Find ingredients that are expiring soon
            expiring_matched_ingredients = [
                ingredient for ingredient in matched_ingredients
                if ingredient.strip().lower() in expiring_ingredients
            ]

            # Convert MongoDB ID into string
            recipe["_id"] = str(recipe["_id"])

            # Add recipe details to the recommendation list
            recommended_recipes.append({
                "recipe": recipe,
                "available_ingredients": matched_ingredients,
                "missing_ingredients": missing_ingredients,
                "expiring_ingredients": expiring_matched_ingredients,
                "priority_score": len(expiring_matched_ingredients)
            })

            # Sort recipes by expiry priority
            recommended_recipes.sort(
             key=lambda item: item["priority_score"],
             reverse=True
            )

    # Return recommended recipes
    return {
        "recommended_recipes": recommended_recipes
    }

# Step 7: Get details of a selected recipe

@router.get("/recipes/{recipe_id}")
def get_recipe_details(recipe_id: str):

    # Validate the recipe ID
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid recipe ID"
        )

    # Find the selected recipe in MongoDB
    recipe = recipes_collection.find_one({
        "_id": ObjectId(recipe_id)
    })

    # Check whether the recipe exists
    if recipe is None:
        raise HTTPException(
            status_code=404,
            detail="Recipe not found"
        )

    # Convert MongoDB ObjectId into string
    recipe["_id"] = str(recipe["_id"])

    # Return the selected recipe details
    return recipe

# Step 8: Update an existing recipe

@router.put("/recipes/{recipe_id}")
def update_recipe(recipe_id: str, recipe: Recipe):

    # Validate the recipe ID
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid recipe ID"
        )

    # Update the recipe in MongoDB
    result = recipes_collection.update_one(
        {"_id": ObjectId(recipe_id)},
        {"$set": recipe.model_dump()}
    )

    # Check whether the recipe exists
    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Recipe not found"
        )

    return {
        "message": "Recipe updated successfully!"
    }


# Step 9: Delete an existing recipe

@router.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: str):

    # Validate the recipe ID
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid recipe ID"
        )

    # Delete the recipe from MongoDB
    result = recipes_collection.delete_one({
        "_id": ObjectId(recipe_id)
    })

    # Check whether the recipe exists
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Recipe not found"
        )

    return {
        "message": "Recipe deleted successfully!"
    }