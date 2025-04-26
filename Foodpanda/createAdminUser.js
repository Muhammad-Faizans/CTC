// This file is used to manually create admin users when needed.
// Run this file using Node.js from the command line.

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCuWETfPgHXczuOd51NEcSFRar82HHAif8",
  authDomain: "practice-eb7b1.firebaseapp.com",
  projectId: "practice-eb7b1",
  storageBucket: "practice-eb7b1.appspot.com",
  messagingSenderId: "194151170212",
  appId: "1:194151170212:web:4d588abb89f2fc0ea7a631",
  measurementId: "G-NBCFC635Q8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Creates a new admin user
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 */
async function createAdminUser(email, password) {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Add admin role to user in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: "admin",
      createdAt: new Date().toISOString()
    });
    
    console.log(`Admin user created successfully with ID: ${user.uid}`);
    return user;
  } catch (error) {
    console.error("Error creating admin user:", error);
    return null;
  }
}

// Get email and password from command line arguments
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

if (!email || !password) {
  console.error("Please provide email and password as arguments");
  console.log("Usage: node createAdminUser.js <email> <password>");
  process.exit(1);
}

// Create admin user
createAdminUser(email, password)
  .then(() => {
    console.log("Admin user creation complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });

// Usage: node createAdminUser.js admin@example.com password123 