import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCuWETfPgHXczuOd51NEcSFRar82HHAif8",
  authDomain: "practice-eb7b1.firebaseapp.com",
  projectId: "practice-eb7b1",
  storageBucket: "practice-eb7b1.firebasestorage.app",
  messagingSenderId: "194151170212",
  appId: "1:194151170212:web:4d588abb89f2fc0ea7a631",
  measurementId: "G-NBCFC635Q8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Function to display products
const displayProducts = () => {
  const productContainer = document.getElementById("product-container");
  
  // Set up real-time listener
  const endUpdates = onSnapshot(collection(db, "products"), (snapshot) => {
    productContainer.innerHTML = ""; // Clear existing content
    
    snapshot.forEach((doc) => {
      const productData = doc.data();
      const card = document.createElement("div");
      card.className = "col-md-4 mb-4";
      card.innerHTML = `
        <div class="card" style="width: 18rem;">
          <img class="card-img-top" src="${productData.image}" alt="${productData.name}">
          <div class="card-body">
            <h5 class="card-title">${productData.name}</h5>
            <p class="card-text">${productData.description}</p>
            <p class="card-text"><strong>Price: $${productData.price}</strong></p>
            <button class="btn btn-primary edit-btn" data-id="${doc.id}">Edit</button>
            <button class="btn btn-danger delete-btn" data-id="${doc.id}">Delete</button>
          </div>
        </div>
      `;
      productContainer.appendChild(card);
    });

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const productId = e.target.dataset.id;
        editProduct(productId);
      });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const productId = e.target.dataset.id;
        deleteProduct(productId);
      });
    });
  }, (error) => {
    console.error("Error getting products: ", error);
  });

  // Return the function to end real-time updates when needed
  return endUpdates;
};

// Function to edit a product
const editProduct = async (productId) => {
  try {
    const productRef = doc(db, "products", productId);
    const productDoc = await getDoc(productRef);
    
    if (productDoc.exists()) {
      const productData = productDoc.data();
      // Populate the modal with existing data
      document.getElementById("p-name").value = productData.name;
      document.getElementById("p-price").value = productData.price;
      document.getElementById("p-desc").value = productData.description;
      document.getElementById("p-image").value = productData.image;
      
      // Change the modal title and button
      document.getElementById("exampleModalLabel").textContent = "Edit Product";
      document.getElementById("addProduct").textContent = "Update Product";
      
      // Store the product ID for updating
      document.getElementById("addProduct").dataset.productId = productId;
      
      // Show the modal
      const modal = new bootstrap.Modal(document.getElementById('exampleModal'));
      modal.show();
    }
  } catch (error) {
    console.error("Error getting product: ", error);
  }
};

// Function to delete a product
const deleteProduct = async (productId) => {
  if (confirm("Are you sure you want to delete this product?")) {
    try {
      await deleteDoc(doc(db, "products", productId));
    } catch (error) {
      console.error("Error deleting product: ", error);
    }
  }
};

// Modify the addProduct event listener to handle both add and update
document.getElementById("addProduct").addEventListener("click", async () => {
  const p_name = document.getElementById("p-name").value;
  const p_price = document.getElementById("p-price").value;
  const p_desc = document.getElementById("p-desc").value;
  const p_img = document.getElementById("p-image").value;
  const productId = document.getElementById("addProduct").dataset.productId;

  try {
    if (productId) {
      // Update existing product
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, {
        name: p_name,
        price: p_price,
        description: p_desc,
        image: p_img,
      });
      // Reset the product ID
      document.getElementById("addProduct").dataset.productId = "";
    } else {
      // Add new product
      const docRef = await addDoc(collection(db, "products"), {
        name: p_name,
        price: p_price,
        description: p_desc,
        image: p_img,
      });
      console.log("Document written with ID: ", docRef.id);
    }
    
    // Reset form
    document.getElementById("exampleModal").querySelector("form").reset();
    
    // Hide the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('exampleModal'));
    modal.hide();
  } catch (e) {
    console.error("Error: ", e);
  }
});

// Function to reset the form when opening the modal for adding new product
function resetForm() {
  document.getElementById("exampleModalLabel").textContent = "New Product";
  document.getElementById("addProduct").textContent = "Add Product";
  document.getElementById("addProduct").dataset.productId = "";
  document.getElementById("exampleModal").querySelector("form").reset();
}

// Initialize products when the page loads
window.onload = function() {
  displayProducts();
};

