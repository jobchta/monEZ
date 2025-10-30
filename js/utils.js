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
      'CAD': 'C$'
    };
    const symbol = symbols[userCurrency] || userCurrency;
    return `${symbol}${amount.toFixed(2)}`;
  }
}

// Calculate user balances
export function calculateUserBalances(expenses) {
  const balances = {};
  expenses.forEach(expense => {
    const amountPerPerson = expense.amount / expense.splitWith.length;
    // Payer gets credited
    balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;
    // Split members get debited
    expense.splitWith.forEach(user => {
      balances[user] = (balances[user] || 0) - amountPerPerson;
    });
  });
  return balances;
}

// Ripple effect for buttons
export function createRippleEffect(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.classList.add('ripple');
  
  button.appendChild(ripple);
  
  ripple.addEventListener('animationend', () => {
    ripple.remove();
  });
}

// Animate number changes
export function animateNumber(element, targetValue, duration = 500, formatter = null) {
    const startValue = parseFloat(element.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuad(progress);
        const current = startValue + (targetValue - startValue) * easedProgress;
        
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
