/* monEZ - Main Application Logic */

import { AppState, createRippleEffect, showNotification, safeGet, checkOnboardingStatus } from './utils.js';
import { auth, db, provider, signInWithPopup, onAuthStateChanged, query, collection, where, orderBy, onSnapshot, doc, getDoc } from './firebase.js';
import { renderRecentExpenses, renderAllExpenses, updateBalance } from './render.js';
import { setupExpenseForm, showHome, showAddExpense, showExpenses, showBalances, showGroups, showPremiumFeatures, showSettings, showSplitBill, showSettle, showNotifications, showProfile, showFilters, settleAll, showCreateGroup, aiSuggestAmount, startVoiceInput, tryAIFeature, startPremiumTrial, showPaymentMethods, settleBalance, remindUser, showPWAPrompt, dismissPWAPrompt, installPWA, showPremiumModal, closePremiumModal } from './views.js';
import { initOnboarding, checkOnboardingStatus as checkOnboardingComplete } from './onboarding.js';

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
    // Check if user has already completed onboarding
    checkOnboardingStatus();

    // Check authentication state
    onAuthStateChanged(auth, async (user) => {
        const loginScreen = safeGet('login-screen');
        const mainApp = safeGet('main-app');
        const onboardingScreen = safeGet('onboarding-screen');
        
        if (user) {
            // User signed in
            console.log('User authenticated:', user.email);
            
            // Check if user has completed onboarding
            const hasCompletedOnboarding = await checkUserOnboarding(user.uid);
            
            if (!hasCompletedOnboarding) {
                // Show onboarding for new user
                if (loginScreen) loginScreen.style.display = 'none';
                if (mainApp) mainApp.style.display = 'none';
                if (onboardingScreen) onboardingScreen.classList.remove('hidden');
                
                // Initialize onboarding
                initOnboarding();
            } else {
                // Load user preferences and show main app
                await loadUserPreferences(user.uid);
                
                if (loginScreen) loginScreen.style.display = 'none';
                if (onboardingScreen) onboardingScreen.classList.add('hidden');
                if (mainApp) {
                    mainApp.style.display = 'flex';
                    mainApp.style.flexDirection = 'column';
                    mainApp.style.minHeight = '100vh';
                }
                
                loadUserData(user);
            }
        } else {
            // User signed out
            if (loginScreen) loginScreen.style.display = 'flex';
            if (mainApp) mainApp.style.display = 'none';
            if (onboardingScreen) onboardingScreen.classList.add('hidden');
        }
    });

    setupExpenseForm();
    setupPWAListeners();
}

// Check if user has completed onboarding in Firebase
async function checkUserOnboarding(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.onboardingCompleted === true;
        }
        
        // New user - needs onboarding
        return false;
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If error, check localStorage as fallback
        return checkOnboardingComplete();
    }
}

// Load user preferences from Firebase
async function loadUserPreferences(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.preferences) {
                // Store in AppState
                AppState.userPreferences = userData.preferences;
                
                // Store in localStorage for quick access
                localStorage.setItem('userPreferences', JSON.stringify(userData.preferences));
                
                // Apply preferences (currency, language, etc.)
                applyUserPreferences(userData.preferences);
                
                console.log('User preferences loaded:', userData.preferences);
            }
        }
    } catch (error) {
        console.error('Error loading user preferences:', error);
    }
}

// Apply user preferences to the app
function applyUserPreferences(prefs) {
    // Set default currency
    if (prefs.currency) {
        AppState.defaultCurrency = prefs.currency;
    }
    
    // Set timezone
    if (prefs.timezone) {
        AppState.timezone = prefs.timezone;
    }
    
    // Set date format
    if (prefs.dateFormat) {
        AppState.dateFormat = prefs.dateFormat;
    }
    
    // Set number format
    if (prefs.numberFormat) {
        AppState.numberFormat = prefs.numberFormat;
    }
    
    // TODO: Apply language when i18n is implemented
    if (prefs.language) {
        AppState.language = prefs.language;
        // await i18n.loadLanguage(prefs.language);
    }
    
    console.log('Preferences applied to AppState');
}

// Add Google Sign-in function
window.signInWithGoogle = async function() {
    try {
        const result = await signInWithPopup(auth, provider);
        showNotification(`Welcome ${result.user.displayName}!`, 'success');
    } catch (error) {
        console.error('Sign in error:', error);
        showNotification('Sign in failed: ' + error.message, 'error');
    }
};

import { startFriendsListener } from './friends.js';

// Update loadUserData function
function loadUserData(user) {
    // Show loading indicator
    const recentExpenses = safeGet('recent-expenses');
    if (recentExpenses) {
        const loadingEl = document.createElement('div');
        loadingEl.id = 'expense-loading';
        loadingEl.innerHTML = '💫 Loading your data...';
        loadingEl.style.cssText = 'text-align: center; padding: 20px; color: #666;';
        recentExpenses.appendChild(loadingEl);
    }

    // Start listening to expenses
    const q = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
    );
    
    onSnapshot(q, (snapshot) => {
        safeGet('expense-loading')?.remove();
        
        AppState.expenses = [];
        snapshot.forEach((doc) => {
            AppState.expenses.push({ id: doc.id, ...doc.data() });
        });
        
        renderRecentExpenses();
        renderAllExpenses();
        updateBalance();
    });
    
    // NEW: Start listening to friends
    startFriendsListener(user.uid);
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
    const loadingScreen = safeGet('loading-screen');
    const mainApp = safeGet('main-app');

    if (loadingScreen && mainApp) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
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
