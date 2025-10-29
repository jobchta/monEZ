import { AppState, safeGet, createRippleEffect, animateNumber, calculateUserBalances, showNotification } from './utils.js';
import { createElement, formatCurrency, formatDate } from './renderUtils.js';
import { addFriend } from './friends.js';

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
        <div class="activity-meta">${formatDate(expense.timestamp)} • ${expense.location || 'Unknown'} ${statusIcon}</div>
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
        <button class="settle-btn-small" onclick="${isPositive ? 'remindUser' : 'settleBalance'}('${balance.name}', ${Math.abs(balance.amount)})">
          ${isPositive ? 'Remind' : 'Pay Now'}
        </button>
      </div>
    `;
    return item;
}

export function createFriendCard(friend) {
    const card = createElement('div', 'person-card');
    card.dataset.friendId = friend.id;
    card.innerHTML = `
        <div class="person-avatar" style="background: ${friend.color}">${friend.avatar}</div>
        <div class="person-name">${friend.name.split(' ')[0]}</div>
    `;
    card.addEventListener('click', (e) => {
        card.classList.toggle('selected');
        AppState.selectedFriends.has(friend.id) ? AppState.selectedFriends.delete(friend.id) : AppState.selectedFriends.add(friend.id);
        createRippleEffect(card, e);
    });
    return card;
}

// --- Empty State Renderer ---

function renderEmptyState(container, { icon, title, message, actionText, onAction }) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <div class="empty-title">${title}</div>
            <p>${message}</p>
            ${actionText ? `<button class="btn-primary">${actionText}</button>` : ''}
        </div>
    `;
    if (actionText && onAction) {
        container.querySelector('button').addEventListener('click', onAction);
    }
}

// --- Main Render Functions ---

export function renderRecentExpenses() {
    const container = safeGet('recent-expenses');
    if (!container) return;
    container.innerHTML = '';

    if (AppState.expenses.length === 0) {
        renderEmptyState(container, {
            icon: '💎',
            title: 'Start tracking expenses!',
            message: 'Add your first expense to see it appear here.'
        });
        return;
    }

    AppState.expenses.slice(0, 3).forEach((expense, index) => {
        container.appendChild(createExpenseCard(expense, index));
    });
}

export function renderAllExpenses() {
    const container = safeGet('all-expenses-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (AppState.expenses.length === 0) {
        renderEmptyState(container, {
            icon: '📊',
            title: 'Your expense history will appear here',
            message: 'Add expenses to track and manage your spending.',
            actionText: '➕ Add First Expense',
            onAction: () => window.showAddExpense()
        });
        return;
    }

    AppState.expenses.forEach((expense, index) => {
        container.appendChild(createExpenseCard(expense, index));
    });
}

export function renderBalances() {
    const container = safeGet('balances-list');
    if (!container) return;
    container.innerHTML = '';

    const balances = calculateUserBalances();

    if (balances.length === 0) {
        renderEmptyState(container, {
            icon: '⚖️',
            title: 'All settled up!',
            message: 'No outstanding balances. Split an expense to see balances here.'
        });
        return;
    }

    balances.forEach((balance, index) => {
        container.appendChild(createBalanceRow(balance, index));
    });
}

export function populatePeopleSelector() {
    const container = safeGet('people-selector');
    if (!container) return;
    container.innerHTML = '';

    if (AppState.friends.length === 0) {
        renderEmptyState(container, {
            icon: '👥',
            title: 'Add friends to split with',
            message: 'You can add friends from the settings page.'
        });
        return;
    }

    AppState.friends.forEach(friend => {
        container.appendChild(createFriendCard(friend));
    });

    const addBtn = createElement('div', 'person-card add-friend-card');
    addBtn.innerHTML = `<div class="person-avatar" style="background: var(--gold-accent);">+</div><div class="person-name">Add</div>`;
    addBtn.addEventListener('click', () => { /* Logic to show add friend modal */ });
    container.appendChild(addBtn);
}

// ... (renderGroupsPreview, renderGroups, renderPremiumFeatures can also be refactored similarly)

export function updateBalance() {
    let balance = 0;
    AppState.expenses.forEach(expense => {
        const splitAmount = expense.amount / (expense.splitWith.length + 1);
        balance += (expense.paidBy === 'You') ? (expense.amount - splitAmount) : -splitAmount;
    });

    const previousBalance = AppState.balance || 0;
    AppState.balance = balance;

    const balanceElement = safeGet('balance-hero');
    if (!balanceElement) return;

    if (AppState.animations.enabled && Math.abs(balance - previousBalance) > 0.01) {
        animateNumber(balanceElement, previousBalance, balance, 800);
    } else {
        balanceElement.textContent = formatCurrency(Math.abs(balance));
    }
}
