import { 
  db, auth, storage, 
  isAdmin, showError, showSuccess, showWarning, showConfirm 
} from './app.js';

import { 
  addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc, 
  query, orderBy, where, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is admin
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userIsAdmin = await isAdmin(user.uid);
      
      if (!userIsAdmin) {
        showWarning("Access Denied", "You don't have permission to access this page.");
        window.location.href = "customer_home.html";
      } else {
        // Initialize admin dashboard
        loadAllDishes();
        loadAllOrders();
        setupEventListeners();
      }
    } else {
      showWarning("Authentication Required", "Please login to access this page.");
      window.location.href = "index.html";
    }
  });
});

// ===== PRODUCT MANAGEMENT =====

// Add new dish
async function addDish(dishData) {
  try {
    // Add document to Firestore
    const docRef = await addDoc(collection(db, "dishes"), {
      ...dishData,
      contactNo: dishData.contactNo || '',
      address: dishData.address || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Get the document with the generated ID
    const newDish = await getDoc(docRef);
    
    showSuccess("Success", "Dish added successfully!");
    return { id: newDish.id, ...newDish.data() };
  } catch (error) {
    console.error("Error adding dish:", error);
    showError("Error", "Failed to add dish. Please try again.");
    return null;
  }
}

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

// Update dish
async function updateDish(id, dishData) {
  try {
    const dishRef = doc(db, "dishes", id);
    await updateDoc(dishRef, {
      ...dishData,
      updatedAt: serverTimestamp()
    });
    
    showSuccess("Success", "Dish updated successfully!");
    return true;
  } catch (error) {
    console.error("Error updating dish:", error);
    showError("Error", "Failed to update dish. Please try again.");
    return false;
  }
}

// Delete dish
async function deleteDish(id) {
  try {
    await deleteDoc(doc(db, "dishes", id));
    showSuccess("Success", "Dish deleted successfully!");
    return true;
  } catch (error) {
    console.error("Error deleting dish:", error);
    showError("Error", "Failed to delete dish. Please try again.");
    return false;
  }
}

// Load all dishes into the UI
async function loadAllDishes() {
  const dishesContainer = document.getElementById('dishesList');
  if (!dishesContainer) return;
  
  dishesContainer.innerHTML = '<div class="flex justify-center my-8"><div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-lightpink"></div></div>';
  
  const dishes = await getAllDishes();
  
  if (dishes.length === 0) {
    dishesContainer.innerHTML = `
      <div class="bg-white rounded-xl shadow-card p-8 text-center">
        <img src="images/empty.svg" alt="No dishes" class="w-32 h-32 mx-auto mb-4">
        <h3 class="text-xl font-semibold text-gray-700 mb-2">No Dishes Found</h3>
        <p class="text-gray-500">You haven't added any dishes yet. Add your first dish to get started!</p>
      </div>
    `;
    return;
  }
  
  let dishesHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  `;
  
  dishes.forEach(dish => {
    dishesHTML += `
      <div class="bg-white rounded-xl shadow-card overflow-hidden" data-id="${dish.id}">
        <div class="h-48 overflow-hidden relative">
          <img src="${dish.imageUrl}" alt="${dish.name}" class="w-full h-full object-cover">
          <div class="absolute top-2 right-2 flex space-x-2">
            <button class="edit-dish-btn bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors" data-id="${dish.id}">
              <i class="fa-solid fa-pencil text-lightpink"></i>
            </button>
            <button class="delete-dish-btn bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors" data-id="${dish.id}">
              <i class="fa-solid fa-trash text-red-500"></i>
            </button>
          </div>
        </div>
        <div class="p-4">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-xl font-semibold text-bluishgrey">${dish.name}</h3>
            <span class="bg-lightpink text-white text-sm py-1 px-2 rounded">${dish.category}</span>
          </div>
          <p class="text-gray-500 mb-3 line-clamp-2">${dish.description}</p>
          <div class="flex flex-col gap-1 mb-3">
            ${dish.contactNo ? `<p class="text-sm text-gray-600"><i class="fas fa-phone-alt text-lightpink mr-2"></i>${dish.contactNo}</p>` : ''}
            ${dish.address ? `<p class="text-sm text-gray-600"><i class="fas fa-map-marker-alt text-lightpink mr-2"></i>${dish.address}</p>` : ''}
          </div>
          <div class="flex justify-between items-center">
            <span class="text-lg font-bold text-lightpink">PKR ${dish.price}</span>
          </div>
        </div>
      </div>
    `;
  });
  
  dishesHTML += `</div>`;
  dishesContainer.innerHTML = dishesHTML;
  
  // Add event listeners for edit and delete buttons
  document.querySelectorAll('.edit-dish-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const dishId = btn.getAttribute('data-id');
      openEditDishModal(dishId);
    });
  });
  
  document.querySelectorAll('.delete-dish-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const dishId = btn.getAttribute('data-id');
      confirmDeleteDish(dishId);
    });
  });
}

// Confirm delete dish
async function confirmDeleteDish(dishId) {
  const result = await showConfirm("Delete Dish", "Are you sure you want to delete this dish? This action cannot be undone.");
  
  if (result.isConfirmed) {
    const deleted = await deleteDish(dishId);
    if (deleted) {
      // Refresh dishes list
      loadAllDishes();
    }
  }
}

// Open edit dish modal
async function openEditDishModal(dishId) {
  try {
    const dishDoc = await getDoc(doc(db, "dishes", dishId));
    
    if (dishDoc.exists()) {
      const dish = {
        id: dishDoc.id,
        ...dishDoc.data()
      };
      
      // Fill edit form with dish data
      document.getElementById('editDishId').value = dish.id;
      document.getElementById('editDishName').value = dish.name;
      document.getElementById('editDishPrice').value = dish.price;
      document.getElementById('editDishDescription').value = dish.description;
      document.getElementById('editDishCategory').value = dish.category;
      document.getElementById('editDishImageUrl').value = dish.imageUrl;
      document.getElementById('editDishContactNo').value = dish.contactNo || '';
      document.getElementById('editDishAddress').value = dish.address || '';
      
      // Show edit modal
      document.getElementById('editDishModal').classList.remove('hidden');
    } else {
      showError("Error", "Dish not found.");
    }
  } catch (error) {
    console.error("Error opening edit modal:", error);
    showError("Error", "Failed to load dish data.");
  }
}

// ===== ORDER MANAGEMENT =====

// Get all orders
async function getAllOrders() {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return orders;
  } catch (error) {
    console.error("Error getting orders:", error);
    showError("Error", "Failed to load orders.");
    return [];
  }
}

// Update order status
async function updateOrderStatus(orderId, status) {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status: status,
      updatedAt: serverTimestamp()
    });
    
    showSuccess("Success", "Order status updated successfully!");
    return true;
  } catch (error) {
    console.error("Error updating order status:", error);
    showError("Error", "Failed to update order status.");
    return false;
  }
}

// Load all orders into the UI
async function loadAllOrders() {
  const ordersContainer = document.getElementById('ordersList');
  if (!ordersContainer) return;
  
  ordersContainer.innerHTML = '<div class="flex justify-center my-8"><div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-lightpink"></div></div>';
  
  const orders = await getAllOrders();
  
  if (orders.length === 0) {
    ordersContainer.innerHTML = `
      <div class="bg-white rounded-xl shadow-card p-8 text-center">
        
        <h3 class="text-xl font-semibold text-gray-700 mb-2">No Orders Found</h3>
        <p class="text-gray-500">There are no customer orders yet.</p>
      </div>
    `;
    return;
  }
  
  let ordersHTML = `
    <div class="bg-white rounded-xl shadow-card overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
  `;
  
  orders.forEach(order => {
    const orderDate = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
    
    let statusBadgeClass = '';
    switch(order.status) {
      case 'pending':
        statusBadgeClass = 'bg-yellow-100 text-yellow-800';
        break;
      case 'processing':
        statusBadgeClass = 'bg-blue-100 text-blue-800';
        break;
      case 'completed':
        statusBadgeClass = 'bg-green-100 text-green-800';
        break;
      case 'cancelled':
        statusBadgeClass = 'bg-red-100 text-red-800';
        break;
      default:
        statusBadgeClass = 'bg-gray-100 text-gray-800';
    }
    
    ordersHTML += `
      <tr data-id="${order.id}">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-bluishgrey">${order.id.substring(0, 8)}...</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.customerEmail}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${orderDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-lightpink">PKR ${order.totalAmount.toFixed(2)}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass}">
            ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button class="view-order-btn text-lightpink hover:text-pink mr-3" data-id="${order.id}">View</button>
          <select class="order-status-select text-sm border border-gray-300 rounded p-1" data-id="${order.id}">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `;
  });
  
  ordersHTML += `
        </tbody>
      </table>
    </div>
  `;
  
  ordersContainer.innerHTML = ordersHTML;
  
  // Add event listeners for order actions
  document.querySelectorAll('.view-order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-id');
      openOrderDetailsModal(orderId);
    });
  });
  
  document.querySelectorAll('.order-status-select').forEach(select => {
    select.addEventListener('change', async () => {
      const orderId = select.getAttribute('data-id');
      const newStatus = select.value;
      
      const updated = await updateOrderStatus(orderId, newStatus);
      if (updated) {
        // Refresh orders list
        loadAllOrders();
      }
    });
  });
}

// Open order details modal
async function openOrderDetailsModal(orderId) {
  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (orderSnap.exists()) {
      const order = {
        id: orderSnap.id,
        ...orderSnap.data()
      };
      
      // Create modal HTML
      let modalHTML = `
        <div id="orderDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 z-[1000] flex items-center justify-center">
          <div class="bg-white rounded-xl shadow-modal w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between p-4 border-b">
              <h3 class="text-xl font-medium text-gray-900">Order Details</h3>
              <button type="button" class="close-order-modal text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg p-1.5 ml-auto inline-flex items-center">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
              </button>
            </div>
            <div class="p-6">
              <div class="mb-6">
                <div class="flex justify-between items-center mb-4">
                  <h4 class="text-lg font-semibold text-gray-900">Order Information</h4>
                  <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(order.status)}">
                    ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-gray-500">Order ID:</p>
                    <p class="font-medium text-bluishgrey">${order.id}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Date:</p>
                    <p class="font-medium text-bluishgrey">${order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Customer Email:</p>
                    <p class="font-medium text-bluishgrey">${order.customerEmail}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Payment Method:</p>
                    <p class="font-medium text-bluishgrey">${order.paymentMethod || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div class="mb-6">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h4>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p>${order.shippingAddress?.name || 'N/A'}</p>
                  <p>${order.shippingAddress?.street || 'N/A'}</p>
                  <p>${order.shippingAddress?.city || 'N/A'}, ${order.shippingAddress?.zip || 'N/A'}</p>
                  <p>${order.shippingAddress?.phone || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Order Items</h4>
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
                    <tbody class="divide-y divide-gray-200">
      `;
      
      order.items.forEach(item => {
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
                
                <div class="mt-4 border-t pt-4">
                  <div class="flex justify-between items-center">
                    <span class="text-lg font-bold text-bluishgrey">Total:</span>
                    <span class="text-lg font-bold text-lightpink">PKR ${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="p-4 border-t flex justify-end space-x-3">
              <button type="button" class="close-order-modal py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Close</button>
              <button type="button" class="update-status-btn py-2 px-4 bg-lightpink text-white rounded-lg hover:bg-pink transition-colors" data-id="${order.id}">Update Status</button>
            </div>
          </div>
        </div>
      `;
      
      // Append modal to body
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Add event listeners
      document.querySelectorAll('.close-order-modal').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('orderDetailsModal').remove();
        });
      });
      
      document.querySelector('.update-status-btn').addEventListener('click', () => {
        // Open status update dropdown
        const orderId = document.querySelector('.update-status-btn').getAttribute('data-id');
        document.querySelector(`.order-status-select[data-id="${orderId}"]`).focus();
        document.getElementById('orderDetailsModal').remove();
      });
      
    } else {
      showError("Error", "Order not found.");
    }
  } catch (error) {
    console.error("Error opening order details:", error);
    showError("Error", "Failed to load order details.");
  }
}

// Helper function for status badge class
function getStatusBadgeClass(status) {
  switch(status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Add Dish Modal Toggle
  const addDishOpenBtn = document.getElementById('addDishOpenBtn');
  
  if (addDishOpenBtn) {
    addDishOpenBtn.addEventListener('click', () => {
      document.getElementById('addDishModal').classList.remove('hidden');
    });
  }
  
  // Close Modals
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#addDishModal, #editDishModal').forEach(modal => {
        modal.classList.add('hidden');
      });
    });
  });
  
  // Save Dish Button
  const saveDishBtn = document.getElementById('saveDishBtn');
  
  if (saveDishBtn) {
    saveDishBtn.addEventListener('click', async () => {
      // Get form data
      const name = document.getElementById('dishName').value;
      const price = parseFloat(document.getElementById('dishPrice').value);
      const description = document.getElementById('dishDescription').value;
      const category = document.getElementById('dishCategory').value;
      const imageUrl = document.getElementById('dishImageUrl').value;
      const contactNo = document.getElementById('dishContactNo').value;
      const address = document.getElementById('dishAddress').value;
      
      // Validate form data
      if (!name || !price || !description || !category || !imageUrl) {
        showError("Error", "Please fill all required fields.");
        return;
      }
      
      // Create dish object
      const dishData = {
        name,
        price,
        description,
        category,
        imageUrl,
        contactNo,
        address
      };
      
      // Add dish to Firestore
      const newDish = await addDish(dishData);
      
      if (newDish) {
        // Reset form
        document.getElementById('addDishForm').reset();
        
        // Hide modal
        document.getElementById('addDishModal').classList.add('hidden');
        
        // Refresh dishes list
        loadAllDishes();
      }
    });
  }
  
  // Update Dish Button
  const updateDishBtn = document.getElementById('updateDishBtn');
  
  if (updateDishBtn) {
    updateDishBtn.addEventListener('click', async () => {
      // Get form data
      const id = document.getElementById('editDishId').value;
      const name = document.getElementById('editDishName').value;
      const price = parseFloat(document.getElementById('editDishPrice').value);
      const description = document.getElementById('editDishDescription').value;
      const category = document.getElementById('editDishCategory').value;
      const imageUrl = document.getElementById('editDishImageUrl').value;
      const contactNo = document.getElementById('editDishContactNo').value;
      const address = document.getElementById('editDishAddress').value;
      
      // Validate form data
      if (!id || !name || !price || !description || !category || !imageUrl) {
        showError("Error", "Please fill all required fields.");
        return;
      }
      
      // Create dish object
      const dishData = {
        name,
        price,
        description,
        category,
        imageUrl,
        contactNo,
        address
      };
      
      // Update dish in Firestore
      const updated = await updateDish(id, dishData);
      
      if (updated) {
        // Hide modal
        document.getElementById('editDishModal').classList.add('hidden');
        
        // Refresh dishes list
        loadAllDishes();
      }
    });
  }
  
  // Tab switching
  const tabs = document.querySelectorAll('.admin-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active-tab'));
        
        // Add active class to clicked tab
        tab.classList.add('active-tab');
        
        // Hide all tab contents
        tabContents.forEach(content => content.classList.add('hidden'));
        
        // Show selected tab content
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.remove('hidden');
        
        // Load data for specific tabs
        if (tabId === 'orders-tab') {
          loadAllOrders();
        }
      });
    });
  }
}; 