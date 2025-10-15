// Firebase configuration and functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC4pZOIZikLKjL_eYAW9x3aC4weSz9PP6I",
  authDomain: "monez-a4619.firebaseapp.com",
  projectId: "monez-a4619",
  storageBucket: "monez-a4619.firebasestorage.app",
  messagingSenderId: "754794079933",
  appId: "1:754794079933:web:fb794db5e96a94dd9f39d4",
  measurementId: "G-LTF8XKRR6P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Export for use in other files
window.firebase = { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc };
