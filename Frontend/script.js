
const API_BASE = "http://127.0.0.1:8000";

// ================= USER MODE =================

function isGuest() {
    return localStorage.getItem("foodTrackGuest") === "true";
}

function continueAsGuest() {
    localStorage.removeItem("foodTrackEmail");
    localStorage.removeItem("foodTrackName");
    localStorage.removeItem("foodTrackPhone");

    localStorage.setItem("foodTrackGuest", "true");
    localStorage.setItem("foodTrackRole", "guest");

    showHome();
}

function hideAllScreens() {
    const screens = [
        "welcomeScreen",
        "accountScreen",
        "loginScreen",
        "registerScreen",
        "dashboardScreen",
        "foodExpiryScreen",
        "foodWasteScreen",
        "recipesScreen",
        "profileScreen"
    ];

    screens.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = "none";
        }
    });
}

// ================= WELCOME AND LOGIN NAVIGATION =================

function showLogin() {
    hideAllScreens();

    document.getElementById("accountScreen").style.display = "flex";
}

function showLoginForm() {
    hideAllScreens();

    document.getElementById("loginScreen").style.display = "flex";
}

function showRegisterForm() {
    hideAllScreens();

    document.getElementById("registerScreen").style.display = "flex";
}

// ================= LOGIN =================

async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(`${API_BASE}/users/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "Invalid email or password.");
            return;
        }

        localStorage.removeItem("foodTrackGuest");

        localStorage.setItem("foodTrackEmail", email);
        localStorage.setItem("foodTrackName", data.full_name || "");
        localStorage.setItem("foodTrackPhone", data.phone_number || "");
        localStorage.setItem("foodTrackRole", data.role || "user");

        if (data.role === "admin") {
            window.location.href = "admin.html";
            return;
        }

        showHome();

    } catch (error) {
        console.error("Login error:", error);
        alert("Unable to connect to the server.");
    }
}

// ================= REGISTER =================

async function registerUser(event) {
    event.preventDefault();

    const fullName = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const phone = document.getElementById("registerPhone").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    if (!/^\d{11,12}$/.test(phone)) {
        alert("Phone number must contain 11 or 12 digits.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                phone_number: phone,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "Registration failed.");
            return;
        }

        alert("Registration successful! Please login.");

        document.getElementById("registerForm").reset();

        showLoginForm();

    } catch (error) {
        console.error("Registration error:", error);
        alert("Unable to connect to the server.");
    }
}

// ================= DASHBOARD =================

function showHome() {
    hideAllScreens();

    document.getElementById("dashboardScreen").style.display = "block";

    setActiveNav(0);

    updateGreeting();

    if (isGuest()) {
        setupGuestDashboard();
        return;
    }

    setupNormalDashboard();
    loadDashboardSummary();
}

function updateGreeting() {
    const greeting = document.getElementById("greetingText");

    if (!greeting) return;

    if (isGuest()) {
        greeting.textContent = "Welcome, Guest!";
        return;
    }

    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
        greeting.textContent = "Good Morning!";
    } else if (hour >= 12 && hour < 17) {
        greeting.textContent = "Good Afternoon!";
    } else if (hour >= 17 && hour < 21) {
        greeting.textContent = "Good Evening!";
    } else {
        greeting.textContent = "Good Night!";
    }
}

// ================= GUEST DASHBOARD =================

function setupGuestDashboard() {
    const notificationButton = document.querySelector(".notification-button");

    if (notificationButton) {
        notificationButton.style.display = "none";
    }

    const quickCards = document.querySelectorAll(".quick-action-card");

    if (quickCards[0]) {
        quickCards[0].querySelector("h3").textContent = "Food Details";
        quickCards[0].querySelector("p").textContent =
            "Explore sample food items and expiry details.";
    }

    if (quickCards[2]) {
        quickCards[2].style.display = "none";
    }

    const navItems = document.querySelectorAll(
        "#dashboardScreen .bottom-navigation .nav-item"
    );

    if (navItems[1]) {
        navItems[1].style.display = "none";
    }

    if (navItems[3]) {
        navItems[3].style.display = "none";
    }

    const total = document.getElementById("totalFoodCount");
    const expiring = document.getElementById("expiringFoodCount");

    if (total) total.textContent = GUEST_SAMPLE_FOODS.length;

    if (expiring) {
        expiring.textContent = GUEST_SAMPLE_FOODS.filter(food =>
            getRemainingDays(food.expiry_date) <= 3
        ).filter(food => getRemainingDays(food.expiry_date) >= 0).length;
    }
}

function setupNormalDashboard() {
    const notificationButton = document.querySelector(".notification-button");

    if (notificationButton) {
        notificationButton.style.display = "";
    }

    const quickCards = document.querySelectorAll(".quick-action-card");

    if (quickCards[0]) {
        quickCards[0].querySelector("h3").textContent = "My Food";
        quickCards[0].querySelector("p").textContent =
            "View and manage your food items.";
    }

    if (quickCards[2]) {
        quickCards[2].style.display = "";
    }

    const navItems = document.querySelectorAll(
        "#dashboardScreen .bottom-navigation .nav-item"
    );

    if (navItems[1]) navItems[1].style.display = "";
    if (navItems[3]) navItems[3].style.display = "";
}

function setActiveNav(index) {
    document.querySelectorAll(".bottom-navigation").forEach(nav => {
        nav.querySelectorAll(".nav-item").forEach((item, i) => {
            item.classList.toggle("active", i === index);
        });
    });
}

// ================= DASHBOARD SUMMARY =================

async function loadDashboardSummary() {
    if (isGuest()) return;

    try {
        const response = await fetch(`${API_BASE}/foods`);

        if (!response.ok) {
            throw new Error("Could not load foods.");
        }

        const foods = await response.json();

        const total = document.getElementById("totalFoodCount");

        if (total) {
            total.textContent = foods.length;
        }

        const expiryResponse = await fetch(`${API_BASE}/foods/expiry-status`);

        if (expiryResponse.ok) {
            const expiryFoods = await expiryResponse.json();

            const expiringCount = expiryFoods.filter(food =>
                food.status === "Expiring Soon"
            ).length;

            const expiring = document.getElementById("expiringFoodCount");

            if (expiring) {
                expiring.textContent = expiringCount;
            }
        }

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

// ================= GUEST SAMPLE FOOD DATA =================

function getDateAfterDays(days) {
    const date = new Date();

    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

const GUEST_SAMPLE_FOODS = [
    {
        name: "Wheat Flour",
        category: "Baking",
        expiry_date: getDateAfterDays(2),
        quantity: 2,
        unit: "kg",
        price: 450
    },
    {
        name: "Eggs",
        category: "Dairy",
        expiry_date: getDateAfterDays(5),
        quantity: 10,
        unit: "Pieces",
        price: 600
    },
    {
        name: "Milk",
        category: "Dairy",
        expiry_date: getDateAfterDays(1),
        quantity: 1,
        unit: "L",
        price: 350
    },
    {
        name: "Apples",
        category: "Fruits",
        expiry_date: getDateAfterDays(10),
        quantity: 5,
        unit: "Pieces",
        price: 500
    }
];

function getRemainingDays(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate + "T00:00:00");

    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

// ================= FOOD DETAILS =================


function showFoodExpiry() {
    if (isGuest()) {
        showGuestFoodDetails();
        return;
    }

    hideAllScreens();

    document.getElementById("foodExpiryScreen").style.display = "block";

    // Show the Add Food form for logged-in users
    const formPanel = document.querySelector(
        "#foodExpiryScreen .food-form-panel"
    );

    if (formPanel) {
        formPanel.style.display = "block";
    }

    setActiveNav(1);

    loadFoods();
}



function showGuestFoodDetails() {
    hideAllScreens();

    document.getElementById("foodExpiryScreen").style.display = "block";

    // Guests can view sample foods but cannot add food
    const formPanel = document.querySelector(
        "#foodExpiryScreen .food-form-panel"
    );

    if (formPanel) {
        formPanel.style.display = "none";
    }

    setActiveNav(1);

    displayFoods(GUEST_SAMPLE_FOODS, true);
}




function getFoodImage(foodName, category) {
    const name = foodName.toLowerCase().trim();

    const images = {
        "wheat flour": "wheatflour.jpg",
        "eggs": "eggs.jpg",
        "milk": "freshmilk.jpg",
        "fresh milk": "freshmilk.jpg",
        "carrot": "carrot.jpg",
        "rice": "rice.jpg",
        "bread": "bread.jpg",
        "coffee": "coffee.jfif",
        "fruits": "fruits.jfif",
        "milk powder": "milkpowder.jpg",
        "tea": "tea.jpg",
        "vegetables": "vegetables.png",
        "ice cream": "icecream.jpg",
        "cake": "cake.jpg",
        "sugar": "sugar.jpg"
    };

    const image = images[name];

    if (image) {
        return `${API_BASE}/static/images/${image}`;
    }

    return `${API_BASE}/static/images/vegetables.png`;
}



// ================= LOAD FOODS =================

async function loadFoods() {
    if (isGuest()) {
        showGuestFoodDetails();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/foods`);

        if (!response.ok) {
            throw new Error("Could not load food items.");
        }

        const foods = await response.json();

        displayFoods(foods, false);

    } catch (error) {
        console.error("Food loading error:", error);

        document.getElementById("foodList").innerHTML =
            "<p>Unable to load food items.</p>";
    }
}

// ================= DISPLAY FOODS =================


async function displayFoods(foods, guestMode = false) {
    const foodList = document.getElementById("foodList");

    if (!foodList) return;

    if (!guestMode) {
        try {
            const response = await fetch(`${API_BASE}/foods/expiry-status`);

            if (response.ok) {
                const statuses = await response.json();

                foods = foods.map(food => {
                    const foodId = String(
                        food._id || food.id || food.food_id
                    );

                    const status = statuses.find(item =>
                        String(item.food_id) === foodId
                    );

                    return {
                        ...food,
                        status: status ? status.status : "Fresh"
                    };
                });
            }
        } catch (error) {
            console.error("Expiry status error:", error);
        }
    }

    if (!foods || foods.length === 0) {
        foodList.innerHTML = `
            <p class="food-empty-message">
                🧺 No food items found. Add your first food item!
            </p>
        `;
        return;
    }

    foodList.innerHTML = foods.map(food => {
        const remaining = getRemainingDays(food.expiry_date);

        let status = food.status || "Fresh";

        if (guestMode) {
            if (remaining < 0) {
                status = "Expired";
            } else if (remaining <= 3) {
                status = "Expiring Soon";
            } else {
                status = "Fresh";
            }
        }

        let statusClass = "fresh";

        if (status === "Expired") {
            statusClass = "expired";
        } else if (status === "Expiring Soon") {
            statusClass = "expiring";
        }

        const id = food._id || food.id || food.food_id || "";

        return `
            <div class="food-item-card">

                <img
                    class="food-item-image"
                    src="${getFoodImage(food.name, food.category)}"
                    alt="${escapeHTML(food.name)}"
                    onerror="this.style.display='none'"
                >

                <h3>${escapeHTML(food.name)}</h3>

                <p>Category: ${escapeHTML(food.category)}</p>

                <p>
                    Quantity:
                    ${food.quantity} ${escapeHTML(food.unit)}
                </p>

                <p>
                    Expiry Date:
                    ${escapeHTML(food.expiry_date)}
                </p>

                <p>
                    Price: Rs. ${Number(food.price || 0).toFixed(2)}
                </p>

                <span class="food-status ${statusClass}">
                    ${escapeHTML(status)}
                </span>

                ${guestMode ? "" : `
                    <div class="food-actions">

                        <button
                            type="button"
                            onclick='editFood(${JSON.stringify(food).replace(/'/g, "&#39;")})'>
                            Edit
                        </button>

                        <button
                            type="button"
                            onclick="deleteFood('${id}')">
                            Delete
                        </button>

                    </div>
                `}

            </div>
        `;
    }).join("");
}


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// ================= ADD FOOD =================

async function addFood(event) {
    event.preventDefault();

    if (isGuest()) {
        alert("Please login to add food items.");
        return;
    }

    const foodData = {
        name: document.getElementById("foodName").value.trim(),
        category: document.getElementById("foodCategory").value,
        expiry_date: document.getElementById("expiryDate").value,
        quantity: Number(document.getElementById("foodQuantity").value),
        unit: document.getElementById("foodUnit").value,
        price: Number(document.getElementById("foodPrice").value)
    };

    if (foodData.price < 0 || foodData.quantity <= 0) {
        alert("Please enter valid quantity and price.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/foods`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(foodData)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "Unable to add food.");
            return;
        }

        alert(data.message || "Food added successfully!");

        document.getElementById("foodForm").reset();

        loadFoods();
        loadDashboardSummary();

    } catch (error) {
        console.error("Add food error:", error);
        alert("Unable to connect to the server.");
    }
}

// ================= EDIT FOOD =================

async function editFood(food) {
    if (isGuest()) {
        alert("Guests cannot edit food items.");
        return;
    }

    const name = prompt("Enter food name:", food.name);

    if (name === null) return;

    const quantity = prompt("Enter quantity:", food.quantity);

    if (quantity === null) return;

    const expiryDate = prompt(
        "Enter expiry date (YYYY-MM-DD):",
        food.expiry_date
    );

    if (expiryDate === null) return;

    const updatedFood = {
        name: name.trim(),
        category: food.category,
        expiry_date: expiryDate,
        quantity: Number(quantity),
        unit: food.unit,
        price: Number(food.price || 0)
    };

    if (!updatedFood.name || updatedFood.quantity <= 0) {
        alert("Please enter valid food details.");
        return;
    }

    const foodId = food._id || food.id || food.food_id;

    try {
        const response = await fetch(`${API_BASE}/foods/${foodId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedFood)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "Unable to update food.");
            return;
        }

        alert("Food updated successfully!");

        loadFoods();
        loadDashboardSummary();

    } catch (error) {
        console.error("Edit food error:", error);
        alert("Unable to connect to the server.");
    }
}

// ================= DELETE FOOD =================

async function deleteFood(foodId) {
    if (isGuest()) {
        alert("Guests cannot delete food items.");
        return;
    }

    if (!confirm("Are you sure you want to delete this food item?")) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/foods/${foodId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "Unable to delete food.");
            return;
        }

        alert("Food deleted successfully!");

        loadFoods();
        loadDashboardSummary();

    } catch (error) {
        console.error("Delete food error:", error);
        alert("Unable to connect to the server.");
    }
}

// ================= FOOD WASTE =================

function showFoodWaste() {
    if (isGuest()) {
        alert("Please login to access Food Waste Tracking.");
        return;
    }

    hideAllScreens();

    document.getElementById("foodWasteScreen").style.display = "block";

    setActiveNav(0);

    const monthInput = document.getElementById("wasteMonth");

    if (monthInput && !monthInput.value) {
        monthInput.value = new Date().toISOString().slice(0, 7);
    }

    loadFoodWaste();
}

async function loadFoodWaste() {
    if (isGuest()) return;

    const monthInput = document.getElementById("wasteMonth");

    const month = monthInput ? monthInput.value : "";

    try {
        const response = await fetch(`${API_BASE}/food-waste`);

        if (!response.ok) {
            throw new Error("Could not load food waste.");
        }

        const data = await response.json();

        const items = Array.isArray(data)
            ? data
            : data.waste_items || data.items || [];

        displayWasteItems(items, month);

        const summaryResponse = await fetch(
            `${API_BASE}/food-waste/monthly-summary`
        );

        if (summaryResponse.ok) {
            const summary = await summaryResponse.json();

            displayWasteSummary(summary, month);
        }

    } catch (error) {
        console.error("Food waste error:", error);

        document.getElementById("foodWasteList").innerHTML =
            "<p>Unable to load food waste information.</p>";
    }
}

function displayWasteSummary(summary, month) {
    const amountElement = document.getElementById("monthlyWasteAmount");
    const countElement = document.getElementById("wastedFoodCount");
    const priceElement = document.getElementById("unrecordedPriceCount");

    let selected = summary;

    if (Array.isArray(summary)) {
        selected = summary.find(item =>
            item.month === month
        ) || {};
    }

    if (amountElement) {
        amountElement.textContent =
            "Rs. " + Number(
                selected.total_waste_amount ??
                selected.total_amount ??
                selected.total_price ??
                0
            ).toFixed(2);
    }

    if (countElement) {
        countElement.textContent =
            selected.wasted_food_count ??
            selected.total_items ??
            selected.count ??
            0;
    }

    if (priceElement) {
        priceElement.textContent =
            selected.unrecorded_price_count ?? 0;
    }
}


function displayWasteItems(items, month) {
    const list = document.getElementById("foodWasteList");

    if (!list) return;

    let filtered = items;

    if (month) {
        filtered = items.filter(item => {
            const date = item.waste_date || item.expiry_date || "";
            return date.startsWith(month);
        });
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <p class="waste-empty-message">
                No wasted food items found for this month.
            </p>
        `;
        return;
    }

    list.innerHTML = filtered.map(item => {
        const image = getFoodImage(item.name || "", item.category || "");

        return `
            <div class="waste-item-card">

                <img
                    src="${image}"
                    alt="${escapeHTML(item.name || "Food Item")}"
                    class="waste-item-image"
                >

                <div class="waste-item-details">
                    <h3>${escapeHTML(item.name || "Food Item")}</h3>

                    <p>Quantity:
                        <strong>${item.quantity ?? 0} ${escapeHTML(item.unit || "")}</strong>
                    </p>

                    <p>Price:
                        <strong>Rs. ${Number(item.price || 0).toFixed(2)}</strong>
                    </p>

                    <p>Date:
                        <strong>${escapeHTML(item.waste_date || item.expiry_date || "")}</strong>
                    </p>
                </div>

            </div>
        `;
    }).join("");
}


// ================= RECIPES =================

async function showRecipes() {
    hideAllScreens();

    document.getElementById("recipesScreen").style.display = "block";

    setActiveNav(2);

    document.getElementById("recipeList").style.display = "grid";
    document.getElementById("recipeDetails").style.display = "none";

    await loadRecommendedRecipes();
}

async function loadRecommendedRecipes() {
    const recipeList = document.getElementById("recipeList");

    recipeList.innerHTML = "<p>Loading recipes...</p>";

    try {
        let url;

        if (isGuest()) {
            url = `${API_BASE}/recipes`;
        } else {
            url = `${API_BASE}/recipes/recommendations`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Could not load recipes.");
        }

        const data = await response.json();

        let recipes;

        if (isGuest()) {
            recipes = Array.isArray(data) ? data : data.recipes || [];

            recipes = recipes.map(recipe => ({
                recipe: recipe,
                available_ingredients: [],
                missing_ingredients: [],
                expiring_ingredients: [],
                priority_score: 0
            }));

        } else {
            recipes = data.recommended_recipes || [];
        }

        displayRecipes(recipes);

    } catch (error) {
        console.error("Recipe error:", error);

        recipeList.innerHTML =
            "<p>Unable to load recipes. Please try again later.</p>";
    }
}

function getRecipeImage(imageUrl) {
    if (!imageUrl) {
        return "";
    }

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
    }

    if (imageUrl.startsWith("/")) {
        return `${API_BASE}${imageUrl}`;
    }

    return `${API_BASE}/${imageUrl}`;
}

function displayRecipes(items) {
    const recipeList = document.getElementById("recipeList");

    if (!items || items.length === 0) {
        recipeList.innerHTML = "<p>No recipes available.</p>";
        return;
    }

    recipeList.innerHTML = items.map((item, index) => {
        const recipe = item.recipe || item;

        return `
            <div class="recipe-card">

                <img
                    src="${getRecipeImage(recipe.image_url)}"
                    alt="${escapeHTML(recipe.name)}"
                    onerror="this.style.display='none'"
                >

                <div class="recipe-card-content">

                    <h3>${escapeHTML(recipe.name)}</h3>

                    <p>
                        Cooking Time:
                        ${recipe.cooking_time || 0} minutes
                    </p>

                    <button
                        type="button"
                        onclick="openRecipeDetails(${index})">

                        View Recipe

                    </button>

                </div>

            </div>
        `;
    }).join("");

    window.currentRecipeItems = items;
}

// ================= RECIPE DETAILS =================

function openRecipeDetails(index) {
    const item = window.currentRecipeItems[index];

    if (item) {
        showRecipeDetails(item);
    }
}

function showRecipeDetails(item) {
    const recipe = item.recipe || item;

    document.getElementById("recipeList").style.display = "none";
    document.getElementById("recipeDetails").style.display = "block";

    document.getElementById("detailRecipeName").textContent =
        recipe.name || "Recipe";

    document.getElementById("detailRecipeImage").src =
        getRecipeImage(recipe.image_url);

    document.getElementById("detailCookingTime").textContent =
        recipe.cooking_time || 0;

    displayIngredients("detailIngredients", recipe.ingredients || []);

    displayIngredients(
        "detailInstructions",
        recipe.instructions || []
    );

    const availableHeading = document.getElementById("detailAvailable")
        ?.previousElementSibling;

    const missingHeading = document.getElementById("detailMissing")
        ?.previousElementSibling;

    if (isGuest()) {
        document.getElementById("detailAvailable").parentElement.style.display =
            "none";

        document.getElementById("detailMissing").parentElement.style.display =
            "none";

    } else {
        document.getElementById("detailAvailable").parentElement.style.display =
            "block";

        document.getElementById("detailMissing").parentElement.style.display =
            "block";

        displayIngredients(
            "detailAvailable",
            item.available_ingredients || []
        );

        displayIngredients(
            "detailMissing",
            item.missing_ingredients || []
        );
    }
}

function displayIngredients(elementId, ingredients) {
    const element = document.getElementById(elementId);

    if (!element) return;

    if (!ingredients || ingredients.length === 0) {
        element.innerHTML = "<p>No information available.</p>";
        return;
    }

    element.innerHTML = `
        <ul>
            ${ingredients.map(ingredient =>
                `<li>${escapeHTML(
                    typeof ingredient === "string"
                        ? ingredient
                        : ingredient.name || ""
                )}</li>`
            ).join("")}
        </ul>
    `;
}

function backToRecipes() {
    document.getElementById("recipeDetails").style.display = "none";
    document.getElementById("recipeList").style.display = "grid";
}

// ================= PROFILE =================


function showProfile() {
    if (isGuest()) {
        alert("Please login to view your profile.");
        return;
    }

    hideAllScreens();

    document.getElementById("profileScreen").style.display = "block";

    setActiveNav(3);

    const name = localStorage.getItem("foodTrackName") || "Food Track User";
    const email = localStorage.getItem("foodTrackEmail") || "Not provided";
    const phone = localStorage.getItem("foodTrackPhone") || "Not provided";

    document.getElementById("profileName").textContent = name;
    document.getElementById("profileEmail").textContent = email;
    document.getElementById("profilePhone").textContent = phone;

    document.getElementById("profileHeroName").textContent = name;
}


// ================= EXPIRY NOTIFICATIONS =================

async function showExpiryNotifications() {
    if (isGuest()) {
        alert("Please login to view expiry notifications.");
        return;
    }

    const panel = document.getElementById("expiryNotificationPanel");
    const list = document.getElementById("expiryNotificationList");

    panel.style.display = "block";
    list.innerHTML = "<p>Loading notifications...</p>";

    try {
        const response = await fetch(`${API_BASE}/foods/expiry-status`);

        if (!response.ok) {
            throw new Error("Could not load expiry notifications.");
        }

        const foods = await response.json();

        const expiringFoods = foods.filter(food =>
            food.status === "Expiring Soon"
        );

        if (expiringFoods.length === 0) {
            list.innerHTML = "<p>No expiry notifications.</p>";
            return;
        }

        list.innerHTML = expiringFoods.map(food => `
            <div class="notification-item">

                <h4>${escapeHTML(food.name)}</h4>

                <p>
                    Expiry Date:
                    ${escapeHTML(food.expiry_date)}
                </p>

                <p>
                    Remaining Days:
                    ${food.remaining_days}
                </p>

            </div>
        `).join("");

    } catch (error) {
        console.error("Notification error:", error);
        list.innerHTML = "<p>Unable to load notifications.</p>";
    }
}

function closeExpiryNotifications() {
    document.getElementById("expiryNotificationPanel").style.display = "none";
}

// ================= LOGOUT =================

function logoutUser() {
    if (!confirm("Are you sure you want to logout?")) {
        return;
    }

    const keys = [
        "foodTrackEmail",
        "foodTrackName",
        "foodTrackPhone",
        "foodTrackRole",
        "foodTrackGuest"
    ];

    keys.forEach(key => localStorage.removeItem(key));

    hideAllScreens();

    document.getElementById("welcomeScreen").style.display = "flex";
}

// ================= RESTORE GUEST SESSION =================

document.addEventListener("DOMContentLoaded", function () {
    if (isGuest()) {
        showHome();
    }
});
