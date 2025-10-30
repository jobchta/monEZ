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
// import { processExpense, deleteExpense, editExpense } from './expense.js';
// import { settleBalance } from './settle.js';
// import { remindUser } from './reminders.js';

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
    
    // Initialize app only if user authenticated
    initFirebase();
    console.log('Firebase initialized');
    
    // Check authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('User authenticated:', user.email);
            updateState({ currentUser: user });
            await initAuthenticatedUser(user);
        } else {
            console.log('User not authenticated');
            showLoginScreen();
        }
    });
}

// Initialize app when logged in
async function initAuthenticatedUser(user) {
    console.log('Initializing authenticated user:', user.email);
    
    // Hide login screen and show app
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('app');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';
    
    // Set up navigation
    setupNavigation();
    
    // Initialize expense listeners
    setupExpenseListeners();
    
    // Show home view by default
    showHome();
    
    // Load user data and start listeners
    await loadUserData(user);
    await loadGroupInvites(user);
    
    console.log('App initialization complete');
}

function showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('app');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
}

// Sign in handler
async function handleSignIn() {
    console.log('Signing in...');
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log('Sign in successful:', user.email);
        
        // Check if user exists in DB, if not create profile
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            console.log('Creating new user profile');
            await runTransaction(db, async (transaction) => {
                transaction.set(userRef, {
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL || '',
                    createdAt: new Date().toISOString(),
                    totalExpenses: 0,
                    totalBalance: 0
                });
            });
        }
        
        showNotification('Welcome to monEZ!', 'success');
    } catch (error) {
        console.error('Sign in error:', error);
        showNotification('Failed to sign in. Please try again.', 'error');
    }
}

// Setup navigation
function setupNavigation() {
    const navItems = {
        'nav-home': showHome,
        'nav-add-expense': showAddExpense,
        'nav-expenses': showExpenses,
        'nav-balances': showBalances,
        'nav-groups': showGroups,
        'nav-friends': showFriends,
        'nav-split-bill': showSplitBill,
        'nav-settle': showSettle,
        'nav-notifications': showNotifications,
        'nav-scheduled': showScheduled,
        'nav-analytics': showAnalytics,
        'nav-premium': showPremiumFeatures,
        'nav-settings': showSettings
    };
    
    Object.entries(navItems).forEach(([id, handler]) => {
        const navItem = document.getElementById(id);
        if (navItem) {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                handler();
                // Update active state
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                navItem.classList.add('active');
            });
        }
    });
}

// Setup expense form listeners
function setupExpenseListeners() {
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(expenseForm);
            const expenseData = {
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                category: formData.get('category'),
                paidBy: AppState.currentUser.uid,
                splitWith: formData.getAll('split-with'),
                date: new Date().toISOString(),
                groupId: formData.get('group-id') || null
            };
            
            // Call processExpense if available
            if (typeof processExpense === 'function') {
                await processExpense(expenseData);
            } else {
                console.warn('processExpense function not available');
                showNotification('Expense processing is currently unavailable', 'error');
            }
        });
    }
}

// Load user data from Firebase
async function loadUserData(user) {
    console.log('Loading user data for:', user.uid);
    
    // Listen to user's expenses
    const expensesQuery = query(
        collection(db, 'expenses'),
        where('participants', 'array-contains', user.uid),
        orderBy('date', 'desc')
    );
    
    onSnapshot(expensesQuery, (snapshot) => {
        const expenses = [];
        snapshot.forEach((doc) => {
            expenses.push({ id: doc.id, ...doc.data() });
        });
        updateState({ expenses });
        renderRecentExpenses(expenses);
        updateBalance();
    });
    
    // Listen to balances
    const balancesQuery = query(
        collection(db, 'balances'),
        where('userId', '==', user.uid)
    );
    
    onSnapshot(balancesQuery, (snapshot) => {
        const balances = {};
        snapshot.forEach((doc) => {
            const data = doc.data();
            balances[data.friendId] = data.amount;
        });
        updateState({ balances });
    });
}

// Load group invites
async function loadGroupInvites(user) {
    const invitesQuery = query(
        collection(db, 'groupInvites'),
        where('inviteeId', '==', user.uid),
        where('status', '==', 'pending')
    );
    
    onSnapshot(invitesQuery, (snapshot) => {
        const invites = [];
        snapshot.forEach((doc) => {
            invites.push({ id: doc.id, ...doc.data() });
        });
        updateState({ groupInvites: invites });
        
        // Show notification if there are new invites
        if (invites.length > 0) {
            showNotification(`You have ${invites.length} pending group invite(s)`, 'info');
        }
    });
}

// Settle balance handler
window.handleSettle = async (friendId, amount) => {
    try {
        // Call settleBalance if available
        if (typeof settleBalance === 'function') {
            await settleBalance(friendId, amount);
        } else {
            console.warn('settleBalance function not available');
            showNotification('Settlement feature is currently unavailable', 'error');
        }
    } catch (error) {
        console.error('Error settling balance:', error);
        showNotification('Failed to settle balance', 'error');
    }
};

// Remind user handler
window.handleRemind = async (friend) => {
    try {
        // Call remindUser if available
        if (typeof remindUser === 'function') {
            await remindUser(friend);
        } else {
            console.warn('remindUser function not available');
            showNotification('Reminder feature is currently unavailable', 'error');
        }
    } catch (error) {
        console.error('Error sending reminder:', error);
        showNotification('Failed to send reminder', 'error');
    }
};

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
