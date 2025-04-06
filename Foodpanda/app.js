
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, addDoc, collection, getDocs, doc, deleteDoc, updateDoc, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyCuWETfPgHXczuOd51NEcSFRar82HHAif8",
    authDomain: "practice-eb7b1.firebaseapp.com",
    projectId: "practice-eb7b1",
    storageBucket: "practice-eb7b1.firebasestorage.app",
    messagingSenderId: "194151170212",
    appId: "1:194151170212:web:4d588abb89f2fc0ea7a631",
    measurementId: "G-NBCFC635Q8"
};



const app = initializeApp(firebaseConfig);



const auth = getAuth();
let getBtn = document.getElementById('btn')


getBtn.addEventListener('click', function () {
    const email = document.getElementById('semail').value
    const password = document.getElementById('spassword').value

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert(user.email + ' account created successfully')
            window.location.href = 'login.html'

        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            alert(errorCode, errorMessage)
        });
})

let loginBtn = document.getElementById('loginBtn')
loginBtn.addEventListener('click', function () {
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert(user.email + ' logged in successfully')
            window.location.href = 'dashboard.html';

        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            alert(errorCode, errorMessage)
        })
});



// Products
async function addProduct() {
    const p_name = document.getElementById('p-name').value
    const p_price = document.getElementById('p-price').value
    const p_description = document.getElementById('p-description').value
    const p_image = document.getElementById('p-image').value

    //   add doc in firebase
    try {
        const docRef = await addDoc(collection(db, "Product"), {
            p_image: p_image,
            p_name: p_name,
            p_description: p_description,
            p_price: p_price,
        });


    } catch (error) {
        console.error("Error adding Product", error);
    }
}


window.addProduct = addProduct