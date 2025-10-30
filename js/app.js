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
    showFriends,
    showGroup,
    showScheduled,
    showAnalytics
} from './views.js';
import { processExpense, deleteExpense, editExpense } from './expense.js';
import { settleBalance } from './settle.js';
import { remindUser } from './reminders.js';

// DOM Ready
function initApp() {
    console.log('Initializing monEZ app...');
    
    const loginBtn = safeGet('google-sign-in-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleSignIn);
        console.log('Login button handler attached');
    } else {
        console.error('Login button not found');
    }

    // Firebase initialization
    try {
        initFirebase();
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        showNotification('Failed to initialize app. Please refresh.', 'error');
        return;
    }

    setupNavTransitions();
    setupBalanceHandlers();
    const addExpenseBtn = safeGet('add-expense-btn');
    if (addExpenseBtn) addExpenseBtn.addEventListener('click', () => showAddExpense());

    const submitExpenseBtn = safeGet('submit-expense-btn');
    if (submitExpenseBtn) submitExpenseBtn.addEventListener('click', handleAddExpense);

    const addFriendBtn = safeGet('add-friend-btn');
    if (addFriendBtn) addFriendBtn.addEventListener('click', handleAddFriend);

    const inviteFriendBtn = safeGet('invite-friend-btn');
    if (inviteFriendBtn) inviteFriendBtn.addEventListener('click', handleInviteFriend);

    const settleExpenseBtn = safeGet('settle-expense-btn');
    if (settleExpenseBtn) settleExpenseBtn.addEventListener('click', handleSettleExpense);

    const toggleThemeBtn = safeGet('toggle-theme');
    if (toggleThemeBtn) {
        toggleThemeBtn.addEventListener('click', toggleTheme);
    }

    console.log('Setting up authentication...');
    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user ? user.email : 'No user');
        if (user) {
            updateState({ user });
            await loadUserPreferences();
            applyUserPreferences();
            const hasCompletedOnboarding = await checkUserOnboarding(user.uid);
            if (!hasCompletedOnboarding) {
                renderOnboardingPanel();
            } else {
                await initUserSession(user);
            }
        } else {
            showLoginScreen();
        }
    });
}

function showLoginScreen() {
    const loginScreen = safeGet('panel-login');
    const mainApp = safeGet('main-app');
    const onboardingPanel = safeGet('onboarding-panel');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
    if (onboardingPanel) onboardingPanel.style.display = 'none';
}

async function initUserSession(user) {
    const loginScreen = safeGet('panel-login');
    const mainApp = safeGet('main-app');
    const onboardingPanel = safeGet('onboarding-panel');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
    if (onboardingPanel) onboardingPanel.style.display = 'none';

    startBalanceListener(user.uid);
    showHome();
}

async function handleSignIn() {
    try {
        console.log('Attempting sign in...');
        const result = await signInWithPopup(auth, provider);
        console.log('Sign in successful:', result.user.email);
        showNotification(`Welcome, ${result.user.displayName}!`, 'success');
    } catch (error) {
        console.error('Sign in error:', error);
        showNotification('Sign in failed. Please try again.', 'error');
    }
}

async function loadUserPreferences() {
    const user = AppState.user;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const prefs = userDoc.data().preferences || {};
            updateState({ preferences: prefs });
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

function applyUserPreferences() {
    const prefs = AppState.preferences || {};
    if (prefs.theme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

function handleAddExpense() {
    const description = safeGet('expense-description')?.value.trim();
    const amountStr = safeGet('expense-amount')?.value.trim();
    const category = safeGet('expense-category')?.value || 'Other';
    const selectedFriends = Array.from(document.querySelectorAll('.friend-checkbox:checked')).map(cb => cb.value);

    if (!description || !amountStr) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
    }

    const expenseData = {
        description,
        amount,
        category,
        splitWith: selectedFriends,
        timestamp: new Date(),
        userId: AppState.user.uid
    };

    processExpense(expenseData);
}

function handleAddFriend() {
    const friendEmail = safeGet('friend-email')?.value.trim();
    if (!friendEmail) {
        showNotification('Please enter an email', 'warning');
        return;
    }
    showNotification(`Friend request sent to ${friendEmail}`, 'success');
    if (safeGet('friend-email')) safeGet('friend-email').value = '';
}

function handleInviteFriend() {
    const inviteEmail = safeGet('invite-email')?.value.trim();
    if (!inviteEmail) {
        showNotification('Please enter an email', 'warning');
        return;
    }
    showNotification(`Invitation sent to ${inviteEmail}`, 'success');
    if (safeGet('invite-email')) safeGet('invite-email').value = '';
}

function handleSettleExpense() {
    const friendId = safeGet('settle-friend-select')?.value;
    const amountStr = safeGet('settle-amount')?.value.trim();

    if (!friendId || !amountStr) {
        showNotification('Please select a friend and enter an amount', 'warning');
        return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
    }

    settleBalance(friendId, amount);
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    updateState({ preferences: { ...AppState.preferences, theme: isDark ? 'dark' : 'light' } });
    showNotification(`Switched to ${isDark ? 'dark' : 'light'} theme`, 'info');
}

function transitionTo(viewName) {
    const views = {
        home: showHome,
        'add-expense': showAddExpense,
        expenses: showExpenses,
        balances: showBalances,
        groups: showGroups,
        premium: showPremiumFeatures,
        settings: showSettings
    };

    const viewFn = views[viewName];
    if (viewFn) {
        viewFn();
    } else {
        console.error(`Unknown view: ${viewName}`);
    }
}

async function checkUserOnboarding(userId) {
  return new Promise((resolve) => {
    const userDocRef = doc(db, 'users', userId);
    getDoc(userDocRef).then((snap) => {
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
