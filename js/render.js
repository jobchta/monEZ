import { AppState } from './state.js';
import { safeGet, createRippleEffect, animateNumber, calculateUserBalances, showNotification } from './utils.js';
import { createElement, formatCurrency } from './renderUtils.js';

// --- Component Creators ---

export function createExpenseCard(expense, index = 0) {
    const item = createElement('div', 'activity-item');
    item.style.animationDelay = `${index * 100}ms`;

    const statusColor = expense.status === 'settled' ? '#10B981' : '#F59E0B';
    const statusIcon = expense.status === 'settled' ? '✅' : '⏳';

    item.innerHTML = `
      <div class="activity-icon" style="background: ${statusColor};">${expense.category || '💰'}</div>
      <div class="activity-content">
        <div class="activity-title">${expense.description}</div>
        <div class="activity-meta">${expense.date || 'Recent'} • ${expense.location || 'Unknown'} ${statusIcon}</div>
      </div>
      <div class="activity-amount">${formatCurrency(expense.amount)}</div>
    `;

    item.addEventListener('click', (e) => {
      createRippleEffect(item, e);
      showNotification(`💰 ${expense.description} - ${formatCurrency(expense.amount)}`, 'info');
    });

    return item;
}

export function createBalanceRow(balance, index = 0) {
    const item = createElement('div', 'balance-item');
    item.style.animationDelay = `${index * 100}ms`;

    const isPositive = balance.amount > 0;
    const statusText = isPositive ? 'owes you' : 'you owe';
    const statusClass = isPositive ? 'positive' : 'negative';

    item.innerHTML = `
      <div class="balance-avatar">${balance.name.charAt(0).toUpperCase()}</div>
      <div class="balance-content">
        <div class="balance-name">${balance.name}</div>
        <div class="balance-status">${statusText}</div>
      </div>
      <div class="balance-amount-container">
        <div class="balance-amount ${statusClass}">${formatCurrency(Math.abs(balance.amount))}</div>
      </div>
    `;

    item.addEventListener('click', (e) => {
      createRippleEffect(item, e);
      showNotification(`Balance with ${balance.name}: ${formatCurrency(Math.abs(balance.amount))}`, 'info');
    });

    return item;
}

// --- Rendering Functions ---

export function renderExpenses() {
    const container = safeGet('activity-container');
    if (!container) return;

    container.innerHTML = '';

    const expenses = AppState.getExpenses();

    if (expenses.length === 0) {
      container.innerHTML = '<div class="empty-state">💰 No expenses yet</div>';
      return;
    }

    expenses.forEach((expense, index) => {
      const card = createExpenseCard(expense, index);
      container.appendChild(card);
    });
}

export function renderBalances() {
    const container = safeGet('balances-container');
    if (!container) return;

    container.innerHTML = '';

    const expenses = AppState.getExpenses();
    const balances = calculateUserBalances(expenses);

    if (balances.length === 0) {
      container.innerHTML = '<div class="empty-state">👥 No balances yet</div>';
      return;
    }

    balances.forEach((balance, index) => {
      const row = createBalanceRow(balance, index);
      container.appendChild(row);
    });
}

export function updateDashboardStats() {
    const expenses = AppState.getExpenses();

    const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpenses = expenses.length;
    const settledCount = expenses.filter(e => e.status === 'settled').length;

    const totalSpentEl = safeGet('total-spent');
    if (totalSpentEl) {
      const currentValue = parseFloat(totalSpentEl.textContent.replace(/[^0-9.-]+/g, '')) || 0;
      animateNumber(totalSpentEl, currentValue, totalSpent, 1000, formatCurrency);
    }

    const totalExpensesEl = safeGet('total-expenses');
    if (totalExpensesEl) {
      const currentValue = parseInt(totalExpensesEl.textContent) || 0;
      animateNumber(totalExpensesEl, currentValue, totalExpenses, 1000);
    }

    const settledEl = safeGet('settled-count');
    if (settledEl) {
      const currentValue = parseInt(settledEl.textContent) || 0;
      animateNumber(settledEl, currentValue, settledCount, 1000);
    }
}

export function updateAllViews() {
    renderExpenses();
    renderBalances();
    updateDashboardStats();
}
