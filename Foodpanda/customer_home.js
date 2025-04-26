import { auth, db, isAdmin, showWarning } from './app.js';
import { collection, getDocs, query, limit, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Get user role
            const userIsAdmin = await isAdmin(user.uid);
            
            // If admin, redirect to admin home
            if (userIsAdmin) {
                window.location.href = "admin_home.html";
                return;
            }
            
            // Initialize the page for customer
            initCustomerHomePage();
        } else {
            showWarning("Authentication Required", "Please login to access this page.");
            window.location.href = "index.html";
        }
    });
});

// Main initialization function
async function initCustomerHomePage() {
    // Setup mobile menu toggle
    setupMobileMenu();
    
    // Load featured dishes
    await loadFeaturedDishes();
}

// Mobile menu toggle
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            if (mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.remove('hidden');
            } else {
                mobileMenu.classList.add('hidden');
            }
        });
    }
}

// Load featured dishes
async function loadFeaturedDishes() {
    try {
        const featuredDishesContainer = document.getElementById('featuredDishes');
        if (!featuredDishesContainer) return;

        // Clear loading spinner
        featuredDishesContainer.innerHTML = '';

        // Get top 6 dishes ordered by rating (or any other criteria you prefer)
        const dishesQuery = query(collection(db, 'dishes'), orderBy('price', 'desc'), limit(6));
        const querySnapshot = await getDocs(dishesQuery);

        if (querySnapshot.empty) {
            featuredDishesContainer.innerHTML = '<p class="text-center col-span-3">No featured dishes available.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const dish = { id: doc.id, ...doc.data() };
            featuredDishesContainer.appendChild(createDishCard(dish));
        });
    } catch (error) {
        console.error('Error loading featured dishes:', error);
        const featuredDishesContainer = document.getElementById('featuredDishes');
        if (featuredDishesContainer) {
            featuredDishesContainer.innerHTML = '<p class="text-center col-span-3">Error loading dishes. Please try again later.</p>';
        }
    }
}

// Create dish card HTML
function createDishCard(dish) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-card overflow-hidden transition-transform duration-300 hover:transform hover:scale-105';
    
    // Format price with 2 decimal places
    const formattedPrice = parseFloat(dish.price).toFixed(2);
    
    // Default image if none provided
    const dishImage = dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop';
    
    // Create HTML structure for the card
    card.innerHTML = `
        <div class="h-48 overflow-hidden">
            <img src="${dishImage}" 
                alt="${dish.name}" 
                class="w-full h-full object-cover">
        </div>
        <div class="p-6">
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-xl font-semibold text-bluishgrey">${dish.name}</h3>
                <span class="bg-lightpink text-white text-sm font-bold px-2 py-1 rounded">$${formattedPrice}</span>
            </div>
            <p class="text-gray-600 mb-4 line-clamp-2">${dish.description || 'No description available'}</p>
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-500">${dish.category || 'Uncategorized'}</span>
                <a href="dishes.html#${dish.id}" class="inline-flex items-center text-lightpink hover:text-pink">
                    View Details
                    <i class="fas fa-arrow-right ml-1"></i>
                </a>
            </div>
        </div>
    `;
    
    return card;
}

// Function to update the cart count in the navbar
export function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-num');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    cartCountElements.forEach(element => {
        element.textContent = cart.length;
    });
}

// Initial cart count update
updateCartCount(); 