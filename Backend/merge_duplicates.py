from database import foods_collection

# Find all food items
foods = foods_collection.find()

# Store processed food combinations
processed = set()

for food in foods:

    key = (
        food["name"],
        food["category"],
        food["expiry_date"],
        food["unit"]
    )

    if key in processed:
        continue

    processed.add(key)

    # Find all matching duplicate records
    matching_foods = list(foods_collection.find({
        "name": food["name"],
        "category": food["category"],
        "expiry_date": food["expiry_date"],
        "unit": food["unit"]
    }).sort("_id", 1))

    if len(matching_foods) > 1:

        # Keep the first record
        main_food = matching_foods[0]

        # Calculate the total quantity
        total_quantity = sum(
            item["quantity"] for item in matching_foods
        )

        # Update the first record
        foods_collection.update_one(
            {"_id": main_food["_id"]},
            {"$set": {"quantity": total_quantity}}
        )

        # Delete the duplicate records
        for duplicate in matching_foods[1:]:
            foods_collection.delete_one(
                {"_id": duplicate["_id"]}
            )

        print(
            food["name"],
            food["expiry_date"],
            "merged successfully:",
            total_quantity,
            food["unit"]
        )

print("Duplicate food records merged successfully!")