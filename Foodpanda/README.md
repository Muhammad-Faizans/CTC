# Foodpanda Admin System

A comprehensive administration system for the Foodpanda food delivery application, built with JavaScript, Firebase, and Tailwind CSS.

## Features

### Admin Dashboard
- Overview statistics (total dishes, orders, pending orders)
- Quick action buttons for common tasks
- Recent orders display with status indicators

### Product Management
- Add new dishes with detailed information
- Edit existing dishes (name, price, description, etc.)
- Delete dishes from the system
- Categorize dishes (Appetizer, Main Course, Dessert, Beverage)

### Order Management
- View all orders with filtering options
- Update order status (pending, processing, completed, cancelled)
- Detailed order view with customer and item information

### Admin Settings
- **Account Management**
  - Update profile information
  - Change profile picture
  - Manage personal details

- **Statistics**
  - Total orders, revenue, products, and customers analytics
  - Revenue overview chart (monthly trends)
  - Order status distribution chart
  - Popular products tracking
  - Data export functionality

- **Security**
  - Password management
  - Two-factor authentication
  - Email notification preferences
  - Account deactivation options

## Technical Implementation

- **Authentication**: Firebase Authentication for secure user management
- **Database**: Firestore for real-time data storage
- **UI Framework**: Tailwind CSS for responsive design
- **Charts**: Chart.js for data visualization
- **Notifications**: SweetAlert2 for user feedback

## Responsive Design
- Mobile-friendly interface with hamburger menu
- Adaptive layouts for different screen sizes
- Consistent navigation across all admin pages

## Getting Started

1. Clone the repository
2. Set up a Firebase project and update the configuration
3. Deploy to your preferred hosting service

## Pages
- `admin_home.html` - Main dashboard with statistics overview
- `admin.html` - Product and order management interface
- `admin_settings.html` - User profile, statistics and security settings

## JavaScript Files
- `admin_home.js` - Dashboard functionality
- `admin.js` - Products and orders management
- `admin_settings.js` - Settings page functionality
- `app.js` - Core application functionality and Firebase integration

## License

This project is licensed under the MIT License. 