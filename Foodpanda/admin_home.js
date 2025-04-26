import { auth, db, isAdmin, showWarning } from './app.js';
import { collection, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
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
            Swal.fire({
                title: 'Settings',
                text: 'Admin settings panel will be available soon!',
                icon: 'info',
                confirmButtonColor: '#ff2b85'
            });
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
        
        // Get current user data
        const user = auth.currentUser;
        if (user) {
            welcomeMessageElement.textContent = `Welcome, ${user.email}`;
        }
        
        // Count total dishes
        const dishesSnapshot = await getDocs(collection(db, 'dishes'));
        const totalDishes = dishesSnapshot.size;
        
        // Count total orders
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const totalOrders = ordersSnapshot.size;
        
        // Count pending orders
        const pendingOrdersQuery = query(collection(db, 'orders'), where('status', '==', 'pending'));
        const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
        const pendingOrders = pendingOrdersSnapshot.size;
        
        // Update the UI
        if (totalDishesElement) totalDishesElement.textContent = totalDishes;
        if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
        if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
        
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
        
        // Get 5 most recent orders
        const ordersQuery = query(collection(db, 'orders'), orderBy('timestamp', 'desc'), limit(5));
        const ordersSnapshot = await getDocs(ordersQuery);
        
        if (ordersSnapshot.empty) {
            recentOrdersContainer.innerHTML = '<p class="text-center py-4">No orders found.</p>';
            return;
        }
        
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
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            
            // Format date
            const orderDate = order.timestamp ? new Date(order.timestamp.toDate()).toLocaleDateString() : 'N/A';
            
            // Format total
            const total = order.total ? `$${parseFloat(order.total).toFixed(2)}` : 'N/A';
            
            // Status badge class
            let statusClass = '';
            switch(order.status?.toLowerCase()) {
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
                    statusClass = 'bg-red-100 text-red-800';
                    break;
                default:
                    statusClass = 'bg-gray-100 text-gray-800';
            }
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.id.slice(0, 8)}...</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.customerEmail || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${orderDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${total}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${order.status || 'N/A'}
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