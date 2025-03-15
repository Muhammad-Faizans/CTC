import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCuWETfPgHXczuOd51NEcSFRar82HHAif8",
    authDomain: "practice-eb7b1.firebaseapp.com",
    projectId: "practice-eb7b1",
    storageBucket: "practice-eb7b1.firebasestorage.app",
    messagingSenderId: "194151170212",
    appId: "1:194151170212:web:4d588abb89f2fc0ea7a631",
    measurementId: "G-NBCFC635Q8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get Elements
const ul = document.getElementById("ul");
const addBtn = document.getElementById("addBtn");
const updateBtn = document.getElementById("updateBtn");
const input = document.getElementById("inp");

let editId = null; // Track the task being edited

// Add Task
addBtn.addEventListener("click", addTodo);

async function addTodo() {
    const todoText = input.value.trim();
    if (!todoText) {
        alert("Please enter a task!");
        return;
    }

    try {
        const docRef = await addDoc(collection(db, "todos"), {
            todo: todoText,
            completed: false
        });

        input.value = ""; // Clear input
        renderTodoItem(docRef.id, todoText, false); // Update UI instantly
    } catch (error) {
        console.error("Error adding todo:", error);
    }
}

// Fetch & Render Todos
async function getTodos() {
    ul.innerHTML = ""; // Clear before rendering

    const querySnapshot = await getDocs(collection(db, "todos"));
    querySnapshot.forEach((docData) => {
        const { todo, completed } = docData.data();
        renderTodoItem(docData.id, todo, completed);
    });
}

// Render Single Todo Item
function renderTodoItem(id, text, completed) {
    const li = document.createElement("li");
    li.className = "flex justify-between items-center bg-gray-100 p-3 rounded-lg shadow-md";
    li.setAttribute("data-id", id);

    li.innerHTML = `
        <span class="text-lg flex-1 cursor-pointer ${completed ? "line-through text-gray-500" : ""}">
            ${text}
        </span>
        <div>
            <button class="edit-btn text-yellow-500 mr-2">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn text-red-500">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    ul.appendChild(li);
}

// Event Listener for Edit, Delete, and Toggle Completion
ul.addEventListener("click", async (event) => {
    const li = event.target.closest("li");
    if (!li) return;

    const todoId = li.getAttribute("data-id");
    const span = li.querySelector("span");

    // Toggle Completion
    if (event.target === span) {
        const isCompleted = span.classList.contains("line-through");
        await updateDoc(doc(db, "todos", todoId), { completed: !isCompleted });

        // Toggle UI
        span.classList.toggle("line-through");
        span.classList.toggle("text-gray-500");
    }

    // Delete Task
    if (event.target.closest(".delete-btn")) {
        await deleteDoc(doc(db, "todos", todoId));
        li.remove(); // Instantly remove from UI
    }

    // Edit Task
    if (event.target.closest(".edit-btn")) {
        input.value = span.innerText; // Move text to input field
        editId = todoId; // Store ID of the task being edited

        // Show update button & hide add button
        addBtn.classList.add("hidden");
        updateBtn.classList.remove("hidden");
    }
});

// Update Task
updateBtn.addEventListener("click", async () => {
    if (!editId) return;

    const updatedText = input.value.trim();
    if (!updatedText) {
        alert("Please enter a task!");
        return;
    }

    try {
        await updateDoc(doc(db, "todos", editId), { todo: updatedText });

        // Update UI Instantly
        const li = document.querySelector(`li[data-id="${editId}"]`);
        if (li) li.querySelector("span").innerText = updatedText;

        input.value = ""; // Clear input
        editId = null; // Reset edit mode

        // Show add button & hide update button
        addBtn.classList.remove("hidden");
        updateBtn.classList.add("hidden");
    } catch (error) {
        console.error("Error updating todo:", error);
    }
});

// Load Todos on Page Load
document.addEventListener("DOMContentLoaded", getTodos);
