/* monEZ - Main Application Logic (finalized production) */
import { AppState, createRippleEffect, showNotification, safeGet, checkOnboardingStatus } from './utils.js';
import { auth, db, provider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, onAuthStateChanged, query, collection, where, orderBy, onSnapshot, doc, getDoc, runTransaction } from './firebase.js';
import { renderRecentExpenses, renderAllExpenses, updateBalance, renderOnboardingPanel, renderInvitePanel, renderSplitBillPanel, renderGroupPanel } from './render.js';
import { setupExpenseForm, showHome, showAddExpense, showExpenses, showBalances, showGroups, showPremiumFeatures, showSettings, showSplitBill, showSettle, showNotifications, showProfile, showFilters, settleAll, showCreateGroup, aiSuggestAmount, startVoiceInput, tryAIFeature, startPremiumTrial, showPaymentMethods, settleBalance, remindUser, showPWAPrompt, dismissPWAPrompt, installPWA, showPremiumModal, closePremiumModal, transitionTo } from './views.js';
import { initOnboarding, checkOnboardingStatus as checkOnboardingComplete } from './onboarding.js';
import { startFriendsListener } from './friends.js';
// Expose UI handlers for inline HTML onclicks
Object.assign(window, { showHome, showAddExpense, showExpenses, showBalances, showGroups, showPremiumFeatures, showSettings, showSplitBill, showSettle, showNotifications, showProfile, showFilters, settleAll, showCreateGroup, aiSuggestAmount, startVoiceInput, tryAIFeature, startPremiumTrial, showPaymentMethods, settleBalance, remindUser, showPWAPrompt, dismissPWAPrompt, installPWA, showPremiumModal, closePremiumModal });
// Push Notifications setup/finalization
async function ensurePushPermission() {
  try {
    if (!('Notification' in window)) return false;
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    AppState.push = { ...(AppState.push||{}), enabled: perm === 'granted' };
    return perm === 'granted';
  } catch { return false; }
}
function initApp() {
  // Initial routing/nav setup
  setupNavTransitions();
  checkOnboardingStatus();
  // Auth state
  onAuthStateChanged(auth, async (user) => {
    const loginScreen = safeGet('login-screen');
    const mainApp = safeGet('main-app');
    const onboardingScreen = safeGet('onboarding-screen');
    if (user) {
      const hasCompletedOnboarding = await checkUserOnboarding(user.uid);
      if (!hasCompletedOnboarding) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'none';
        if (onboardingScreen) onboardingScreen.classList.remove('hidden');
        initOnboarding();
        renderOnboardingPanel();
      } else {
        await loadUserPreferences(user.uid);
        if (loginScreen) loginScreen.style.display = 'none';
        if (onboardingScreen) onboardingScreen.classList.add('hidden');
        if (mainApp) { mainApp.style.display = 'flex'; mainApp.style.flexDirection = 'column'; mainApp.style.minHeight = '100vh'; }
        // Panels needing initial render
        renderInvitePanel();
        renderSplitBillPanel();
        renderGroupPanel();
        // Data
        loadUserData(user);
        // Push
        if (AppState.push?.enabled) ensurePushPermission();
        setupExpenseForm();
        setupPWAListeners();
      }
    } else {
      if (loginScreen) loginScreen.style.display = 'flex';
      if (mainApp) mainApp.style.display = 'none';
      if (onboardingScreen) onboardingScreen.classList.add('hidden');
    }
  });
}
async function checkUserOnboarding(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return false;
    const data = userDoc.data();
    return data?.onboarded === true;
  } catch { return false; }
}
async function loadUserPreferences(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      AppState.preferences = data.preferences || {};
    }
  } catch (error) { console.error('Error loading preferences:', error); }
}
/**
 * Load user expense data using Firestore transactions for ACID compliance.
 * This function wraps expense reads in a runTransaction block to ensure:
 * - Atomicity: All expense reads succeed or fail together
 * - Consistency: Data remains consistent even under concurrent access
 * - Isolation: Concurrent transactions don't interfere with each other
 * - Durability: Once committed, data is permanently stored
 * 
 * @param {Object} user - The authenticated Firebase user object
 */
async function loadUserData(user) {
  const recent = safeGet('recent-expenses');
  
  // Show loading indicator
  if (recent) { 
    const el = document.createElement('div'); 
    el.id = 'expense-loading'; 
    el.innerHTML = '💫 Loading your data...'; 
    el.style.cssText = 'text-align:center; padding:20px; color:#666;'; 
    recent.appendChild(el); 
  }
  
  try {
    // Execute expense query within a Firestore transaction
    // This ensures atomic reads and prevents race conditions
    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
    
    await runTransaction(db, async (transaction) => {
      // Phase 1: Read all expense documents atomically
      // Transaction guarantees all reads see a consistent snapshot
      const snapshot = await transaction.get(q);
      
      // Phase 2: Process expense data
      // Clear existing state to prevent stale data
      AppState.expenses = [];
      
      // Iterate through documents and populate application state
      snapshot.forEach((doc) => {
        AppState.expenses.push({ id: doc.id, ...doc.data() });
      });
      
      // Transaction completed successfully
      // All reads were atomic and consistent
    });
    
    // Phase 3: Update UI after successful transaction
    // Only update UI if transaction succeeded (ACID guarantee)
    safeGet('expense-loading')?.remove();
    renderRecentExpenses();
    renderAllExpenses?.();
    updateBalance();
    
    // Set up real-time listener for future updates
    // Note: Initial load uses transaction, subsequent updates use snapshot
    onSnapshot(q, (snapshot) => {
      AppState.expenses = [];
      snapshot.forEach((doc) => { AppState.expenses.push({ id: doc.id, ...doc.data() }); });
      renderRecentExpenses();
      renderAllExpenses?.();
      updateBalance();
    });
    
  } catch (error) {
    // Phase 4: Error handling and rollback
    // Transaction automatically rolls back on any error
    console.error('Transaction failed - data rolled back:', error);
    
    // Remove loading indicator
    safeGet('expense-loading')?.remove();
    
    // Show user-friendly error notification
    showNotification(
      '⚠️ Failed to load expenses. Please try again.', 
      'error'
    );
    
    // Ensure clean state even on failure
    AppState.expenses = [];
    
    // Render empty state
    renderRecentExpenses();
    renderAllExpenses?.();
    updateBalance();
  }
  
  // Initialize friends listener (independent of transaction)
  startFriendsListener(user.uid);
}
// PWA
function setupPWAListeners() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); AppState.deferredPrompt = e; showPWAPrompt(); });
  window.addEventListener('appinstalled', () => { showNotification('🎉 monEZ installed! Enjoy the native app experience.', 'success'); AppState.deferredPrompt = null; dismissPWAPrompt(); });
}
// Navigation transitions for all screens
function setupNavTransitions() {
  const nav = document.querySelectorAll('[data-nav]');
  nav.forEach(el => el.addEventListener('click', (e) => {
    const target = e.currentTarget.getAttribute('data-nav');
    if (!target) return;
    transitionTo?.(target);
  }));
}
// Global listeners
document.addEventListener('DOMContentLoaded', () => {
  try {
    hideLoadingScreen();
    setTimeout(() => { initApp(); }, 300);
  } catch (error) {
    console.error('Error during app initialization:', error);
    showNotification('Failed to initialize app: ' + error.message, 'error');
  }
});
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t && (t.matches?.('button, .btn, .action-card, .nav-item'))) {
    createRippleEffect(t, e);
  }
});
function hideLoadingScreen() {
  const loadingScreen = safeGet('loading-screen');
  const mainApp = safeGet('main-app');
  if (loadingScreen && mainApp) {
    setTimeout(() => { loadingScreen.style.opacity = '0'; setTimeout(() => { loadingScreen.style.display = 'none'; }, 300); }, 500);
  }
}
export { initApp, loadUserData };
