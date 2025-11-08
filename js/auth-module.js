// js/auth-module.js
// Firebase Authentication Module
// Handles user signup, login, logout, and session management

import { firebaseConfig } from '../firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable persistent login across sessions
await setPersistence(auth, browserLocalPersistence);

// Global state
window.AuthState = {
  currentUser: null,
  isLoading: true,
  isAuthenticated: false
};

// ============================================
// SIGN UP (Create new user account)
// ============================================
export async function signup(email, password, name, phone) {
  try {
    // Validate inputs
    if (!email || !password || !name) {
      return { success: false, error: 'Email, password, and name are required' };
    }
    
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      name: name,
      phone: phone || '',
      avatar: name.charAt(0).toUpperCase(),
      createdAt: new Date().toISOString(),
      friends: [],
      groups: [],
      balance: {},
      preferences: {
        theme: 'light',
        notifications: true
      }
    });
    
    // Store in localStorage
    localStorage.setItem('monEZ_userId', user.uid);
    localStorage.setItem('monEZ_email', email);
    localStorage.setItem('monEZ_name', name);
    localStorage.setItem('monEZ_authToken', await user.getIdToken());
    
    window.AuthState.currentUser = user;
    window.AuthState.isAuthenticated = true;
    
    return { success: true, user };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// LOGIN (Sign in existing user)
// ============================================
export async function login(email, password) {
  try {
    // Validate inputs
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user data from Firestore
    const userDocSnap = await getDoc(doc(db, 'users', user.uid));
    const userData = userDocSnap.data();
    
    // Store in localStorage
    localStorage.setItem('monEZ_userId', user.uid);
    localStorage.setItem('monEZ_email', user.email);
    localStorage.setItem('monEZ_name', userData.name);
    localStorage.setItem('monEZ_authToken', await user.getIdToken());
    localStorage.setItem('monEZ_userData', JSON.stringify(userData));
    
    window.AuthState.currentUser = user;
    window.AuthState.isAuthenticated = true;
    
    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error);
    
    // User-friendly error messages
    if (error.code === 'auth/user-not-found') {
      return { success: false, error: 'No account found with this email' };
    } else if (error.code === 'auth/wrong-password') {
      return { success: false, error: 'Incorrect password' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Invalid email format' };
    }
    
    return { success: false, error: error.message };
  }
}

// ============================================
// LOGOUT (Sign out current user)
// ============================================
export async function logout() {
  try {
    await signOut(auth);
    
    // Clear localStorage
    localStorage.removeItem('monEZ_userId');
    localStorage.removeItem('monEZ_email');
    localStorage.removeItem('monEZ_name');
    localStorage.removeItem('monEZ_authToken');
    localStorage.removeItem('monEZ_userData');
    
    window.AuthState.currentUser = null;
    window.AuthState.isAuthenticated = false;
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CHECK AUTHENTICATION STATUS
// ============================================
export function isLoggedIn() {
  return window.AuthState.isAuthenticated || !!localStorage.getItem('monEZ_authToken');
}

export function getCurrentUser() {
  return window.AuthState.currentUser || {
    uid: localStorage.getItem('monEZ_userId'),
    email: localStorage.getItem('monEZ_email'),
    name: localStorage.getItem('monEZ_name')
  };
}

// ============================================
// REAL-TIME AUTH STATE LISTENER
// ============================================
export function onAuthStateChange(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in
      window.AuthState.currentUser = user;
      window.AuthState.isAuthenticated = true;
      
      // Fetch user data from Firestore
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      const userData = userDocSnap.data();
      
      localStorage.setItem('monEZ_userId', user.uid);
      localStorage.setItem('monEZ_email', user.email);
      localStorage.setItem('monEZ_userData', JSON.stringify(userData));
      
      callback({ isAuthenticated: true, user, userData });
    } else {
      // User is signed out
      window.AuthState.currentUser = null;
      window.AuthState.isAuthenticated = false;
      
      localStorage.removeItem('monEZ_userId');
      localStorage.removeItem('monEZ_email');
      localStorage.removeItem('monEZ_authToken');
      localStorage.removeItem('monEZ_userData');
      
      callback({ isAuthenticated: false, user: null });
    }
    
    window.AuthState.isLoading = false;
  });
}

// ============================================
// EXPORT FIREBASE INSTANCES FOR OTHER MODULES
// ============================================
export { auth, db, app };

console.log('🔐 Firebase Auth Module Loaded');
