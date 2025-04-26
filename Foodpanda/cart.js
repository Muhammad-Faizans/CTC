import { 
  db, auth, isAdmin,
  getCart, updateCartItemQuantity, removeFromCart, 
  calculateCartTotal, clearCart, updateCartCount,
  showError, showSuccess, showWarning 
} from './app.js';

import { 
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Initialize Stripe - in production, you'd want to use your own publishable key
const stripePublishableKey = 'pk_test_51Qs1FlJIsHsxxs3rk6LRJOiyUVEYzhhTmxd9BGDGxZj4HqkMDVNelF9X1elJyDNg3gCCiSgHaB11xe98e5AHQTZb008oAYaWHn';
let stripe;

// Initialize the cart page
document.addEventListener('DOMContentLoaded', function() {
  console.log('Cart page loaded');
  
  // Try to load cart items regardless of auth state for debugging
  const cart = getCart();
  console.log('Current cart items:', cart);
  
  // Check if cart elements exist in the DOM
  const cartContainer = document.getElementById('cartList');
  const cartTotalElement = document.getElementById('cartTotal');
  
  if (!cartContainer) {
    console.error('Cart list container not found in DOM');
  }
  
  if (!cartTotalElement) {
    console.error('Cart total element not found in DOM');
  }
  
  // Check if user is logged in
  onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'No user logged in');
    
    if (user) {
      // Check if user is admin
      const userIsAdmin = await isAdmin(user.uid);
      
      // Initialize cart
      loadCartItems();
      setupEventListeners();
      initializeStripe();
    } else {
      // Show login prompt but still display cart if available
      if (cart && cart.length > 0) {
        showWarning('Authentication Required', 'Please log in to checkout, but you can still view your cart.');
        loadCartItems(); // Load cart items even for non-authenticated users
        setupEventListeners();
      } else {
        showWarning("Authentication Required", "Please login to access this page.");
        window.location.href = "index.html";
      }
    }
  });
});

// Initialize Stripe
function initializeStripe() {
  try {
    // Check if Stripe is defined globally
    if (typeof Stripe === 'undefined') {
      console.error('Stripe.js not loaded. Please check your internet connection.');
      showWarning('Payment System', 'Stripe payment system is not available right now. You can still use cash on delivery.');
      return;
    }
    stripe = Stripe(stripePublishableKey);
    console.log('Stripe initialized successfully');
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    showWarning('Payment System', 'Stripe payment system is not available right now. You can still use cash on delivery.');
  }
}

// Load cart items into the UI
function loadCartItems() {
  try {
    console.log('Loading cart items into UI');
    const cartContainer = document.getElementById('cartList');
    const cartTotalElement = document.getElementById('cartTotal');
    
    if (!cartContainer || !cartTotalElement) {
      console.error('Cart container or total element not found:', {
        cartContainer: !!cartContainer,
        cartTotalElement: !!cartTotalElement
      });
      return;
    }
    
    const cart = getCart();
    console.log('Cart items to display:', cart);
    updateCartCount();
    
    if (cart.length === 0) {
      console.log('Cart is empty, showing empty state');
      cartContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-card p-8 text-center">
          <img src="images/empty-cart.svg" alt="Empty cart" class="w-32 h-32 mx-auto mb-4">
          <h3 class="text-xl font-semibold text-gray-700 mb-2">Your Cart is Empty</h3>
          <p class="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
          <a href="dishes.html" class="bg-lightpink text-white py-2 px-4 rounded-lg hover:bg-pink transition-colors">
            Browse Dishes
          </a>
        </div>
      `;
      
      cartTotalElement.textContent = '0';
      
      // Hide checkout button or show it as disabled
      const checkoutBtn = document.querySelector('.checkout-btn');
      if (checkoutBtn) {
        checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
        checkoutBtn.disabled = true;
      }
      
      return;
    }
    
    let cartHTML = '';
    
    cart.forEach(item => {
      cartHTML += `
        <div class="bg-white rounded-xl shadow-card p-4 mb-4" data-id="${item.id}">
          <div class="flex flex-col md:flex-row items-start">
            <div class="w-full md:w-24 h-24 mb-4 md:mb-0 md:mr-4 overflow-hidden rounded-lg flex-shrink-0">
              <img src="${item.imageUrl}" alt="${item.name}" class="w-full h-full object-cover">
            </div>
            <div class="flex-grow">
              <div class="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
                <h3 class="text-lg font-semibold text-bluishgrey mb-1 md:mb-0">${item.name}</h3>
                <span class="text-lg font-bold text-lightpink">PKR ${item.price}</span>
              </div>
              <p class="text-gray-500 mb-4 line-clamp-2">${item.description}</p>
              <div class="flex justify-between items-center">
                <div class="flex items-center">
                  <button class="decrement-qty bg-gray-200 text-gray-700 w-8 h-8 rounded-l-lg flex items-center justify-center hover:bg-gray-300 transition-colors" data-id="${item.id}">
                    <i class="fa-solid fa-minus"></i>
                  </button>
                  <span class="item-qty bg-gray-100 text-gray-800 w-10 h-8 flex items-center justify-center font-medium">
                    ${item.quantity}
                  </span>
                  <button class="increment-qty bg-gray-200 text-gray-700 w-8 h-8 rounded-r-lg flex items-center justify-center hover:bg-gray-300 transition-colors" data-id="${item.id}">
                    <i class="fa-solid fa-plus"></i>
                  </button>
                </div>
                <button class="remove-item bg-red-100 text-red-600 py-1.5 px-3 rounded-lg hover:bg-red-200 transition-colors flex items-center" data-id="${item.id}">
                  <i class="fa-solid fa-trash-can mr-1"></i>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    console.log('Setting cart HTML content');
    cartContainer.innerHTML = cartHTML;
    
    // Update total
    const total = calculateCartTotal();
    cartTotalElement.textContent = total.toFixed(2);
    console.log('Cart total set to:', total.toFixed(2));
    
    // Add event listeners
    console.log('Adding event listeners to cart items');
    document.querySelectorAll('.increment-qty').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-id');
        const currentItem = cart.find(item => item.id === itemId);
        if (currentItem) {
          updateCartItemQuantity(itemId, currentItem.quantity + 1);
          loadCartItems();
        }
      });
    });
    
    document.querySelectorAll('.decrement-qty').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-id');
        const currentItem = cart.find(item => item.id === itemId);
        if (currentItem && currentItem.quantity > 1) {
          updateCartItemQuantity(itemId, currentItem.quantity - 1);
          loadCartItems();
        }
      });
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-id');
        removeFromCart(itemId);
        loadCartItems();
      });
    });
    
    // Enable checkout button
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      checkoutBtn.disabled = false;
    }
    
    console.log('Cart items loaded successfully');
  } catch (error) {
    console.error('Error loading cart items:', error);
    showError('Cart Error', 'There was a problem loading your cart. Please refresh the page or try again later.');
  }
}

// Process checkout
async function processCheckout() {
  const cart = getCart();
  
  if (cart.length === 0) {
    showWarning("Empty Cart", "Your cart is empty. Add some dishes before checkout.");
    return;
  }
  
  try {
    // Show checkout modal
    showCheckoutModal();
  } catch (error) {
    console.error("Error processing checkout:", error);
    showError("Checkout Failed", "Failed to process checkout. Please try again.");
  }
}

// Show checkout modal
function showCheckoutModal() {
  const cart = getCart();
  const total = calculateCartTotal();
  
  let modalHTML = `
    <div id="checkoutModal" class="fixed inset-0 bg-black bg-opacity-50 z-[1000] flex items-center justify-center">
      <div class="bg-white rounded-xl shadow-modal w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-4 border-b">
          <h3 class="text-xl font-medium text-gray-900">Checkout</h3>
          <button type="button" class="close-checkout-modal text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg p-1.5 ml-auto inline-flex items-center">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
          </button>
        </div>
        <div class="p-6">
          <form id="checkoutForm" class="space-y-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="fullName" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" id="fullName" class="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lightpink focus:border-transparent" required>
              </div>
              <div>
                <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" id="phone" pattern="[0-9]+" class="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lightpink focus:border-transparent" required>
              </div>
            </div>
            
            <div>
              <label for="street" class="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input type="text" id="street" class="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lightpink focus:border-transparent" required>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="city" class="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" id="city" class="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lightpink focus:border-transparent" required>
              </div>
              <div>
                <label for="zipCode" class="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input type="text" id="zipCode" pattern="[0-9]+" class="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lightpink focus:border-transparent" required>
              </div>
            </div>
            
            <h4 class="text-lg font-semibold text-gray-900 mb-4 mt-6">Payment Method</h4>
            
            <div class="space-y-4">
              <div class="flex items-center p-3 border border-gray-200 rounded-lg hover:border-lightpink transition-colors cursor-pointer payment-method-option">
                <input type="radio" id="paymentCash" name="paymentMethod" value="cash" class="w-5 h-5 accent-lightpink" checked>
                <label for="paymentCash" class="text-gray-700 ml-3 flex-grow cursor-pointer">Cash on Delivery</label>
                <i class="fas fa-money-bill-wave text-lightpink text-xl"></i>
              </div>
              <div class="flex items-center p-3 border border-gray-200 rounded-lg hover:border-lightpink transition-colors cursor-pointer payment-method-option">
                <input type="radio" id="paymentCard" name="paymentMethod" value="card" class="w-5 h-5 accent-lightpink">
                <label for="paymentCard" class="text-gray-700 ml-3 flex-grow cursor-pointer">Credit/Debit Card (Stripe)</label>
                <i class="fas fa-credit-card text-lightpink text-xl"></i>
              </div>
            </div>
            
            <div id="cardDetails" class="hidden space-y-4 border-t pt-4 mt-4">
              <div>
                <label for="cardNumber" class="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <input type="text" id="cardNumber" pattern="[0-9]+" placeholder="1234 5678 9012 3456" maxlength="16" inputmode="numeric" class="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lightpink focus:border-transparent">
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="expDate" class="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input type="text" id="expDate" placeholder="MM/YY" pattern="(0[1-9]|1[0-2])\\/([0-9]{2})" maxlength="5" class="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lightpink focus:border-transparent">
                </div>
                <div>
                  <label for="cvv" class="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <input type="text" id="cvv" placeholder="123" pattern="[0-9]{3,4}" maxlength="4" inputmode="numeric" class="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lightpink focus:border-transparent">
                </div>
              </div>
            </div>
            
            <h4 class="text-lg font-semibold text-gray-900 mb-4 mt-6">Order Summary</h4>
            
            <div class="border rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">`;
  
  cart.forEach(item => {
    modalHTML += `
      <tr>
        <td class="px-4 py-3 text-sm text-gray-900">${item.name}</td>
        <td class="px-4 py-3 text-sm text-gray-500 text-right">PKR ${item.price.toFixed(2)}</td>
        <td class="px-4 py-3 text-sm text-gray-500 text-right">${item.quantity}</td>
        <td class="px-4 py-3 text-sm text-gray-900 font-medium text-right">PKR ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `;
  });
  
  modalHTML += `
                </tbody>
              </table>
            </div>
            
            <div class="border-t pt-4 flex justify-between items-center">
              <span class="text-lg font-bold text-bluishgrey">Total Amount:</span>
              <span class="text-lg font-bold text-lightpink">PKR ${total.toFixed(2)}</span>
            </div>
          </form>
        </div>
        <div class="p-4 border-t flex justify-end space-x-3">
          <button type="button" class="close-checkout-modal py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
          <button type="button" id="placeOrderBtn" class="py-2 px-4 bg-lightpink text-white rounded-lg hover:bg-pink transition-colors">Place Order</button>
        </div>
      </div>
    </div>
  `;
  
  // Append modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add event listeners
  document.querySelectorAll('.close-checkout-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('checkoutModal').remove();
    });
  });
  
  document.getElementById('placeOrderBtn').addEventListener('click', () => {
    placeOrder();
  });
  
  // Toggle card details based on payment method
  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'card') {
        document.getElementById('cardDetails').classList.remove('hidden');
      } else {
        document.getElementById('cardDetails').classList.add('hidden');
      }
    });
  });
  
  // Add click listener to payment method containers to select the radio button inside
  document.querySelectorAll('.payment-method-option').forEach(option => {
    option.addEventListener('click', () => {
      const radio = option.querySelector('input[type="radio"]');
      radio.checked = true;
      
      // Trigger the change event manually
      const event = new Event('change');
      radio.dispatchEvent(event);
      
      // Add/remove active class for styling
      document.querySelectorAll('.payment-method-option').forEach(opt => {
        opt.classList.remove('border-lightpink', 'bg-pink', 'bg-opacity-5');
      });
      option.classList.add('border-lightpink', 'bg-pink', 'bg-opacity-5');
    });
  });
  
  // Trigger click on the default selected payment method
  document.querySelector('.payment-method-option').click();
  
  // Add input validation for numeric fields
  const numericInputs = ['phone', 'zipCode', 'cardNumber', 'cvv'];
  numericInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
      });
    }
  });
  
  // Format expiration date
  const expDateInput = document.getElementById('expDate');
  if (expDateInput) {
    expDateInput.addEventListener('input', function(e) {
      let value = this.value.replace(/\D/g, '');
      if (value.length > 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
      this.value = value;
    });
  }
}

// Place order
async function placeOrder() {
  const user = auth.currentUser;
  if (!user) {
    showWarning("Authentication Required", "Please login to complete your order.");
    return;
  }
  
  const cart = getCart();
  if (cart.length === 0) {
    showWarning("Empty Cart", "Your cart is empty. Add some dishes before checkout.");
    return;
  }
  
  // Get form data
  const fullName = document.getElementById('fullName').value;
  const phone = document.getElementById('phone').value;
  const street = document.getElementById('street').value;
  const city = document.getElementById('city').value;
  const zipCode = document.getElementById('zipCode').value;
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
  
  // Validate form data
  if (!fullName || !phone || !street || !city || !zipCode) {
    showWarning("Incomplete Information", "Please fill in all required fields.");
    return;
  }
  
  try {
    // Calculate total
    const totalAmount = calculateCartTotal();
    
    // Create order object
    const order = {
      customerId: user.uid,
      customerEmail: user.email,
      customerName: fullName,
      items: cart,
      totalAmount,
      status: 'pending',
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'processing',
      shippingAddress: {
        name: fullName,
        phone,
        street,
        city,
        zip: zipCode
      },
      createdAt: serverTimestamp()
    };
    
    if (paymentMethod === 'cash') {
      // For cash on delivery, directly save the order
      await saveOrderToDatabase(order);
    } else {
      // For card payment, use Stripe
      await processStripePayment(order);
    }
  } catch (error) {
    console.error("Error placing order:", error);
    showError("Order Failed", "Failed to place order. Please try again.");
  }
}

// Process payment with Stripe
async function processStripePayment(order) {
  try {
    // Check if Stripe is properly initialized
    if (!stripe) {
      console.error('Stripe not initialized');
      showError('Payment Error', 'Stripe payment service is not available. Please try cash on delivery instead.');
      return;
    }
    
    // Get card details
    const cardNumber = document.getElementById('cardNumber').value;
    const expDate = document.getElementById('expDate').value;
    const cvv = document.getElementById('cvv').value;
    
    if (!cardNumber || !expDate || !cvv) {
      showWarning("Incomplete Card Details", "Please fill in all card details.");
      return;
    }
    
    // Show a loading overlay
    showLoading("Processing payment...");
    
    // In a real app, you would:
    // 1. Send the card details to a secure backend server
    // 2. Create a PaymentIntent with Stripe API
    // 3. Confirm the payment with the card details
    
    // For this demo, we'll simulate the payment process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update order with payment details
    order.paymentStatus = 'paid';
    order.stripePaymentId = 'stripe_' + Math.random().toString(36).substring(2, 15);
    
    // Save order to database
    await saveOrderToDatabase(order);
    
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error processing payment:", error);
    showError("Payment Failed", "Failed to process payment. Please try cash on delivery instead.");
    
    // Fall back to cash on delivery
    try {
      order.paymentMethod = 'cash';
      order.paymentStatus = 'pending';
      await saveOrderToDatabase(order);
    } catch (fallbackError) {
      console.error("Error saving order with fallback payment method:", fallbackError);
      showError("Order Failed", "Failed to place order. Please try again later.");
    }
  }
}

// Save order to database
async function saveOrderToDatabase(order) {
  try {
    // Save order to Firestore
    const orderRef = await addDoc(collection(db, "orders"), order);
    
    // Close checkout modal
    document.getElementById('checkoutModal').remove();
    
    // Show success message
    showSuccess("Order Placed", "Your order has been placed successfully! Order ID: " + orderRef.id);
    
    // Clear cart
    clearCart();
    
    // Redirect to dishes page after a short delay
    setTimeout(() => {
      window.location.href = "dishes.html";
    }, 3000);
  } catch (error) {
    console.error("Error saving order:", error);
    showError("Order Failed", "Failed to save order. Please try again.");
  }
}

// Show loading overlay
function showLoading(message) {
  const loadingHTML = `
    <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-[1001] flex items-center justify-center">
      <div class="bg-white rounded-xl p-6 max-w-sm w-full flex flex-col items-center">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lightpink mb-4"></div>
        <p class="text-lg text-gray-700">${message}</p>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

// Hide loading overlay
function hideLoading() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Checkout button
  const checkoutBtn = document.querySelector('.checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      processCheckout();
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