// globals.js - Centralized state management for monEZ

// Re-export from state.js for backward compatibility
export { 
    AppState, 
    updateState, 
    getState, 
    resetState 
} from './state.js';

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
        return () => this.off(event, callback);
    }

    // Emit state change events
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
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

// Initialize state manager
export const stateManager = new StateManager();

// Initialize state management
import { initializeState } from './state.js';
initializeState();
