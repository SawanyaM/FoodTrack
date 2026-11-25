
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Get MongoDB connection string
MONGODB_URL = os.getenv("MONGODB_URL")

print("MongoDB URL loaded:", MONGODB_URL is not None)
print("Using Atlas:", MONGODB_URL.startswith("mongodb+srv://") if MONGODB_URL else False)

# Connect to MongoDB
client = MongoClient(MONGODB_URL)

# Select database
db = client["food_expiry_db"]

# Select collections
foods_collection = db["foods"]
users_collection = db["users"]
food_waste_collection = db["food_waste"]

try:
    client.admin.command("ping")
    print("MongoDB connected successfully!")

except Exception as error:
    print("MongoDB connection failed!")
    print(error)
