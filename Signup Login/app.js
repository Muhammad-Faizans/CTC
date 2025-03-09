
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyDTabp2Dfv--RhHO6L-4hbxdb35HbuAxd8",
  authDomain: "bakkar-jr.firebaseapp.com",
  projectId: "bakkar-jr",
  storageBucket: "bakkar-jr.firebasestorage.app",
  messagingSenderId: "89884942656",
  appId: "1:89884942656:web:7005bafaa4cc211eb35aa5",
  measurementId: "G-RETWEG4PT8"
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
      window.location.href = 'welcome.html';

    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorCode, errorMessage)
    })
});

