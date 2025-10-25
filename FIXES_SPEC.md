# Privacy, Scalability & Accessibility Improvements

This document outlines the comprehensive fixes for critical privacy, scalability, and accessibility concerns in monEZ.

## 1. Privacy & Security: Move UPI IDs to Firestore

### Changes to `js/upi-settlement.js`:
- Remove `localStorage` storage for UPI IDs and settlement metadata
- Implement Firestore storage in user document:
  ```javascript
  // Store in users/{userId}/paymentMethods/upi
  await setDoc(doc(db, 'users', userId, 'paymentMethods', 'upi'), {
    upiId: upiIdValue,
    defaultMethod: true,
    addedAt: serverTimestamp()
  });
  ```
- Add cross-device sync listener
- Migrate existing localStorage data to Firestore on app init

### Changes to `js/app.js`:
- Add migration function in `loadUserPreferences()` to move legacy UPI data
- Add error handling for payment method operations

## 2. Scalability: Modularize Rendering Logic

### Changes to `js/render.js`:
- Extract repetitive DOM creation into pure functions:
  ```javascript
  // New exportable component functions
  export function createExpenseCard(expense) { ... }
  export function createFriendCard(friend) { ... }
  export function createBalanceRow(balance) { ... }
  ```
- Remove duplicate expense rendering code
- Create `renderUtils.js` module for shared rendering utilities

### Changes to `js/views.js`:
- De-duplicate modal creation logic
- Extract form rendering into reusable functions:
  ```javascript
  export function createFormField(config) { ... }
  export function createModal(title, content, actions) { ... }
  ```
- Use imported render components from `render.js`

### New file `js/renderUtils.js`:
```javascript
export function createElement(tag, className, innerHTML) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (innerHTML) el.innerHTML = innerHTML;
  return el;
}

export function formatCurrency(amount, currency) { ... }
export function formatDate(timestamp, format) { ... }
```

## 3. Accessibility: Add ARIA & Keyboard Navigation

### Changes to `js/views.js`:
- Add ARIA roles to all modals:
  ```javascript
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-labelledby', 'modal-title');
  modal.setAttribute('aria-modal', 'true');
  ```
- Implement keyboard navigation:
  - Tab/Shift+Tab for focus management
  - Escape key to close modals
  - Enter key for form submission
  ```javascript
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') trapFocus(e);
  });
  ```

### Changes to `index.html`:
- Add `role="button"` and `tabindex="0"` to clickable divs
- Add `aria-label` to icon-only buttons
- Add form field labels with `for` attributes
- Add `aria-live` regions for notifications

### Changes to `js/utils.js`:
- Add focus trap utility:
  ```javascript
  export function trapFocus(element, event) { ... }
  ```
- Add keyboard event handlers for custom components

## 4. Error Handling: Global Error Handler

### Changes to `js/app.js`:
- Add catch-all error handler before exports:
  ```javascript
  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('🚨 Uncaught error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    showNotification('An error occurred. Please refresh the page.', 'error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    showNotification('An error occurred. Please try again.', 'error');
  });
  ```

## 5. Performance: Optimize Firestore Listeners

### Changes to `js/friends.js`:
- Convert friends list to one-time fetch with session caching:
  ```javascript
  let friendsCache = null;
  let cacheTimestamp = null;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  export async function getFriends(userId, forceRefresh = false) {
    if (!forceRefresh && friendsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return friendsCache;
    }
    const snapshot = await getDocs(query(collection(db, 'friends'), where('userId', '==', userId)));
    friendsCache = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    cacheTimestamp = Date.now();
    return friendsCache;
  }
  ```
- Keep real-time listener only for active friend requests

### Changes to `js/app.js` in `loadUserData()`:
- Replace expenses real-time listener with cached reads for historical data
- Keep real-time listener only for recent expenses (last 7 days):
  ```javascript
  const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentQuery = query(
    collection(db, 'expenses'),
    where('userId', '==', user.uid),
    where('timestamp', '>', recentDate),
    orderBy('timestamp', 'desc')
  );
  onSnapshot(recentQuery, (snapshot) => { ... });

  // Older expenses: one-time fetch with local caching
  const olderExpenses = await getCachedOlderExpenses(user.uid);
  ```

## Testing Checklist

- [ ] UPI IDs persist across devices after Firestore migration
- [ ] No sensitive data in localStorage after changes
- [ ] Keyboard navigation works in all forms and modals
- [ ] Screen readers announce modal state changes
- [ ] Global error handler catches and logs errors
- [ ] Friends list loads from cache on subsequent visits
- [ ] Real-time updates still work for recent expenses
- [ ] All new utility functions are properly exported
- [ ] No duplicate code between render.js and views.js

## Migration Notes

For existing users:
1. On first login after update, migrate UPI data from localStorage to Firestore
2. Clear legacy localStorage keys after successful migration
3. Show one-time notification about improved privacy

## Files Changed Summary

1. `js/app.js` - Global error handler, UPI migration, listener optimization
2. `js/render.js` - Modularized rendering, pure component functions
3. `js/views.js` - De-duplicated logic, ARIA attributes, keyboard handlers
4. `js/upi-settlement.js` - Firestore storage for UPI IDs
5. `js/friends.js` - Caching layer, optimized queries
6. `js/utils.js` - New accessibility utilities (focus trap)
7. `js/renderUtils.js` - NEW: Shared rendering utilities
8. `index.html` - ARIA labels, roles, and semantic improvements
