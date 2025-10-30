// Centralized state management for monEZ
// Application State - Single Source of Truth
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
    supportedCurrencies: ['USD', 'EUR', 'INR', 'GBP']
};

// StateManager for event-driven state changes
class StateManager {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
}

export const stateManager = new StateManager();

// State update function
export function updateState(updates) {
    // Handle both object and key-value updates
    if (typeof updates === 'object' && !Array.isArray(updates)) {
        Object.assign(AppState, updates);
    } else if (arguments.length === 2) {
        // Backward compatibility: updateState(key, value)
        const [key, value] = arguments;
        AppState[key] = value;
    }
    
    // Notify subscribers if needed
    if (window.stateManager) {
        window.stateManager.emit('stateChanged', AppState);
    }
}

// Helper to get state
export function getState(key) {
    return key ? AppState[key] : { ...AppState };
}

// Reset state
export function resetState() {
    // Reset all state except configuration
    const { defaultCurrency, supportedCurrencies } = AppState;
    
    Object.assign(AppState, {
        currentUser: null,
        preferences: {
            currency: 'USD',
            darkMode: false,
            language: 'en',
            notifications: true
        },
        expenses: [],
        friends: [],
        groups: [],
        balance: 0,
        selectedFriends: new Set(),
        selectedGroup: null,
        selectedExpense: null,
        defaultCurrency,
        supportedCurrencies
    });
}

// Helper methods for state
export function getExpenses() {
    return AppState.expenses || [];
}

export function getFriends() {
    return AppState.friends || [];
}

export function getGroups() {
    return AppState.groups || [];
}

// Initialize state
export function initializeState() {
    console.log('State initialized:', AppState);
    window.stateManager = stateManager;
}
