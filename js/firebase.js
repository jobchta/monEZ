// firebase.js - Firebase configuration and functions

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4pZOIZikLKjL_eYAW9x3aC4weSz9PP6I",
  authDomain: "monez-a4619.firebaseapp.com",
  projectId: "monez-a4619",
  storageBucket: "monez-a4619.firebasestorage.app",
  messagingSenderId: "754794079933",
  appId: "1:754794079933:web:fb794db5e96a94dd9f39d4",
  measurementId: "G-LTF8XKRR6P"
};

// Initialize Firebase and core services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ✨ NEW: Enable offline persistence for better UX
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.log('⚠️ Offline persistence disabled: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser doesn't support persistence
    console.log('⚠️ Offline persistence not supported by this browser');
  } else {
    console.log('⚠️ Offline persistence error:', err);
  }
});

// Universal export for ES modules (preferred)
export {
  auth, db, provider,
  signInWithPopup, signOut, onAuthStateChanged,
  collection, addDoc, onSnapshot, query, where, orderBy,
  serverTimestamp, doc, updateDoc
};

// Optional: Expose for legacy/global usage (should not be needed in ES modules, but safe for compatibility)
window.firebase = {
  auth, db, provider,
  signInWithPopup, signOut, onAuthStateChanged,
  collection, addDoc, onSnapshot, query, where, orderBy,
  serverTimestamp, doc, updateDoc
};
