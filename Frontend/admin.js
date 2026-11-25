
const API_URL = "http://127.0.0.1:8000";

let editingRecipeId = null;


// Check admin access
function checkAdminAccess() {

    const userRole = localStorage.getItem("foodTrackRole");

    if (userRole !== "admin") {
        alert("Access denied! Admin account required.");
        window.location.href = "index.html";
        return false;
    }

    return true;
}


// Show selected admin section
function showAdminSection(sectionId, button) {

    document.querySelectorAll(".admin-section").forEach(section => {
        section.style.display = "none";
    });

    const selectedSection = document.getElementById(sectionId);

    if (selectedSection) {
        selectedSection.style.display = "block";
    }

    document.querySelectorAll(".admin-nav button").forEach(navButton => {
        navButton.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    if (sectionId === "dashboardSection") loadAdminDashboard();
    if (sectionId === "recipesSection") loadAdminRecipes();
    if (sectionId === "foodsSection") loadAdminFoods();
    if (sectionId === "usersSection") loadAdminUsers();
}


// Load dashboard statistics
async function loadAdminDashboard() {

    try {

        const [foodsResponse, usersResponse, recipesResponse] =
            await Promise.all([
                fetch(`${API_URL}/foods`),
                fetch(`${API_URL}/admin/users`),
                fetch(`${API_URL}/recipes`)
            ]);

        if (!foodsResponse.ok || !usersResponse.ok || !recipesResponse.ok) {
            throw new Error("Unable to load dashboard information.");
        }

        const foods = await foodsResponse.json();
        const users = await usersResponse.json();
        const recipes = await recipesResponse.json();

        document.getElementById("totalFoods").textContent = foods.length;
        document.getElementById("totalUsers").textContent = users.length;
        document.getElementById("totalRecipes").textContent = recipes.length;

    } catch (error) {

        console.error("Dashboard error:", error);

    }
}


// Reset recipe form
function resetRecipeForm() {

    document.getElementById("recipeForm").reset();

    editingRecipeId = null;

    document.querySelector("#recipeFormContainer h3").textContent =
        "Add New Recipe";

    document.querySelector("#recipeForm button[type='submit']").textContent =
        "Save Recipe";
}


// Show recipe form for adding
function showRecipeForm() {

    resetRecipeForm();

    document.getElementById("recipeFormContainer").style.display = "block";

}


// Hide recipe form
function hideRecipeForm() {

    document.getElementById("recipeFormContainer").style.display = "none";

    resetRecipeForm();

}


// Add or update recipe
document.getElementById("recipeForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const recipeData = {

        name: document.getElementById("recipeName").value.trim(),

        image_url: document.getElementById("recipeImage").value.trim(),

        main_ingredient: document.getElementById("mainIngredient").value.trim(),

        ingredients: document.getElementById("recipeIngredients")
            .value.split("\n")
            .map(item => item.trim())
            .filter(item => item !== ""),

        instructions: document.getElementById("recipeInstructions")
            .value.split("\n")
            .map(item => item.trim())
            .filter(item => item !== ""),

        cooking_time: Number(document.getElementById("cookTime").value)

    };

    const isEditing = editingRecipeId !== null;

    const url = isEditing
        ? `${API_URL}/recipes/${editingRecipeId}`
        : `${API_URL}/recipes`;

    try {

        const response = await fetch(url, {

            method: isEditing ? "PUT" : "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(recipeData)

        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Unable to save recipe.");
        }

        alert(isEditing
            ? "Recipe updated successfully!"
            : "Recipe added successfully!"
        );

        hideRecipeForm();

        await loadAdminRecipes();
        await loadAdminDashboard();

    } catch (error) {

        alert(error.message);

        console.error("Recipe saving error:", error);

    }

});


// Load all recipes
async function loadAdminRecipes() {

    const recipeList = document.getElementById("adminRecipeList");

    recipeList.textContent = "Loading recipes...";

    try {

        const response = await fetch(`${API_URL}/recipes`);

        if (!response.ok) {
            throw new Error("Failed to load recipes.");
        }

        const recipes = await response.json();

        recipeList.innerHTML = "";

        if (recipes.length === 0) {
            recipeList.textContent = "No recipes available.";
            return;
        }

        recipes.forEach(recipe => {

            const card = document.createElement("div");
            card.className = "admin-data-card";

            // Recipe name
            const name = document.createElement("h3");
            name.textContent = recipe.name || "Recipe";
            card.appendChild(name);

            // Recipe image
            if (recipe.image_url) {

                const image = document.createElement("img");

                image.src = recipe.image_url;
                image.alt = recipe.name || "Recipe image";

                image.style.width = "180px";
                image.style.height = "140px";
                image.style.objectFit = "cover";
                image.style.borderRadius = "10px";
                image.style.marginBottom = "15px";

                image.onerror = function() {
                    this.style.display = "none";
                };

                card.appendChild(image);
            }

            // Main ingredient
            const mainIngredient = document.createElement("p");

            const mainLabel = document.createElement("strong");
            mainLabel.textContent = "Main Ingredient: ";

            mainIngredient.appendChild(mainLabel);
            mainIngredient.appendChild(
                document.createTextNode(recipe.main_ingredient || "N/A")
            );

            card.appendChild(mainIngredient);

            // Ingredients
            const ingredientsTitle = document.createElement("h4");
            ingredientsTitle.textContent = "Ingredients";
            card.appendChild(ingredientsTitle);

            const ingredientsList = document.createElement("ul");

            (recipe.ingredients || []).forEach(ingredient => {

                const item = document.createElement("li");
                item.textContent = ingredient;
                ingredientsList.appendChild(item);

            });

            card.appendChild(ingredientsList);

            // Instructions
            const instructionsTitle = document.createElement("h4");
            instructionsTitle.textContent = "Instructions";
            card.appendChild(instructionsTitle);

            const instructionsList = document.createElement("ol");

            (recipe.instructions || []).forEach(instruction => {

                const item = document.createElement("li");
                item.textContent = instruction;
                instructionsList.appendChild(item);

            });

            card.appendChild(instructionsList);

            // Cooking time
            const cookingTime = document.createElement("p");

            const timeLabel = document.createElement("strong");
            timeLabel.textContent = "Cooking Time: ";

            cookingTime.appendChild(timeLabel);
            cookingTime.appendChild(
                document.createTextNode(
                    `${recipe.cooking_time ?? "N/A"} minutes`
                )
            );

            card.appendChild(cookingTime);

            // Edit button
            const editButton = document.createElement("button");

            editButton.textContent = "Edit Recipe";
            editButton.type = "button";

            editButton.style.backgroundColor = "#3F7D58";
            editButton.style.color = "white";
            editButton.style.padding = "10px 18px";
            editButton.style.border = "none";
            editButton.style.borderRadius = "6px";
            editButton.style.cursor = "pointer";
            editButton.style.marginRight = "10px";

            editButton.addEventListener("click", function() {
                editRecipe(recipe);
            });

            card.appendChild(editButton);

            // Delete button
            const deleteButton = document.createElement("button");

            deleteButton.textContent = "Delete Recipe";
            deleteButton.type = "button";

            deleteButton.style.backgroundColor = "#c0392b";
            deleteButton.style.color = "white";
            deleteButton.style.padding = "10px 18px";
            deleteButton.style.border = "none";
            deleteButton.style.borderRadius = "6px";
            deleteButton.style.cursor = "pointer";

            deleteButton.addEventListener("click", function() {
                deleteRecipe(recipe._id, recipe.name);
            });

            card.appendChild(deleteButton);

            recipeList.appendChild(card);

        });

    } catch (error) {

        recipeList.textContent = "Unable to load recipes.";

        console.error("Recipe loading error:", error);

    }
}


// Edit selected recipe
function editRecipe(recipe) {

    editingRecipeId = recipe._id;

    document.getElementById("recipeName").value = recipe.name || "";

    document.getElementById("recipeImage").value = recipe.image_url || "";

    document.getElementById("mainIngredient").value =
        recipe.main_ingredient || "";

    document.getElementById("recipeIngredients").value =
        (recipe.ingredients || []).join("\n");

    document.getElementById("recipeInstructions").value =
        (recipe.instructions || []).join("\n");

    document.getElementById("cookTime").value =
        recipe.cooking_time ?? "";

    document.querySelector("#recipeFormContainer h3").textContent =
        "Edit Recipe";

    document.querySelector("#recipeForm button[type='submit']").textContent =
        "Update Recipe";

    document.getElementById("recipeFormContainer").style.display = "block";

    document.getElementById("recipeFormContainer").scrollIntoView({
        behavior: "smooth"
    });

}


// Delete selected recipe
async function deleteRecipe(recipeId, recipeName) {

    const confirmDelete = confirm(
        `Are you sure you want to delete "${recipeName}"?`
    );

    if (!confirmDelete) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/recipes/${recipeId}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Unable to delete recipe.");
        }

        alert("Recipe deleted successfully!");

        await loadAdminRecipes();
        await loadAdminDashboard();

    } catch (error) {

        alert(error.message);

        console.error("Recipe deletion error:", error);

    }

}


// Load food items
async function loadAdminFoods() {

    const foodList = document.getElementById("adminFoodList");

    foodList.textContent = "Loading food items...";

    try {

        const response = await fetch(`${API_URL}/foods`);

        if (!response.ok) {
            throw new Error("Failed to load foods.");
        }

        const foods = await response.json();

        foodList.innerHTML = "";

        if (foods.length === 0) {
            foodList.textContent = "No food items available.";
            return;
        }

        foods.forEach(food => {

            const card = document.createElement("div");
            card.className = "admin-data-card";

            const name = document.createElement("h3");
            name.textContent = food.name || food.food_name || "Food Item";

            const details = document.createElement("p");

            details.textContent =
                `Category: ${food.category || "N/A"} | Quantity: ${food.quantity ?? "N/A"}`;

            card.appendChild(name);
            card.appendChild(details);

            foodList.appendChild(card);

        });

    } catch (error) {

        foodList.textContent = "Unable to load food items.";

        console.error("Food loading error:", error);

    }

}


// Load registered users
async function loadAdminUsers() {

    const userList = document.getElementById("adminUserList");

    userList.textContent = "Loading users...";

    try {

        const response = await fetch(`${API_URL}/admin/users`);

        if (!response.ok) {
            throw new Error("Failed to load users.");
        }

        const users = await response.json();

        userList.innerHTML = "";

        if (users.length === 0) {
            userList.textContent = "No registered users.";
            return;
        }

        users.forEach(user => {

            const card = document.createElement("div");
            card.className = "admin-data-card";

            const name = document.createElement("h3");
            name.textContent = user.full_name || "Unknown User";

            const email = document.createElement("p");
            email.textContent = user.email || "No email";

            card.appendChild(name);
            card.appendChild(email);

            userList.appendChild(card);

        });

    } catch (error) {

        userList.textContent = "Unable to load users.";

        console.error("User loading error:", error);

    }

}


// Admin logout
function adminLogout() {

    localStorage.removeItem("foodTrackRole");
    localStorage.removeItem("foodTrackEmail");
    localStorage.removeItem("foodTrackPhone");
    localStorage.removeItem("foodTrackName");

    window.location.href = "index.html";

}


// Initialize admin dashboard
document.addEventListener("DOMContentLoaded", function() {

    if (!checkAdminAccess()) {
        return;
    }

    loadAdminDashboard();

});
