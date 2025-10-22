// monEZ - Utility Functions

// --- Enhanced App State (NO DUMMY DATA) ---
export const AppState = {
  currentView: 'home',
  expenses: [],          // EMPTY - user will add real data
  friends: [],           // EMPTY - user will add real data  
  groups: [],            // EMPTY - user will add real data
  balance: 0,            // START AT ZERO
  selectedFriends: new Set(),
  selectedCategory: '',
  animations: {
    enabled: true,
    duration: 300
  },
  pwaPromptShown: false,
  deferredPrompt: null,
  showExample: true      // NEW: Controls onboarding guidance
};

// --- Enhanced Helper Functions ---

// Safe DOM lookup – prevents UI crashes if an ID is wrong or missing
export function safeGet(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Missing element: ${id}`);
  return el;
}

// Format currency values for INR
export function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Ripple effect for button clicks
export function createRippleEffect(element, event) {
  const ripple = document.createElement('div');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.style.position = 'absolute';
  ripple.style.borderRadius = '50%';
  ripple.style.background = 'rgba(255,255,255,0.3)';
  ripple.style.transform = 'scale(0)';
  ripple.style.animation = 'ripple 0.6s ease-out';
  ripple.style.pointerEvents = 'none';

  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// Animate number transitions for balances
export function animateNumber(element, start, end, duration = 1000) {
  const startTime = performance.now();
  const range = end - start;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(start + range * easeOutQuart);

    element.textContent = formatCurrency(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// Robust user notifications for all actions/errors
export function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
  `;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 8px; font-size: 16px;">×</button>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Calculate user balances from expenses
export function calculateUserBalances() {
  const balanceMap = new Map();

  AppState.expenses.forEach(expense => {
    if (!expense.splitWith) return;

    const totalPeople = expense.splitWith.length + 1;
    const sharePerPerson = expense.amount / totalPeople;

    expense.splitWith.forEach(friendName => {
      if (expense.paidBy === 'You') {
        const currentBalance = balanceMap.get(friendName) || 0;
        balanceMap.set(friendName, currentBalance + sharePerPerson);
      } else if (expense.paidBy === friendName) {
        const currentBalance = balanceMap.get(friendName) || 0;
        balanceMap.set(friendName, currentBalance - sharePerPerson);
      }
    });
  });

  return Array.from(balanceMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .filter(balance => Math.abs(balance.amount) > 0.01);
}

// NEW: Hide example/onboarding after user adds first real data
export function hideExampleData() {
  AppState.showExample = false;
  localStorage.setItem('monez.hideExample', '1');
}

// NEW: Check if user has seen onboarding
export function checkOnboardingStatus() {
  const hideExample = localStorage.getItem('monez.hideExample');
  if (hideExample === '1') {
    AppState.showExample = false;
  }
}
