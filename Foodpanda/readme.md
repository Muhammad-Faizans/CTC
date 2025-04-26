# 🍽️ Foodpanda Clone

A fully responsive **Foodpanda Clone** web application built using **HTML**, **Tailwind CSS**, and **Firebase**. This project simulates an online food ordering system with both **Admin** and **User Dashboards**.

## 🚀 Features

### 👤 User Dashboard
- Browse food items with images and pricing
- Add products to cart
- Checkout with real-time order processing

### 🛠️ Admin Dashboard
- Add new food products (with name, price, image, etc.)
- Edit or delete existing products
- View and manage all customer orders

## 🧰 Tech Stack

- **Frontend**: HTML, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Authentication**: Firebase Email/Password

## 📁 Folder Structure

foodpanda-clone/ │ ├── index.html # Landing page ├── user-dashboard.html # User interface for browsing and checkout ├── admin-dashboard.html # Admin interface for product and order management ├── /css/ # Tailwind CSS styles ├── /js/ # JavaScript logic for interaction └── firebase-config.js # Firebase initialization and configuration

bash
Copy
Edit

## 🔧 Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/foodpanda-clone.git
   cd foodpanda-clone
Set up Firebase

Go to Firebase Console

Create a new Firebase project

Enable Firestore and Email/Password Authentication

Copy your Firebase config and paste it into firebase-config.js

Run the project

Open index.html in your browser

Or deploy with Firebase Hosting (see below)

📦 Deployment (Firebase Hosting)
To deploy the project on Firebase Hosting:

bash
Copy
Edit
firebase init
firebase deploy
Make sure you have the Firebase CLI installed and authenticated:

bash
Copy
Edit
npm install -g firebase-tools
firebase login
📸 Screenshots
Add screenshots of the User and Admin dashboards here to visually showcase your UI.

✨ Future Improvements
Integrate payment gateway (e.g., Stripe or Razorpay)

Add product filtering and search functionality

Order status updates and tracking

User profile and order history

Dark mode support

👨‍💻 Author
Muhammad Faizan

Programmed with ❤️ using Tailwind CSS and Firebase.
