/**
 * Offline Sync Service for PWA
 * Handles automatic synchronization, offline queuing, and background sync
 */

class OfflineSync {
  constructor() {
    this.syncQueue = [];
    this.DB_NAME = 'monEZ-offline';
    this.DB_VERSION = 1;
    this.STORE_NAME = 'sync-queue';
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async queueAction(type, data) {
    const action = {
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.add(action);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getQueuedActions() {
    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeQueuedAction(id) {
    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async syncAll() {
    if (!navigator.onLine) {
      console.log('Offline: sync postponed');
      return;
    }

    const actions = await this.getQueuedActions();
    const results = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(action);
        await this.removeQueuedAction(action.id);
        results.push({ success: true, action });
      } catch (error) {
        console.error('Sync failed for action:', action, error);
        results.push({ success: false, action, error });
      }
    }

    return results;
  }

  async executeAction(action) {
    switch (action.type) {
      case 'ADD_EXPENSE':
        return await this.addExpense(action.data);
      case 'SEND_FRIEND_REQUEST':
        return await this.sendFriendRequest(action.data);
      case 'SETTLE_PAYMENT':
        return await this.settlePayment(action.data);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async addExpense(data) {
    // Integration with existing expense API
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to add expense');
    return await response.json();
  }

  async sendFriendRequest(data) {
    const response = await fetch('/api/friend-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to send friend request');
    return await response.json();
  }

  async settlePayment(data) {
    const response = await fetch('/api/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to settle payment');
    return await response.json();
  }

  registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in registration) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('sync-offline-queue');
      }).catch((error) => {
        console.error('Background sync registration failed:', error);
      });
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfflineSync;
} else {
  window.OfflineSync = OfflineSync;
}
