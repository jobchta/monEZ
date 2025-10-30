// monEZ - Utility Functions
// Import centralized AppState from state.js
import { AppState } from './state.js';

// Expose AppState globally for compatibility
window.AppState = AppState;

// --- Enhanced Helper Functions ---

// Safe DOM lookup – prevents UI crashes if an ID is wrong or missing
export function safeGet(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Missing element: ${id}`);
  return el;
}

// Format currency values (now supports multiple currencies)
export function formatCurrency(amount, currency = null) {
  const userCurrency = currency || AppState.defaultCurrency || 'INR';
  const locale = AppState.numberFormat || 'en-IN';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: userCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback if currency/locale not supported
    const symbols = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AED': 'د.إ',
      'SGD': 'S$'
    };
    const symbol = symbols[userCurrency] || userCurrency;
    return `${symbol}${amount.toFixed(2)}`;
  }
}

// Calculate user-wise balance summary from expenses
export function calculateUserBalances(expenses) {
    const balanceMap = {};

    expenses.forEach(expense => {
        const { paidBy, splitAmong, amount } = expense;
        const splitAmount = amount / (splitAmong?.length || 1);

        // Add to paidBy's credit
        balanceMap[paidBy] = (balanceMap[paidBy] || 0) + amount;

        // Subtract from each person in splitAmong
        splitAmong?.forEach(person => {
            balanceMap[person] = (balanceMap[person] || 0) - splitAmount;
        });
    });

    // Convert to array and filter out zero/near-zero balances
    return Object.entries(balanceMap)
        .filter(([, balance]) => Math.abs(balance) > 0.01)
        .map(([name, amount]) => ({ name, amount }));
}

// Create ripple effect on click
export function createRippleEffect(element, event) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('ripple');

    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Animate number changes
export function animateNumber(element, start, end, duration, formatter = null) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (end - start) * easeOutQuad(progress);

        element.textContent = formatter ? formatter(current) : Math.round(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function easeOutQuad(t) {
    return t * (2 - t);
}

// Show notification
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Date formatting helper
export function formatDate(date, format = 'short') {
    const d = new Date(date);
    if (isNaN(d)) return 'Invalid Date';

    if (format === 'short') {
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('en-IN');
}

// Validate email
export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Debounce helper for search/input
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
