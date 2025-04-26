import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, updateDoc, deleteDoc, where } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCuWETfPgHXczuOd51NEcSFRar82HHAif8",
  authDomain: "practice-eb7b1.firebaseapp.com",
  projectId: "practice-eb7b1",
  storageBucket: "practice-eb7b1.appspot.com",
  messagingSenderId: "194151170212",
  appId: "1:194151170212:web:4d588abb89f2fc0ea7a631",
  measurementId: "G-NBCFC635Q8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// sweet alert
const showError = (title, text) => Swal.fire({ icon: "error", title, text });
const showSuccess = (title, text) => Swal.fire({ icon: "success", title, text });
const showWarning = (title, text) => Swal.fire({ icon: "warning", title, text });
const showConfirm = (title, text) => Swal.fire({
  title,
  text,
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#ff2b85',
  cancelButtonColor: '#d33',
  confirmButtonText: 'Yes, delete it!'
});

// ===== AUTH FUNCTIONS =====

// User signup function
async function signupUser(email, password, role = "customer") {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: role, // Use the provided role
      createdAt: new Date().toISOString()
    });
    
    showSuccess("Success", "Account created successfully!");
    return user;
  } catch (error) {
    console.error("Error signing up:", error);
    showError("Signup Failed", error.message);
    return null;
  }
}

// User login function
async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    showSuccess("Success", "Logged in successfully!");
    
    // Add query parameter to trigger role-based redirect
    window.location.href = window.location.pathname + '?newLogin=true';
    
    return userCredential.user;
  } catch (error) {
    console.error("Error logging in:", error);
    showError("Login Failed", error.message);
    return null;
  }
}

// User logout function
async function logoutUser() {
  try {
    await signOut(auth);
    showSuccess("Success", "Logged out successfully!");
    return true;
  } catch (error) {
    console.error("Error logging out:", error);
    showError("Logout Failed", error.message);
    return false;
  }
}

// Check if user is admin
async function isAdmin(userId) {
  if (!userId) return false;
  
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data().role === "admin";
    }
    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Setup user profile dropdown menu
function setupUserProfileUI(userEmail, isAdmin) {
  // Replace login buttons with profile image/dropdown
  document.querySelectorAll('.login-btn, .loginBtn').forEach(btn => {
    // Create profile container
    const profileContainer = document.createElement('div');
    profileContainer.className = 'relative profile-container';
    
    // Create profile image and dropdown HTML
    profileContainer.innerHTML = `
      <div class="h-10 w-10 rounded-full cursor-pointer border-2 border-lightpink hover:border-pink transition-colors bg-gray-200 flex items-center justify-center">
        <i class="fas fa-user text-lightpink"></i>
      </div>
      <div class="profile-dropdown">
        <div class="px-4 py-3 border-b border-gray-200">
          <p class="text-sm font-medium text-gray-900 truncate">${userEmail}</p>
          <p class="text-xs text-gray-500">${isAdmin ? 'Administrator' : 'Customer'}</p>
        </div>
        <div class="py-1">
          ${isAdmin ? `
            <a href="admin_home.html" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-lightpink hover:text-white transition-colors">
              <i class="fas fa-home mr-2"></i> Admin Dashboard
            </a>
          ` : `
            <a href="customer_home.html" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-lightpink hover:text-white transition-colors">
              <i class="fas fa-home mr-2"></i> Home
            </a>
            <a href="dishes.html" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-lightpink hover:text-white transition-colors">
              <i class="fas fa-utensils mr-2"></i> Browse Dishes
            </a>
            <a href="cart.html" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-lightpink hover:text-white transition-colors">
              <i class="fas fa-shopping-cart mr-2"></i> Your Cart
            </a>
          `}
          ${isAdmin ? `
            <a href="admin.html" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-lightpink hover:text-white transition-colors">
              <i class="fas fa-cog mr-2"></i> Manage Products
            </a>
          ` : `
            <a href="#" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-lightpink hover:text-white transition-colors">
              <i class="fas fa-shopping-bag mr-2"></i> Your Orders
            </a>
          `}
          <a href="#" id="profileLogoutBtn" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-lightpink hover:text-white transition-colors">
            <i class="fas fa-sign-out-alt mr-2"></i> Logout
          </a>
        </div>
      </div>
    `;
    
    // Replace login button with profile container
    btn.parentNode.replaceChild(profileContainer, btn);
  });
  
  // Add event listener for logout button in profile dropdown
  document.querySelectorAll('#profileLogoutBtn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      await logoutUser();
    });
  });
}

// Auth state change listener
function setupAuthListener() {
  onAuthStateChanged(auth, async (user) => {
    const currentPage = window.location.pathname.split("/").pop();
    
    // Get all auth-required elements
    const authRequiredPages = document.querySelector('[data-requires-auth="true"]');
    const adminOnlyPages = document.querySelector('[data-admin-only="true"]');
    
    if (user) {
      // User is signed in
      console.log("User signed in:", user.email);
      
      // Check if user is admin
      const userIsAdmin = await isAdmin(user.uid);
      
      // Set up profile UI
      setupUserProfileUI(user.email, userIsAdmin);
      
      // Update signup buttons to logout
      document.querySelectorAll('.signup-btn, #signupBtn').forEach(btn => {
        btn.textContent = "Logout";
        btn.setAttribute("id", "logoutBtn");
        btn.classList.remove("signup-btn");
        btn.classList.add("logout-btn");
      });
      
      // If this is a new login/signup (indicated by a query parameter)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('newLogin') === 'true') {
        // Remove the query parameter
        history.replaceState(null, '', window.location.pathname);
        
        // Redirect based on role
        if (userIsAdmin) {
          window.location.href = "admin_home.html";
        } else {
          window.location.href = "customer_home.html";
        }
        return; // Exit early since we're redirecting
      }
      
      if (adminOnlyPages && !userIsAdmin) {
        // Redirect from admin page if not admin
        showWarning("Access Denied", "You don't have permission to access this page.");
        window.location.href = "index.html";
      }
      
      // Load cart items count
      updateCartCount();
      
    } else {
      // User is signed out
      console.log("User signed out");
      
      // Update UI for logged out user
      document.querySelectorAll('.profile-container').forEach(container => {
        const loginBtn = document.createElement('button');
        loginBtn.textContent = "Log in";
        loginBtn.className = "login-btn outline-none py-[6px] px-3 rounded-md bg-white border border-blakishgrey text-blakishgrey cursor-pointer font-semibold hover:bg-whitishgrey hover:py-2";
        container.parentNode.replaceChild(loginBtn, container);
      });
      
      document.querySelectorAll('.logout-btn, #logoutBtn').forEach(btn => {
        btn.textContent = "Sign Up";
        btn.setAttribute("id", "signupBtn");
        btn.classList.remove("logout-btn");
        btn.classList.add("signup-btn");
      });
      
      // Redirect from auth-required pages
      if (authRequiredPages && currentPage !== "index.html") {
        showWarning("Authentication Required", "Please login to access this page.");
        window.location.href = "index.html";
      }
    }
  });
}

// ===== CART FUNCTIONS =====

// Add item to cart
function addToCart(product) {
  let cart = getCart();
  
  // Check if product already exists in cart
  const existingItemIndex = cart.findIndex(item => item.id === product.id);
  
  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += 1;
  } else {
    cart.push({
      ...product,
      quantity: 1
    });
  }
  
  // Update cart in local storage
  localStorage.setItem('foodpanda_cart', JSON.stringify(cart));
  updateCartCount();
  
  showSuccess("Added to Cart", `${product.name} has been added to your cart.`);
}

// Get cart from local storage
function getCart() {
  const cart = localStorage.getItem('foodpanda_cart');
  return cart ? JSON.parse(cart) : [];
}

// Update cart count in UI
function updateCartCount() {
  const cart = getCart();
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  
  // Update all cart count elements
  document.querySelectorAll('.cart-num').forEach(el => {
    el.textContent = totalItems;
  });
}

// Remove item from cart
function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== productId);
  localStorage.setItem('foodpanda_cart', JSON.stringify(cart));
  updateCartCount();
}

// Update item quantity in cart
function updateCartItemQuantity(productId, newQuantity) {
  let cart = getCart();
  
  const itemIndex = cart.findIndex(item => item.id === productId);
  
  if (itemIndex > -1) {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart[itemIndex].quantity = newQuantity;
    }
    
    localStorage.setItem('foodpanda_cart', JSON.stringify(cart));
    updateCartCount();
  }
}

// Calculate cart total
function calculateCartTotal() {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Clear cart
function clearCart() {
  localStorage.removeItem('foodpanda_cart');
  updateCartCount();
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  setupAuthListener();
  
  // Initialize other components based on current page
  const currentPage = window.location.pathname.split("/").pop();
  
  // Setup event listeners
  setupEventListeners();
});

// Setup global event listeners
function setupEventListeners() {
  // Admin signup button (in the header)
  const adminSignupBtn = document.getElementById('admin-signup-btn');
  if (adminSignupBtn) {
    adminSignupBtn.addEventListener('click', function() {
      // Show the signup modal
      document.getElementById('signup-container').classList.remove('hidden');
      
      // Set a data attribute to mark that this will be an admin signup
      document.getElementById('signup-container').setAttribute('data-signup-role', 'admin');
    });
  }
  
  // Login form
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async function() {
      const email = document.getElementById('li-email').value;
      const password = document.getElementById('li-password').value;
      
      if (!email || !password) {
        showError("Login Failed", "Please fill all required fields.");
        return;
      }
      
      await loginUser(email, password);
    });
  }
  
  // Logout button
  document.addEventListener('click', async function(event) {
    if (event.target.id === 'logoutBtn' || event.target.id === 'mobileLogoutBtn' || event.target.id === 'profileLogoutBtn') {
      event.preventDefault();
      const logoutSuccess = await logoutUser();
      if (logoutSuccess) {
        window.location.href = 'index.html';
      }
    }
  });
  
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      mobileMenu.classList.toggle('hidden');
    });
  }
}

// Export necessary functions and objects
export {
  db, auth, storage,
  signupUser, loginUser, logoutUser, isAdmin,
  addToCart, getCart, removeFromCart, updateCartItemQuantity, 
  calculateCartTotal, clearCart, updateCartCount,
  showError, showSuccess, showWarning, showConfirm
};


