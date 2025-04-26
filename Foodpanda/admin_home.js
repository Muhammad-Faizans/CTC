import { auth, db, isAdmin, showWarning } from './app.js';
import { collection, getDocs, query, where, orderBy, limit, getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is an admin
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userIsAdmin = await isAdmin(user.uid);
            
            if (!userIsAdmin) {
                showWarning("Access Denied", "You don't have permission to access this page.");
                window.location.href = "customer_home.html";
                return;
            }
            
            // Initialize the dashboard
            initAdminDashboard();
        } else {
            showWarning("Authentication Required", "Please login to access this page.");
            window.location.href = "index.html";
        }
    });
});

// Main initialization function
async function initAdminDashboard() {
    // Setup mobile menu toggle
    setupMobileMenu();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load dashboard data
    await loadDashboardStats();
    
    // Load recent orders
    await loadRecentOrders();
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

// Set up event listeners
function setupEventListeners() {
    // Handle settings button click
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = "admin_settings.html";
        });
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Get elements
        const totalDishesElement = document.getElementById('totalDishes');
        const totalOrdersElement = document.getElementById('totalOrders');
        const pendingOrdersElement = document.getElementById('pendingOrders');
        const welcomeMessageElement = document.getElementById('welcomeMessage');
        
        // Set default values in case of error
        if (totalDishesElement) totalDishesElement.textContent = '0';
        if (totalOrdersElement) totalOrdersElement.textContent = '0';
        if (pendingOrdersElement) pendingOrdersElement.textContent = '0';
        
        // Get current user data
        const user = auth.currentUser;
        if (user) {
            // Get user profile info if available
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().name) {
                    welcomeMessageElement.textContent = `Welcome, ${userDoc.data().name}`;
                } else {
                    welcomeMessageElement.textContent = `Welcome, ${user.email}`;
                }
            } catch (error) {
                console.error("Error getting user profile:", error);
                welcomeMessageElement.textContent = `Welcome, ${user.email}`;
            }
        }
        
        // Count total dishes
        try {
            const dishesRef = collection(db, 'dishes');
            const dishesSnapshot = await getDocs(dishesRef);
            const totalDishes = dishesSnapshot.size;
            
            if (totalDishesElement) totalDishesElement.textContent = totalDishes;
            console.log('Total dishes loaded:', totalDishes);
        } catch (error) {
            console.error('Error loading dishes:', error);
        }
        
        // Count total orders 
        try {
            const ordersRef = collection(db, 'orders');
            const ordersSnapshot = await getDocs(ordersRef);
            const totalOrders = ordersSnapshot.size;
            
            if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
            console.log('Total orders loaded:', totalOrders);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
        
        // Count pending orders
        try {
            const pendingOrdersQuery = query(
                collection(db, 'orders'), 
                where('status', '==', 'pending')
            );
            const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
            const pendingOrders = pendingOrdersSnapshot.size;
            
            if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
            console.log('Pending orders loaded:', pendingOrders);
            
            // If there are no pending orders but there is a status field with a different value
            if (pendingOrders === 0) {
                // Check if there are orders with no status field or status not set to pending
                const allOrdersSnapshot = await getDocs(collection(db, 'orders'));
                if (allOrdersSnapshot.size > 0) {
                    // Count orders that don't have a status field or have status that isn't "pending"
                    let defaultPendingCount = 0;
                    allOrdersSnapshot.forEach(doc => {
                        const orderData = doc.data();
                        if (!orderData.status || orderData.status === '') {
                            defaultPendingCount++;
                        }
                    });
                    
                    if (defaultPendingCount > 0 && pendingOrdersElement) {
                        pendingOrdersElement.textContent = defaultPendingCount;
                        console.log('Default pending orders:', defaultPendingCount);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading pending orders:', error);
        }
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to load dashboard statistics.',
            icon: 'error',
            confirmButtonColor: '#ff2b85'
        });
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        const recentOrdersContainer = document.getElementById('recentOrders');
        if (!recentOrdersContainer) return;
        
        // Clear loading spinner
        recentOrdersContainer.innerHTML = '';
        
        // Get 5 most recent orders - try different approaches
        let ordersSnapshot;
        
        try {
            // First try with timestamp field
            const timestampQuery = query(collection(db, 'orders'), orderBy('timestamp', 'desc'), limit(5));
            ordersSnapshot = await getDocs(timestampQuery);
            
            // If no results, try with createdAt field
            if (ordersSnapshot.empty) {
                console.log('No orders with timestamp field, trying createdAt');
                const createdAtQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
                ordersSnapshot = await getDocs(createdAtQuery);
            }
            
            // If still no results, get without ordering
            if (ordersSnapshot.empty) {
                console.log('No orders with timestamp or createdAt fields, fetching without order');
                const simpleQuery = query(collection(db, 'orders'), limit(5));
                ordersSnapshot = await getDocs(simpleQuery);
            }
        } catch (error) {
            console.error('Error with ordered query:', error);
            // Fallback to simple query
            const simpleQuery = query(collection(db, 'orders'), limit(5));
            ordersSnapshot = await getDocs(simpleQuery);
        }
        
        if (ordersSnapshot.empty) {
            recentOrdersContainer.innerHTML = '<p class="text-center py-4">No orders found.</p>';
            return;
        }
        
        console.log(`Found ${ordersSnapshot.size} orders to display`);
        
        // Create table for orders
        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.className = 'bg-gray-50';
        thead.innerHTML = `
            <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
        `;
        
        // Create table body
        const tbody = document.createElement('tbody');
        tbody.className = 'bg-white divide-y divide-gray-200';
        
        // Add order rows
        ordersSnapshot.forEach((doc, index) => {
            const order = { id: doc.id, ...doc.data() };
            console.log('Processing order:', order.id);
            
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            
            // Format date - check possible date fields
            let orderDate = 'N/A';
            if (order.timestamp && typeof order.timestamp.toDate === 'function') {
                orderDate = new Date(order.timestamp.toDate()).toLocaleDateString();
            } else if (order.createdAt && typeof order.createdAt.toDate === 'function') {
                orderDate = new Date(order.createdAt.toDate()).toLocaleDateString();
            } else if (order.orderDate) {
                orderDate = order.orderDate;
            } else if (order.date) {
                orderDate = order.date;
            }
            
            // Format total amount - check possible total fields
            let total = 'N/A';
            if (order.totalAmount !== undefined) {
                total = `PKR ${Number(order.totalAmount).toFixed(2)}`;
            } else if (order.total !== undefined) {
                total = `PKR ${Number(order.total).toFixed(2)}`;
            } else if (order.amount !== undefined) {
                total = `PKR ${Number(order.amount).toFixed(2)}`;
            }
            
            // Get customer email or name
            let customer = 'N/A';
            if (order.customerEmail) {
                customer = order.customerEmail;
            } else if (order.email) {
                customer = order.email;
            } else if (order.customerName) {
                customer = order.customerName;
            } else if (order.userId) {
                customer = `User: ${order.userId.substring(0, 6)}...`;
            }
            
            // Status badge class
            let status = order.status || 'Pending';
            let statusClass = '';
            
            switch(status.toLowerCase()) {
                case 'pending':
                    statusClass = 'bg-yellow-100 text-yellow-800';
                    break;
                case 'processing':
                    statusClass = 'bg-blue-100 text-blue-800';
                    break;
                case 'completed':
                    statusClass = 'bg-green-100 text-green-800';
                    break;
                case 'cancelled':
                case 'canceled':
                    statusClass = 'bg-red-100 text-red-800';
                    break;
                default:
                    statusClass = 'bg-gray-100 text-gray-800';
            }
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.id.slice(0, 8)}...</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${orderDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${total}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="admin.html#orders" class="text-lightpink hover:text-pink">View Details</a>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Assemble table
        table.appendChild(thead);
        table.appendChild(tbody);
        recentOrdersContainer.appendChild(table);
        
    } catch (error) {
        console.error('Error loading recent orders:', error);
        const recentOrdersContainer = document.getElementById('recentOrders');
        if (recentOrdersContainer) {
            recentOrdersContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading orders. Please try again later.</p>';
        }
    }
} 