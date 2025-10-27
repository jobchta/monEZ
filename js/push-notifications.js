/**
 * Push Notifications Service for PWA
 * Handles browser and Android push alerts with ARIA support
 */

class PushNotifications {
  constructor() {
    this.vapidPublicKey = null;
    this.subscription = null;
    this.notificationPermission = 'default';
  }

  async init(vapidPublicKey) {
    this.vapidPublicKey = vapidPublicKey;
    
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return false;
    }

    if (!('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    // Check current permission state
    this.notificationPermission = Notification.permission;
    
    // Load existing subscription
    await this.loadSubscription();
    
    return true;
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    this.notificationPermission = permission;
    
    // Announce to screen readers
    this.announceToScreenReader(
      permission === 'granted' 
        ? 'Push notifications enabled' 
        : 'Push notifications denied'
    );
    
    return permission === 'granted';
  }

  async subscribe() {
    if (this.notificationPermission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });
      
      this.subscription = subscription;
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      await this.loadSubscription();
    }
    
    if (this.subscription) {
      try {
        await this.subscription.unsubscribe();
        await this.removeSubscriptionFromServer(this.subscription);
        this.subscription = null;
        this.announceToScreenReader('Push notifications disabled');
        return true;
      } catch (error) {
        console.error('Failed to unsubscribe:', error);
        return false;
      }
    }
    
    return false;
  }

  async loadSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
      return this.subscription;
    } catch (error) {
      console.error('Failed to load subscription:', error);
      return null;
    }
  }

  async sendSubscriptionToServer(subscription) {
    const response = await fetch('/api/push-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save subscription on server');
    }
    
    return await response.json();
  }

  async removeSubscriptionFromServer(subscription) {
    const response = await fetch('/api/push-subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    
    return response.ok;
  }

  showLocalNotification(title, options = {}) {
    if (this.notificationPermission !== 'granted') {
      return;
    }

    const defaultOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'monez-notification',
      requireInteraction: false,
      ...options
    };

    // Add ARIA live region announcement
    this.announceToScreenReader(`${title}. ${options.body || ''}`);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, defaultOptions);
      });
    } else {
      new Notification(title, defaultOptions);
    }
  }

  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 3000);
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  // Notification templates for common events
  notifySettlementConfirmed(amount, friendName) {
    this.showLocalNotification('Settlement Confirmed', {
      body: `${friendName} confirmed receiving ${amount}`,
      icon: '/icon-192.png',
      tag: 'settlement',
      data: { type: 'settlement', friendName, amount }
    });
  }

  notifyExpenseAdded(description, amount, addedBy) {
    this.showLocalNotification('New Expense Added', {
      body: `${addedBy} added "${description}" (${amount})`,
      icon: '/icon-192.png',
      tag: 'expense',
      data: { type: 'expense', description, amount, addedBy }
    });
  }

  notifyReminder(message) {
    this.showLocalNotification('Payment Reminder', {
      body: message,
      icon: '/icon-192.png',
      tag: 'reminder',
      requireInteraction: true,
      data: { type: 'reminder' }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PushNotifications;
} else {
  window.PushNotifications = PushNotifications;
}
