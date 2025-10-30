/* monEZ - Main Application Logic */
import { AppState, updateState, stateManager } from './state.js';
import { createRippleEffect, showNotification, safeGet } from './utils.js';
import { 
    auth, 
    db, 
    provider, 
    signInWithPopup, 
    onAuthStateChanged, 
    query, 
    collection, 
    where, 
    orderBy, 
    onSnapshot, 
    doc, 
    getDoc, 
    runTransaction,
    initFirebase 
} from './firebase.js';
import { 
    renderRecentExpenses, 
    renderAllExpenses, 
    updateBalance, 
    renderOnboardingPanel 
} from './render.js';
import { 
    showHome, 
    showAddExpense, 
    showExpenses, 
    showBalances, 
    showGroups, 
    showPremiumFeatures, 
    showSettings, 
    showSplitBill, 
    showSettle, 
    showNotifications, 
    showProfile, 
    showFilters, 
    settleAll, 
    showCreateGroup, 
    aiSuggestAmount, 
    startVoiceInput, 
    tryAIFeature, 
    startPremiumTrial, 
    showPaymentMethods, 
    settleBalance, 
    remindUser, 
    showPWAPrompt, 
    dismissPWAPrompt, 
    installPWA, 
    showPremiumModal, 
    closePremiumModal, 
    transitionTo 
} from './views.js';
import { initOnboarding } from './onboarding.js';
import { startFriendsListener } from './friends.js';
// Expose UI handlers for inline HTML onclicks
Object.assign(window, { showHome, showAddExpense, showExpenses, showBalances, showGroups, showPremiumFeatures, showSettings, showSplitBill, showSettle, showNotifications, showProfile, showFilters, settleAll, showCreateGroup, aiSuggestAmount, startVoiceInput, tryAIFeature, startPremiumTrial, showPaymentMethods, settleBalance, remindUser, showPWAPrompt, dismissPWAPrompt, installPWA, showPremiumModal, closePremiumModal });
// Push Notifications setup/finalization
async function ensurePushPermission() {
  try {
    if (!('Notification' in window)) return false;
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    
    // Update push notification state
    updateState({
      preferences: {
        ...AppState.preferences,
        pushNotifications: {
          ...(AppState.preferences.pushNotifications || {}),
          enabled: perm === 'granted',
          permission: perm
        }
      }
    });
    
    return perm === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}
// Track initialization state
let isInitialized = false;

/**
 * Initialize the application
 */
async function initApp() {
  if (isInitialized) {
    console.warn('App already initialized');
    return;
  }

  try {
    // Initialize Firebase services
    await initFirebase();
    
    // Set up UI components
    setupNavTransitions();
    setupBalanceHandlers();
    
    // Check if user needs to complete onboarding
    checkOnboardingStatus();
    
    // Mark as initialized
    isInitialized = true;
    
    // Set up authentication state listener
    onAuthStateChanged(auth, async (user) => {
    const loginScreen = safeGet('login-screen');
    const mainApp = safeGet('main-app');
    const onboardingScreen = safeGet('onboarding-screen');
    
    if (user) {
      // User is signed in
      const hasCompletedOnboarding = await checkUserOnboarding(user.uid);
      
      if (!hasCompletedOnboarding) {
        // Show onboarding for new users
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'none';
        if (onboardingScreen) onboardingScreen.classList.remove('hidden');
        
        initOnboarding();
        renderOnboardingPanel();
        return;
      }
      
      // User has completed onboarding
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'flex';
      if (onboardingScreen) onboardingScreen.classList.add('hidden');
      
      // Update application state with user data
      updateState({
        currentUser: {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL
        },
        auth: {
          isAuthenticated: true,
          isAnonymous: user.isAnonymous,
          emailVerified: user.emailVerified
        }
      });
      
      // Load user data and set up listeners
      try {
        await Promise.all([
          loadUserPreferences(user.uid),
          startFriendsListener(),
          ensurePushPermission()
        ]);
        
        // Initialize UI components
        renderRecentExpenses();
        startBalanceListener(user.uid);
        
        // Notify listeners that user is fully loaded
        stateManager.emit('user:loaded', AppState.currentUser);
      } catch (error) {
        console.error('Error initializing user session:', error);
        showNotification('Error loading your data. Please refresh the page.', 'error');
      }
    } else {
      // User is signed out
      updateState({
        currentUser: null,
        auth: {
          isAuthenticated: false,
          isAnonymous: true,
          emailVerified: false
        }
      });
      
      // Update UI for logged out state
      if (mainApp) mainApp.style.display = 'none';
      if (loginScreen) loginScreen.style.display = 'flex';
      if (onboardingScreen) onboardingScreen.classList.add('hidden');
      
      // Notify listeners that user has signed out
      stateManager.emit('user:signedOut');
    }
  });
  
  // Set up the expense form
  setupExpenseForm();
  
  } catch (error) {
    console.error('Failed to initialize application:', error);
    showNotification('Failed to initialize application. Please refresh the page.', 'error');
    
    // Show error state to user
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = 'Failed to initialize application. Please check your connection and refresh the page.';
    document.body.prepend(errorElement);
  }
}
/**
 * Load and apply user preferences from Firestore
 * @param {string} userId - The user's unique ID
 */
async function loadUserPreferences(userId) {
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      // Set up default preferences for new users
      const defaultPrefs = {
        currency: 'USD',
        theme: 'system', // 'light', 'dark', or 'system'
        language: 'en',
        notifications: {
          email: true,
          push: true,
          reminders: true
        },
        privacy: {
          profileVisible: true,
          activityFeed: true,
          emailVisible: false
        },
        preferences: {
          defaultView: 'dashboard',
          defaultCurrency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          firstDayOfWeek: 0, // 0 = Sunday, 1 = Monday
          hideAmounts: false,
          compactView: false
        },
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      // Save default preferences in a transaction
      await runTransaction(db, async (txn) => {
        const readCheck = await txn.get(docRef);
        if (!readCheck.exists()) txn.set(docRef, defaultPrefs);
      });
      applyUserPreferences(defaultPrefs);
      return;
    }
    const prefs = snap.data();
    if (!prefs.initialized) {
      await runTransaction(db, async (txn) => {
        const readCheck = await txn.get(docRef);
        txn.update(docRef, { initialized: Date.now() });
      });
    }
    applyUserPreferences(prefs);
  } catch (err) {
    console.error('loadUserPreferences error:', err);
    applyUserPreferences({ currency: 'USD', darkMode: false });
  }
}
function applyUserPreferences(prefs) {
  if (prefs.darkMode) { document.body.classList.toggle('dark-mode', prefs.darkMode); }
  if (prefs.currency) { updateState({ defaultCurrency: prefs.currency }); }
}
function checkUserOnboarding(userId) {
  return new Promise((resolve) => {
    const docRef = doc(db, 'users', userId);
    onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        resolve(!!data.onboardingComplete);
      } else resolve(false);
    }, () => resolve(false));
  });
}
function setupNavTransitions() {
  const navLinks = document.querySelectorAll('[data-view]');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = e.target.closest('[data-view]').dataset.view;
      transitionTo(targetView);
    });
  });
}

// Setup balance button handlers to replace inline onclick
function setupBalanceHandlers() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('.settle-btn-small')) {
      const action = e.target.dataset.action;
      const friend = e.target.dataset.friend;
      const amount = parseFloat(e.target.dataset.amount);
      
      if (action === 'pay') {
        settleBalance(friend, amount);
      } else if (action === 'remind') {
        remindUser(friend);
      }
    }
  });
}
function startBalanceListener(userId) {
  const q = query(collection(db, 'expenses'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
  onSnapshot(q, (snapshot) => {
    const debts = {};
    snapshot.forEach((doc) => {
      const exp = doc.data();
      if (exp.splitWith) {
        exp.splitWith.forEach((person) => {
          debts[person] = (debts[person] || 0) + (exp.amount / (exp.splitWith.length + 1));
        });
      }
    });
    updateBalance(debts);
  });
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initApp); }
else { initApp(); }
export { initApp, loadUserPreferences, applyUserPreferences, checkUserOnboarding };
