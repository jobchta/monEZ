// globals.js - Centralized State Management for monEZ
// This file is the SINGLE source of truth for all application state

// Application State - ONLY declare variables here
export const AppState = {
    // User data
    currentUser: null,
    preferences: {
        currency: 'USD',
        darkMode: false,
        language: 'en',
        notifications: true
    },
    
    // Core data
    expenses: [],
    friends: [],
    groups: [],
    balance: 0,
    
    // UI state
    selectedFriends: new Set(),
    selectedGroup: null,
    selectedExpense: null,
    
    // App configuration
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR', 'INR', 'GBP'],
    
    // Feature flags
    features: {
        aiSuggestions: false,
        premiumFeatures: false,
        offlineMode: true,
        push: { enabled: false }
    },
    
    // Animation settings
    animations: {
        enabled: true,
        duration: 300
    },
    
    // PWA state
    deferredPrompt: null,
    isInstalled: false,
    
    // Error tracking
    lastError: null,
    errorCount: 0
};

// Constants - Application configuration
export const CONFIG = {
    appName: 'monEZ',
    version: '1.0.0',
    defaultCurrency: 'USD',
    maxExpenseAmount: 1000000,
    dateFormat: 'MM/DD/YYYY',
    
    // Firebase collections
    collections: {
        USERS: 'users',
        EXPENSES: 'expenses', 
        GROUPS: 'groups',
        FRIENDS: 'friends'
    },
    
    // UI Constants
    ui: {
        animationDuration: 300,
        toastDuration: 3000,
        maxRecentExpenses: 5
    }
};

// Event System for State Changes
class StateManager {
    constructor() {
        this.listeners = {};
    }
    
    // Subscribe to state changes
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    // Emit state change events
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });
        }
    }
    
    // Remove event listener
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
}

export const stateManager = new StateManager();

// State Management Functions
export function updateState(key, value) {
    const oldValue = AppState[key];
    AppState[key] = value;
    stateManager.emit('stateChange', { key, oldValue, newValue: value });
    stateManager.emit(`${key}Changed`, { oldValue, newValue: value });
}

export function getState(key) {
    return AppState[key];
}

export function resetState() {
    // Reset to initial state
    AppState.currentUser = null;
    AppState.expenses = [];
    AppState.friends = [];
    AppState.groups = [];
    AppState.balance = 0;
    AppState.selectedFriends.clear();
    AppState.selectedGroup = null;
    AppState.selectedExpense = null;
    AppState.lastError = null;
    
    stateManager.emit('stateReset', {});
}

// Utility Functions
export function addExpense(expense) {
    AppState.expenses.unshift(expense);
    stateManager.emit('expenseAdded', expense);
    updateBalance();
}

export function removeExpense(expenseId) {
    const index = AppState.expenses.findIndex(exp => exp.id === expenseId);
    if (index > -1) {
        const removed = AppState.expenses.splice(index, 1)[0];
        stateManager.emit('expenseRemoved', removed);
        updateBalance();
    }
}

export function addFriend(friend) {
    if (!AppState.friends.find(f => f.id === friend.id)) {
        AppState.friends.push(friend);
        stateManager.emit('friendAdded', friend);
    }
}

export function removeFriend(friendId) {
    const index = AppState.friends.findIndex(f => f.id === friendId);
    if (index > -1) {
        const removed = AppState.friends.splice(index, 1)[0];
        stateManager.emit('friendRemoved', removed);
    }
}

// Balance calculation
function updateBalance() {
    let balance = 0;
    AppState.expenses.forEach(expense => {
        const splitAmount = expense.amount / (expense.splitWith?.length + 1 || 1);
        balance += (expense.paidBy === AppState.currentUser?.name) 
            ? (expense.amount - splitAmount) 
            : -splitAmount;
    });
    
    const oldBalance = AppState.balance;
    AppState.balance = balance;
    stateManager.emit('balanceUpdated', { oldBalance, newBalance: balance });
}

// Error tracking
export function logError(error, context = '') {
    AppState.lastError = {
        error: error.toString(),
        context,
        timestamp: Date.now()
    };
    AppState.errorCount++;
    
    console.error('App Error:', error, context);
    stateManager.emit('errorLogged', AppState.lastError);
}

// Debug helpers
export function getDebugInfo() {
    return {
        state: JSON.parse(JSON.stringify(AppState)),
        config: CONFIG,
        listeners: Object.keys(stateManager.listeners)
    };
}

// Initialize state management
export function initializeState() {
    console.log('🌟 State management initialized');
    
    // Set up error tracking
    window.addEventListener('error', (event) => {
        logError(event.error, 'Global error handler');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        logError(event.reason, 'Unhandled promise rejection');
    });
    
    stateManager.emit('stateInitialized', {});
}

// Export all necessary functions and state
export {
    AppState,
    stateManager,
    updateState,
    getState,
    resetState,
    addExpense,
    removeExpense,
    addFriend,
    removeFriend,
    updateBalance,
    logError,
    getDebugInfo,
    initializeState
};

// Export for debugging in console
if (typeof window !== 'undefined') {
    window.monEZDebug = {
        AppState,
        stateManager,
        updateState,
        getState,
        resetState
    };
}
