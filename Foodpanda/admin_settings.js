import { 
  db, auth, storage, 
  isAdmin, showError, showSuccess, showWarning, showConfirm 
} from './app.js';

import { 
  updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import { 
  doc, getDoc, updateDoc, collection, query, 
  where, getDocs, orderBy, limit, 
  Timestamp, startOfMonth, endOfMonth,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

import { 
  ref, uploadBytesResumable, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";

// Charts
let revenueChart = null;
let orderChart = null;

// Initialize the admin settings page
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is admin
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userIsAdmin = await isAdmin(user.uid);
      
      if (!userIsAdmin) {
        showWarning("Access Denied", "You don't have permission to access this page.");
        window.location.href = "customer_home.html";
      } else {
        // Initialize admin settings
        loadAdminProfile(user);
        setupEventListeners();
        
        // Initial load of statistics if statistics tab is visible
        if (!document.getElementById('statistics-tab').classList.contains('hidden')) {
          await loadStatistics();
        }
      }
    } else {
      showWarning("Authentication Required", "Please login to access this page.");
      window.location.href = "index.html";
    }
  });
});

// ===== ACCOUNT MANAGEMENT =====

// Load admin profile
async function loadAdminProfile(user) {
  try {
    // Set email from auth
    document.getElementById('adminEmail').value = user.email;
    
    // Get additional profile data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Set profile fields
      if (userData.name) document.getElementById('adminName').value = userData.name;
      if (userData.phone) document.getElementById('adminPhone').value = userData.phone;
      if (userData.address) document.getElementById('adminAddress').value = userData.address;
      
      // Set profile pic if exists
      if (userData.photoURL) {
        document.getElementById('adminProfilePic').src = userData.photoURL;
      }
    }
  } catch (error) {
    console.error("Error loading admin profile:", error);
    showError("Error", "Failed to load profile information.");
  }
}

// Update admin profile
async function updateAdminProfile(profileData) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    
    // Update in Firestore
    await updateDoc(doc(db, "users", user.uid), {
      ...profileData,
      updatedAt: serverTimestamp()
    });
    
    showSuccess("Success", "Profile updated successfully!");
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    showError("Error", "Failed to update profile. Please try again.");
    return false;
  }
}

// Upload profile photo
async function uploadProfilePhoto(file) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    
    // Create a storage reference
    const storageRef = ref(storage, `profile_photos/${user.uid}_${Date.now()}`);
    
    // Upload file
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Register event handlers for the upload
    uploadTask.on('state_changed', 
      (snapshot) => {
        // Progress function
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      }, 
      (error) => {
        // Error function
        console.error("Upload failed:", error);
        showError("Error", "Failed to upload profile photo.");
      }, 
      async () => {
        // Success function
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        // Update profile URL in Firestore
        await updateDoc(doc(db, "users", user.uid), {
          photoURL: downloadURL,
          updatedAt: serverTimestamp()
        });
        
        // Update UI
        document.getElementById('adminProfilePic').src = downloadURL;
        
        showSuccess("Success", "Profile photo updated successfully!");
      }
    );
  } catch (error) {
    console.error("Error in photo upload:", error);
    showError("Error", "Failed to upload profile photo.");
  }
}

// ===== STATISTICS =====

// Load statistics data
async function loadStatistics() {
  try {
    console.log("Loading statistics data...");
    
    await Promise.all([
      loadOrderStats(),
      loadRevenueStats(),
      loadProductStats(),
      loadCustomerStats(),
      loadPopularProducts()
    ]);
    
    console.log("Statistics loaded successfully");
    
    // Initialize charts
    setTimeout(() => {
      console.log("Initializing charts...");
      initRevenueChart();
      initOrderChart();
      console.log("Charts initialized");
    }, 100);
  } catch (error) {
    console.error("Error loading statistics:", error);
    showError("Error", "Failed to load statistics data.");
  }
}

// Load order statistics
async function loadOrderStats() {
  try {
    console.log("Loading order stats...");
    
    // Get all orders
    const ordersQuery = query(collection(db, "orders"));
    const ordersSnapshot = await getDocs(ordersQuery);
    
    // Update orders count
    const ordersCount = ordersSnapshot.size;
    console.log("Order count:", ordersCount);
    
    const totalOrdersElement = document.getElementById('totalOrdersCount');
    if (totalOrdersElement) {
      totalOrdersElement.textContent = ordersCount.toString();
    } else {
      console.error("Element 'totalOrdersCount' not found");
    }
    
    return ordersCount;
  } catch (error) {
    console.error("Error loading order stats:", error);
    return 0;
  }
}

// Load revenue statistics
async function loadRevenueStats() {
  try {
    console.log("Loading revenue stats...");
    
    // Get all orders
    const ordersQuery = query(collection(db, "orders"));
    const ordersSnapshot = await getDocs(ordersQuery);
    
    // Calculate total revenue
    let totalRevenue = 0;
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      if (orderData.totalAmount) {
        totalRevenue += parseFloat(orderData.totalAmount);
      }
    });
    
    console.log("Total revenue:", totalRevenue);
    
    // Format and update revenue display
    const formattedRevenue = new Intl.NumberFormat('en-US').format(totalRevenue);
    const totalRevenueElement = document.getElementById('totalRevenue');
    if (totalRevenueElement) {
      totalRevenueElement.textContent = `PKR ${formattedRevenue}`;
    } else {
      console.error("Element 'totalRevenue' not found");
    }
    
    return totalRevenue;
  } catch (error) {
    console.error("Error loading revenue stats:", error);
    return 0;
  }
}

// Load product statistics
async function loadProductStats() {
  try {
    console.log("Loading product stats...");
    
    // Get all products
    const productsQuery = query(collection(db, "dishes"));
    const productsSnapshot = await getDocs(productsQuery);
    
    // Update products count
    const productsCount = productsSnapshot.size;
    console.log("Product count:", productsCount);
    
    const totalProductsElement = document.getElementById('totalProductsCount');
    if (totalProductsElement) {
      totalProductsElement.textContent = productsCount.toString();
    } else {
      console.error("Element 'totalProductsCount' not found");
    }
    
    return productsCount;
  } catch (error) {
    console.error("Error loading product stats:", error);
    return 0;
  }
}

// Load customer statistics
async function loadCustomerStats() {
  try {
    console.log("Loading customer stats...");
    
    // Get all customers (users with role "customer")
    const customersQuery = query(
      collection(db, "users"), 
      where("role", "==", "customer")
    );
    const customersSnapshot = await getDocs(customersQuery);
    
    // Update customers count
    const customersCount = customersSnapshot.size;
    console.log("Customer count:", customersCount);
    
    const totalCustomersElement = document.getElementById('totalCustomersCount');
    if (totalCustomersElement) {
      totalCustomersElement.textContent = customersCount.toString();
    } else {
      console.error("Element 'totalCustomersCount' not found");
    }
    
    return customersCount;
  } catch (error) {
    console.error("Error loading customer stats:", error);
    return 0;
  }
}

// Load popular products
async function loadPopularProducts() {
  try {
    console.log("Loading popular products...");
    
    // Get all order items to calculate popularity
    const orderItemsQuery = query(collection(db, "orderItems"));
    const orderItemsSnapshot = await getDocs(orderItemsQuery);
    
    // Create a map to count product occurrences and revenue
    const productStats = new Map();
    
    // Process each order item
    orderItemsSnapshot.forEach(doc => {
      const item = doc.data();
      const productId = item.productId;
      const quantity = parseInt(item.quantity) || 1;
      const price = parseFloat(item.price) || 0;
      const totalPrice = price * quantity;
      
      if (productStats.has(productId)) {
        const stats = productStats.get(productId);
        stats.orderCount += 1;
        stats.quantity += quantity;
        stats.revenue += totalPrice;
      } else {
        productStats.set(productId, {
          productId,
          orderCount: 1,
          quantity,
          revenue: totalPrice,
          name: item.name || 'Unknown Product',
          category: item.category || 'Uncategorized',
          price: price
        });
      }
    });
    
    // Convert map to array and sort by order count (popularity)
    let popularProducts = Array.from(productStats.values())
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10); // Top 10 products
    
    console.log("Popular products:", popularProducts);
    
    // Populate the popular products table
    const tableBody = document.getElementById('popularProductsTable');
    if (!tableBody) {
      console.error("Element 'popularProductsTable' not found");
      return [];
    }
    
    if (popularProducts.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-gray-500">
            No order data available
          </td>
        </tr>
      `;
      return [];
    }
    
    let tableContent = '';
    popularProducts.forEach(product => {
      tableContent += `
        <tr>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${product.name}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-500">${product.category}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900">PKR ${product.price}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900">${product.orderCount}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900">PKR ${Math.round(product.revenue)}</div>
          </td>
        </tr>
      `;
    });
    
    tableBody.innerHTML = tableContent;
    
    return popularProducts;
  } catch (error) {
    console.error("Error loading popular products:", error);
    return [];
  }
}

// Initialize Revenue Chart
function initRevenueChart() {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;
  
  // Sample data - in a real app, this would come from the database
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data = {
    labels: months,
    datasets: [{
      label: 'Monthly Revenue (PKR)',
      data: [12000, 19000, 15000, 22000, 24000, 18000, 23000, 28000, 30000, 25000, 32000, 35000],
      backgroundColor: 'rgba(255, 43, 133, 0.2)',
      borderColor: 'rgba(255, 43, 133, 1)',
      borderWidth: 2,
      tension: 0.3
    }]
  };
  
  // Destroy existing chart if it exists
  if (revenueChart) {
    revenueChart.destroy();
  }
  
  // Create new chart
  revenueChart = new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            drawBorder: false
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Initialize Order Chart
function initOrderChart() {
  const ctx = document.getElementById('orderChart');
  if (!ctx) return;
  
  // Sample data - in a real app, this would come from the database
  const data = {
    labels: ['Completed', 'Pending', 'Cancelled'],
    datasets: [{
      label: 'Order Status',
      data: [65, 20, 15],
      backgroundColor: [
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 193, 7, 0.7)',
        'rgba(255, 99, 132, 0.7)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(255, 99, 132, 1)'
      ],
      borderWidth: 1
    }]
  };
  
  // Destroy existing chart if it exists
  if (orderChart) {
    orderChart.destroy();
  }
  
  // Create new chart
  orderChart = new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// ===== SECURITY =====

// Change password
async function changePassword(currentPassword, newPassword) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    
    // Create credential with current password
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );
    
    // Reauthenticate
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
    
    showSuccess("Success", "Password updated successfully!");
    return true;
  } catch (error) {
    console.error("Error changing password:", error);
    
    // More specific error messages
    if (error.code === 'auth/wrong-password') {
      showError("Error", "Current password is incorrect.");
    } else if (error.code === 'auth/weak-password') {
      showError("Error", "New password is too weak. Please use a stronger password.");
    } else {
      showError("Error", "Failed to update password. Please try again.");
    }
    
    return false;
  }
}

// Toggle two-factor authentication
async function toggleTwoFactorAuth(enabled) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    
    // Update in Firestore
    await updateDoc(doc(db, "users", user.uid), {
      twoFactorEnabled: enabled,
      updatedAt: serverTimestamp()
    });
    
    showSuccess("Success", `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully!`);
    return true;
  } catch (error) {
    console.error("Error toggling 2FA:", error);
    showError("Error", "Failed to update two-factor authentication settings.");
    return false;
  }
}

// Toggle email notifications
async function toggleEmailNotifications(enabled) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    
    // Update in Firestore
    await updateDoc(doc(db, "users", user.uid), {
      emailNotificationsEnabled: enabled,
      updatedAt: serverTimestamp()
    });
    
    showSuccess("Success", `Email notifications ${enabled ? 'enabled' : 'disabled'} successfully!`);
    return true;
  } catch (error) {
    console.error("Error toggling email notifications:", error);
    showError("Error", "Failed to update email notification settings.");
    return false;
  }
}

// Deactivate account
async function deactivateAccount() {
  try {
    const result = await showConfirm(
      "Deactivate Account",
      "Are you sure you want to deactivate your account? This will make your account inactive but will not delete your data."
    );
    
    if (result.isConfirmed) {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");
      
      // Update status in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        active: false,
        deactivatedAt: serverTimestamp()
      });
      
      showSuccess("Success", "Your account has been deactivated successfully.");
      
      // Sign out
      await auth.signOut();
      window.location.href = "index.html";
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error deactivating account:", error);
    showError("Error", "Failed to deactivate account. Please try again.");
    return false;
  }
}

// ===== EVENT LISTENERS =====

function setupEventListeners() {
  // Tab switching
  const tabs = document.querySelectorAll('.settings-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      // Remove active class from all tabs
      tabs.forEach(t => {
        t.classList.remove('active-tab');
        t.classList.add('text-gray-600');
      });
      
      // Add active class to clicked tab
      tab.classList.add('active-tab');
      tab.classList.remove('text-gray-600');
      
      // Hide all tab content
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => {
        content.classList.add('hidden');
      });
      
      // Show selected tab content
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(tabId).classList.remove('hidden');
      
      // Initialize charts if statistics tab is selected
      if (tabId === 'statistics-tab') {
        console.log("Statistics tab selected, loading statistics...");
        await loadStatistics();
      }
    });
  });
  
  // Profile form submission
  const profileForm = document.getElementById('updateProfileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const profileData = {
        name: document.getElementById('adminName').value,
        phone: document.getElementById('adminPhone').value,
        address: document.getElementById('adminAddress').value
      };
      
      await updateAdminProfile(profileData);
    });
  }
  
  // Profile photo upload
  const photoUpload = document.getElementById('profilePicUpload');
  if (photoUpload) {
    photoUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        uploadProfilePhoto(file);
      }
    });
  }
  
  // Change password form
  const passwordForm = document.getElementById('changePasswordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        showError("Error", "New passwords do not match.");
        return;
      }
      
      // Change password
      const success = await changePassword(currentPassword, newPassword);
      if (success) {
        // Reset form
        passwordForm.reset();
      }
    });
  }
  
  // Two-factor authentication toggle
  const twoFactorToggle = document.getElementById('twoFactorToggle');
  if (twoFactorToggle) {
    twoFactorToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      
      if (enabled) {
        // Show setup section when enabling
        document.getElementById('twoFactorSetupSection').classList.remove('hidden');
      } else {
        // Hide setup section when disabling
        document.getElementById('twoFactorSetupSection').classList.add('hidden');
        await toggleTwoFactorAuth(false);
      }
    });
  }
  
  // Two-factor verification button
  const verifyTwoFactorBtn = document.getElementById('verifyTwoFactorBtn');
  if (verifyTwoFactorBtn) {
    verifyTwoFactorBtn.addEventListener('click', async () => {
      const verificationCode = document.getElementById('verificationCode').value;
      
      if (!verificationCode || verificationCode.length !== 6) {
        showError("Error", "Please enter a valid 6-digit verification code.");
        return;
      }
      
      // Here you would verify the code with a real 2FA implementation
      // For this example, we'll just simulate success
      await toggleTwoFactorAuth(true);
      document.getElementById('twoFactorSetupSection').classList.add('hidden');
    });
  }
  
  // Email notifications toggles
  const loginNotifToggle = document.getElementById('loginNotificationToggle');
  if (loginNotifToggle) {
    loginNotifToggle.addEventListener('change', (e) => {
      toggleEmailNotifications(e.target.checked);
    });
  }
  
  const passwordChangeNotifToggle = document.getElementById('passwordChangeNotificationToggle');
  if (passwordChangeNotifToggle) {
    passwordChangeNotifToggle.addEventListener('change', (e) => {
      toggleEmailNotifications(e.target.checked);
    });
  }
  
  // Export data buttons
  const exportOrdersBtn = document.getElementById('exportOrdersBtn');
  if (exportOrdersBtn) {
    exportOrdersBtn.addEventListener('click', () => {
      showSuccess("Export Started", "Orders data export has been initiated. You will receive the file shortly.");
      // In a real app, this would trigger a backend export process
    });
  }
  
  const exportProductsBtn = document.getElementById('exportProductsBtn');
  if (exportProductsBtn) {
    exportProductsBtn.addEventListener('click', () => {
      showSuccess("Export Started", "Products data export has been initiated. You will receive the file shortly.");
      // In a real app, this would trigger a backend export process
    });
  }
  
  const exportRevenueBtn = document.getElementById('exportRevenueBtn');
  if (exportRevenueBtn) {
    exportRevenueBtn.addEventListener('click', () => {
      showSuccess("Export Started", "Revenue data export has been initiated. You will receive the file shortly.");
      // In a real app, this would trigger a backend export process
    });
  }
  
  // Deactivate account button
  const deactivateBtn = document.getElementById('deactivateAccountBtn');
  if (deactivateBtn) {
    deactivateBtn.addEventListener('click', () => {
      deactivateAccount();
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
  
  // Logout button
  document.querySelectorAll('#logoutBtn, #mobileLogoutBtn').forEach(btn => {
    if (btn) {
      btn.addEventListener('click', async () => {
        try {
          await auth.signOut();
          window.location.href = "index.html";
        } catch (error) {
          console.error("Error signing out:", error);
          showError("Error", "Failed to log out.");
        }
      });
    }
  });
} 