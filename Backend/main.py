from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from foods import router as food_router
from recipes import router as recipe_router
from users import router as user_router, admin_router
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Food Expiry and Recipe Recommendation System")
# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(food_router)
app.include_router(recipe_router)
app.include_router(user_router)
app.include_router(admin_router)

@app.get("/")
def home():
    return{
        "message": "Welcome to Food Expiry and Recipe Recommendation System!"
    }