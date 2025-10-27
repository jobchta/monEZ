/* monEZ - Main Application Logic (finalized production) */
import { AppState, createRippleEffect, showNotification, safeGet, checkOnboardingStatus } from './utils.js';
import { auth, db, provider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, onAuthStateChanged, query, collection, where, orderBy, onSnapshot, doc, getDoc } from './firebase.js';
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
      }
    } else {
      if (loginScreen) { loginScreen.style.display = 'flex'; loginScreen.style.justifyContent = 'center'; loginScreen.style.alignItems = 'center'; }
      if (mainApp) mainApp.style.display = 'none';
      if (onboardingScreen) onboardingScreen.classList.add('hidden');
    }
  });

  setupExpenseForm();
  setupPWAListeners();
}

async function checkUserOnboarding(userId) {
  try { const userDoc = await getDoc(doc(db, 'users', userId)); if (userDoc.exists()) { const data = userDoc.data(); return data.onboardingCompleted === true; } return false; }
  catch { return checkOnboardingComplete(); }
}

async function loadUserPreferences(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const prefs = userDoc.data().preferences || {};
      AppState.userPreferences = prefs;
      localStorage.setItem('userPreferences', JSON.stringify(prefs));
      applyUserPreferences(prefs);
    }
  } catch (e) { console.error('prefs error', e); }
}

function applyUserPreferences(prefs) {
  if (prefs.currency) AppState.defaultCurrency = prefs.currency;
  if (prefs.timezone) AppState.timezone = prefs.timezone;
  if (prefs.dateFormat) AppState.dateFormat = prefs.dateFormat;
  if (prefs.numberFormat) AppState.numberFormat = prefs.numberFormat;
  if (prefs.language) AppState.language = prefs.language;
}

// Sign-in/up helpers
window.signInWithGoogle = async function() { try { const r = await signInWithPopup(auth, provider); showNotification(`Welcome ${r.user.displayName}!`, 'success'); } catch (e) { showNotification('Sign in failed: ' + e.message, 'error'); } };
window.signInWithEmail = async function(email, password) { try { const r = await signInWithEmailAndPassword(auth, email, password); showNotification(`Welcome back ${r.user.email}!`, 'success'); } catch (error) { let m = 'Sign in failed. Please check your credentials.'; switch (error.code) { case 'auth/user-not-found': m = 'No account found with this email address.'; break; case 'auth/wrong-password': m = 'Incorrect password. Please try again.'; break; case 'auth/invalid-email': m = 'Please enter a valid email address.'; break; case 'auth/too-many-requests': m = 'Too many failed attempts. Please try again later.'; break; } showNotification(m, 'error'); } };
window.signUpWithEmail = async function(email, password, displayName) { try { const r = await createUserWithEmailAndPassword(auth, email, password); if (displayName) await updateProfile(r.user, { displayName }); showNotification(`Welcome to monEZ, ${displayName || r.user.email}!`, 'success'); } catch (error) { let m = 'Sign up failed. Please try again.'; switch (error.code) { case 'auth/email-already-in-use': m = 'An account with this email already exists.'; break; case 'auth/invalid-email': m = 'Please enter a valid email address.'; break; case 'auth/weak-password': m = 'Password should be at least 6 characters long.'; break; } showNotification(m, 'error'); } };
window.resetPassword = async function(email) { try { await sendPasswordResetEmail(auth, email); showNotification('Password reset email sent! Check your inbox.', 'success'); } catch (error) { let m = 'Failed to send password reset email.'; switch (error.code) { case 'auth/user-not-found': m = 'No account found with this email address.'; break; case 'auth/invalid-email': m = 'Please enter a valid email address.'; break; } showNotification(m, 'error'); } };

// Data loading
function loadUserData(user) {
  // Loading indicator
  const recent = safeGet('recent-expenses');
  if (recent) { const el = document.createElement('div'); el.id = 'expense-loading'; el.innerHTML = '💫 Loading your data...'; el.style.cssText = 'text-align:center; padding:20px; color:#666;'; recent.appendChild(el); }
  const q = query(collection(db, 'expenses'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
  onSnapshot(q, (snapshot) => {
    safeGet('expense-loading')?.remove();
    AppState.expenses = [];
    snapshot.forEach((doc) => { AppState.expenses.push({ id: doc.id, ...doc.data() }); });
    renderRecentExpenses();
    renderAllExpenses?.();
    updateBalance();
  });
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
    const target = (e.currentTarget as HTMLElement).getAttribute('data-nav');
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
    showNotification('Failed to initialize app: ' + (error as any).message, 'error');
  }
});

document.addEventListener('click', (e) => {
  const t = e.target as any;
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
