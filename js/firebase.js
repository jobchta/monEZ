/**
 * Firebase Configuration and Service Initialization
 * 
 * This module initializes Firebase services and provides authentication and database functions
 * that integrate with the application's state management system.
 */

// Core Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

// Authentication imports
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firestore imports
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  getDoc,
  getDocs,
  setDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  runTransaction,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4pZOIZikLKjL_eYAW9x3aC4weSz9PP6I",
  authDomain: "monez-a4619.firebaseapp.com",
  databaseURL: "https://monez-a4619-default-rtdb.firebaseio.com",
  projectId: "monez-a4619",
  storageBucket: "monez-a4619.appspot.com",
  messagingSenderId: "754794079933",
  appId: "1:754794079933:web:fb794db5e96a94dd9f39d4",
  measurementId: "G-LTF8XKRR6P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with enhanced configuration
const auth = getAuth(app);
const db = getFirestore(app);

// Configure Firestore persistence
const configurePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    });
    console.log('Firestore persistence enabled');
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence');
    }
  }
};

// Configure authentication persistence
const configureAuthPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error('Error setting auth persistence:', error);
  }
};

// Initialize Firebase services
const initFirebase = async () => {
  try {
    await Promise.all([
      configurePersistence(),
      configureAuthPersistence()
    ]);
    console.log('Firebase services initialized');
  } catch (error) {
    console.error('Error initializing Firebase services:', error);
    throw error;
  }
};

// Export initialized services
export {
  // Core services
  auth,
  db,
  
  // Authentication methods
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateFirebaseProfile as updateProfile,
  onFirebaseAuthStateChanged as onAuthStateChanged,
  firebaseSignOut as signOut,
  
  // Firestore methods
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  
  // Initialization function
  initFirebase
};

// Create and export Google Auth provider
export const provider = new GoogleAuthProvider();
