/* monEZ - Main Application Logic */

import { AppState, createRippleEffect, showNotification } from './utils.js';
import { auth, db, provider, signInWithPopup, onAuthStateChanged, query, collection, where, orderBy, onSnapshot } from './firebase.js';
import { renderRecentExpenses, renderAllExpenses, updateBalance } from './render.js';
import { setupExpenseForm, showHome, showAddExpense, showExpenses, showBalances, showGroups, showPremiumFeatures, showSettings, showSplitBill, showSettle, showNotifications, showProfile, showFilters, settleAll, showCreateGroup, aiSuggestAmount, startVoiceInput, tryAIFeature, startPremiumTrial, showPaymentMethods, settleBalance, remindUser, showPWAPrompt, dismissPWAPrompt, installPWA, showPremiumModal, closePremiumModal } from './views.js';

// Expose UI handlers for inline HTML onclicks
Object.assign(window, {
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
    closePremiumModal
});

// Enhanced App Initialization with Firebase
function initApp() {
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User signed in
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            loadUserData(user);
        } else {
            // User signed out
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('main-app').style.display = 'none';
        }
    });

    setupExpenseForm();
    setupPWAListeners();
}

// Add Google Sign-in function
window.signInWithGoogle = async function() {
    try {
        const result = await signInWithPopup(auth, provider);
        showNotification(`Welcome ${result.user.displayName}!`, 'success');
    } catch (error) {
        showNotification('Sign in failed: ' + error.message, 'error');
    }
};

// Add real data loading
function loadUserData(user) {
    const q = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        AppState.expenses = [];
        snapshot.forEach((doc) => {
            AppState.expenses.push({ id: doc.id, ...doc.data() });
        });
        renderRecentExpenses();
        renderAllExpenses();
        updateBalance();
    });
}

function setupPWAListeners() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        AppState.deferredPrompt = e;
        showPWAPrompt();
    });

    window.addEventListener('appinstalled', () => {
        showNotification('🎉 monEZ installed! Enjoy the native app experience.', 'success');
        AppState.deferredPrompt = null;
        dismissPWAPrompt();
    });
}

// Loading Screen Management
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');

    if (loadingScreen && mainApp) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                mainApp.style.display = 'flex';
                mainApp.style.flexDirection = 'column';
                mainApp.style.minHeight = '100vh';
            }, 300);
        }, 2000);
    }
}

// Enhanced Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    hideLoadingScreen();

    setTimeout(() => {
        initApp();
    }, 2300);
});

// Add ripple effect to buttons
document.addEventListener('click', (e) => {
    if (e.target.matches('button, .btn, .action-card, .nav-item')) {
        createRippleEffect(e.target, e);
    }
});

// OPTIONAL: Export any necessary functions if referenced outside
export { initApp, loadUserData };
