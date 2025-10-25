/* monEZ - Main Application Logic */
import { AppState, createRippleEffect, showNotification, safeGet, checkOnboardingStatus } from './utils.js';
import { 
  auth, 
  db, 
  provider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged, 
  query, 
  collection, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc 
} from './firebase.js';
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
    console.log('🚀 Initializing monEZ app...');
    
    // Check if user has already completed onboarding
    checkOnboardingStatus();
    
    console.log('⏳ Setting up authentication state listener...');
    
    // Check authentication state
    onAuthStateChanged(auth, async (user) => {
        const loginScreen = safeGet('login-screen');
        const mainApp = safeGet('main-app');
        const onboardingScreen = safeGet('onboarding-screen');
        
        if (user) {
            // User signed in
            console.log('✅ User authenticated:', user.email);
            
            // Check if user has completed onboarding
            const hasCompletedOnboarding = await checkUserOnboarding(user.uid);
            
            if (!hasCompletedOnboarding) {
                // Show onboarding for new user
                console.log('📋 Showing onboarding for new user');
                if (loginScreen) loginScreen.style.display = 'none';
                if (mainApp) mainApp.style.display = 'none';
                if (onboardingScreen) onboardingScreen.classList.remove('hidden');
                
                // Initialize onboarding
                initOnboarding();
            } else {
                // Load user preferences and show main app
                console.log('🏠 Loading main app for existing user');
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
            // User signed out - explicitly show login screen
            console.log('🔐 No authenticated user, showing login screen');
            if (loginScreen) {
                loginScreen.style.display = 'flex';
                loginScreen.style.justifyContent = 'center';
                loginScreen.style.alignItems = 'center';
            }
            if (mainApp) mainApp.style.display = 'none';
            if (onboardingScreen) onboardingScreen.classList.add('hidden');
        }
    });
    
    console.log('📝 Setting up expense form...');
    setupExpenseForm();
    
    console.log('📱 Setting up PWA listeners...');
    setupPWAListeners();
    
    console.log('✨ App initialization complete');
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

// Google Sign-in function
window.signInWithGoogle = async function() {
    try {
        const result = await signInWithPopup(auth, provider);
        showNotification(`Welcome ${result.user.displayName}!`, 'success');
    } catch (error) {
        console.error('Sign in error:', error);
        showNotification('Sign in failed: ' + error.message, 'error');
    }
};

// Email/Password Sign-in function
window.signInWithEmail = async function(email, password) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        showNotification(`Welcome back ${result.user.email}!`, 'success');
    } catch (error) {
        console.error('Email sign in error:', error);
        let errorMessage = 'Sign in failed. Please check your credentials.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
        }
        
        showNotification(errorMessage, 'error');
    }
};

// Email/Password Sign-up function
window.signUpWithEmail = async function(email, password, displayName) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update the user profile with display name
        if (displayName) {
            await updateProfile(result.user, {
                displayName: displayName
            });
        }
        
        showNotification(`Welcome to monEZ, ${displayName || result.user.email}!`, 'success');
    } catch (error) {
        console.error('Email sign up error:', error);
        let errorMessage = 'Sign up failed. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password should be at least 6 characters long.';
                break;
        }
        
        showNotification(errorMessage, 'error');
    }
};

// Password Reset function
window.resetPassword = async function(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        showNotification('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = 'Failed to send password reset email.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
        }
        
        showNotification(errorMessage, 'error');
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

// Enhanced Event Listeners with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('📄 DOM Content Loaded');
        hideLoadingScreen();
        setTimeout(() => {
            initApp();
        }, 2300);
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
        showNotification('Failed to initialize app: ' + error.message, 'error');
    }
});

// Add ripple effect to buttons
document.addEventListener('click', (e) => {
    if (e.target.matches('button, .btn, .action-card, .nav-item')) {
        createRippleEffect(e.target, e);
    }
});

// OPTIONAL: Export any necessary functions if referenced outside
export { initApp, loadUserData };
