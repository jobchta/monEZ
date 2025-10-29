/* monEZ - Main Application Logic (finalized production) */
import { AppState, updateState } from './globals.js';
import { createRippleEffect, showNotification, safeGet, checkOnboardingStatus } from './utils.js';
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
    updateState({ push: { ...(AppState.push||{}), enabled: perm === 'granted' } });
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
        return;
      }
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'flex';
      if (onboardingScreen) onboardingScreen.classList.add('hidden');
      updateState({ currentUser: { uid: user.uid, email: user.email, name: user.displayName } });
      await loadUserPreferences(user.uid);
      await startFriendsListener();
      renderRecentExpenses();
      startBalanceListener(user.uid);
      await ensurePushPermission();
    } else {
      if (mainApp) mainApp.style.display = 'none';
      if (loginScreen) loginScreen.style.display = 'flex';
      if (onboardingScreen) onboardingScreen.classList.add('hidden');
    }
  });
  setupExpenseForm();
}
async function loadUserPreferences(userId) {
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const defaultPrefs = { currency: 'USD', darkMode: false, initialized: Date.now() };
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
