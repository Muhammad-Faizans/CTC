import { 
  db, auth, isAdmin,
  addToCart, getCart, updateCartCount, 
  showError, showSuccess, showWarning 
} from './app.js';

import { 
  collection, getDocs, query, orderBy, where 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Initialize the dishes page
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Check if user is admin
      const userIsAdmin = await isAdmin(user.uid);
      
      // Initialize dishes list
      loadAllDishes();
      updateCartCount();
      setupEventListeners();
    } else {
      // Redirect to login page
      showWarning("Authentication Required", "Please login to access this page.");
      window.location.href = "index.html";
    }
  });
});

// Get all dishes
async function getAllDishes() {
  try {
    const q = query(collection(db, "dishes"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const dishes = [];
    querySnapshot.forEach((doc) => {
      dishes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return dishes;
  } catch (error) {
    console.error("Error getting dishes:", error);
    showError("Error", "Failed to load dishes.");
    return [];
  }
}

// Filter dishes by category
async function filterDishesByCategory(category) {
  if (!category) {
    return getAllDishes();
  }
  
  try {
    const q = query(
      collection(db, "dishes"), 
      where("category", "==", category),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    const dishes = [];
    querySnapshot.forEach((doc) => {
      dishes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return dishes;
  } catch (error) {
    console.error("Error filtering dishes:", error);
    showError("Error", "Failed to filter dishes.");
    return [];
  }
}

// Search dishes by name
function searchDishes(dishes, searchTerm) {
  if (!searchTerm) {
    return dishes;
  }
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return dishes.filter(dish => 
    dish.name.toLowerCase().includes(lowerSearchTerm) || 
    dish.description.toLowerCase().includes(lowerSearchTerm)
  );
}

// Sort dishes
function sortDishes(dishes, sortBy) {
  if (!sortBy) {
    return dishes;
  }
  
  const [field, direction] = sortBy.split('_');
  
  return [...dishes].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];
    
    if (typeof aValue === 'string') {
      if (direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    } else {
      if (direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    }
  });
}

// Load all dishes into the UI
async function loadAllDishes(filters = {}) {
  const dishesContainer = document.getElementById('dishesShowList');
  if (!dishesContainer) return;
  
  dishesContainer.innerHTML = '<div class="flex justify-center my-8"><div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-lightpink"></div></div>';
  
  // Get base dishes list based on category filter
  let dishes = await (filters.category ? filterDishesByCategory(filters.category) : getAllDishes());
  
  // Apply search filter if present
  if (filters.search) {
    dishes = searchDishes(dishes, filters.search);
  }
  
  // Apply sorting
  dishes = sortDishes(dishes, filters.sortBy || 'name_asc');
  
  if (dishes.length === 0) {
    dishesContainer.innerHTML = `
      <div class="bg-white rounded-xl shadow-card p-8 text-center">
        <h3 class="text-xl font-semibold text-gray-700 mb-2">No Dishes Found</h3>
        <p class="text-gray-500">We couldn't find any dishes matching your criteria.</p>
      </div>
    `;
    return;
  }
  
  let dishesHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  `;
  
  dishes.forEach(dish => {
    dishesHTML += `
      <div class="bg-white rounded-xl shadow-card overflow-hidden transition-transform duration-300 hover:scale-[1.02]" data-id="${dish.id}">
        <div class="h-48 overflow-hidden">
          <img src="${dish.imageUrl}" alt="${dish.name}" class="w-full h-full object-cover">
        </div>
        <div class="p-4">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-xl font-semibold text-bluishgrey">${dish.name}</h3>
            <span class="bg-lightpink text-white text-sm py-1 px-2 rounded">${dish.category}</span>
          </div>
          <p class="text-gray-500 mb-4 line-clamp-2">${dish.description}</p>
          <div class="flex justify-between items-center">
            <span class="text-lg font-bold text-lightpink">PKR ${dish.price}</span>
            <button class="add-to-cart-btn bg-lightpink text-white py-1.5 px-4 rounded-lg hover:bg-pink transition-colors" data-id="${dish.id}">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  dishesHTML += `</div>`;
  dishesContainer.innerHTML = dishesHTML;
  
  // Add event listeners for add to cart buttons
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const dishId = btn.getAttribute('data-id');
      addDishToCart(dishId);
    });
  });
}

// Add dish to cart
async function addDishToCart(dishId) {
  try {
    // Get dish details
    const dishRef = collection(db, "dishes");
    const q = query(dishRef, where("__name__", "==", dishId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const dishDoc = querySnapshot.docs[0];
      const dish = {
        id: dishDoc.id,
        ...dishDoc.data()
      };
      
      // Add to cart
      addToCart(dish);
    } else {
      showError("Error", "Dish not found.");
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    showError("Error", "Failed to add dish to cart.");
  }
}

// Setup event listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchDish');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      applyFilters();
    }, 300));
  }
  
  // Category filter
  const categoryFilter = document.getElementById('filterCategory');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      applyFilters();
    });
  }
  
  // Sort dropdown
  const sortDropdown = document.getElementById('sortBy');
  if (sortDropdown) {
    sortDropdown.addEventListener('change', () => {
      applyFilters();
    });
  }
  
  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
}

// Apply all filters
function applyFilters() {
  const searchTerm = document.getElementById('searchDish')?.value || '';
  const category = document.getElementById('filterCategory')?.value || '';
  const sortBy = document.getElementById('sortBy')?.value || 'name_asc';
  
  loadAllDishes({
    search: searchTerm,
    category,
    sortBy
  });
}

// Debounce function to limit how often a function can be called
function debounce(func, delay) {
  let timeoutId;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
} 