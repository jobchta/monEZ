import { AppState } from './globals.js';
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
        <button class="settle-btn-small" data-action="${isPositive ? 'remind' : 'pay'}" data-friend="${balance.name}" data-amount="${Math.abs(balance.amount)}">
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
            ${message}
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

export function renderGroups() {
    const container = safeGet('groups-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (AppState.groups.length === 0) {
        renderEmptyState(container, {
            icon: '👥',
            title: 'No groups yet',
            message: 'Create a group to organize expenses with friends.'
        });
        return;
    }
    
    AppState.groups.forEach((group, index) => {
        const card = createElement('div', 'group-card');
        card.innerHTML = `
            <div class="group-header">
                <span class="group-icon">${group.icon}</span>
                <span class="group-name">${group.name}</span>
            </div>
            <div class="group-members">${group.members} members</div>
            <div class="group-balance" style="color: ${group.balance >= 0 ? '#10B981' : '#EF4444'}">
                ${group.balance >= 0 ? '+' : ''}${formatCurrency(Math.abs(group.balance))}
            </div>
        `;
        container.appendChild(card);
    });
}

export function renderGroupsPreview() {
    const container = safeGet('groups-preview');
    if (!container) return;
    container.innerHTML = '';
    
    if (AppState.groups.length === 0) {
        renderEmptyState(container, {
            icon: '👥',
            title: 'No groups yet',
            message: 'Create your first group to get started.'
        });
        return;
    }
    
    AppState.groups.forEach((group, index) => {
        const card = createElement('div', 'group-card');
        card.innerHTML = `
            <div class="group-header">
                <span class="group-icon">${group.icon}</span>
                <span class="group-name">${group.name}</span>
            </div>
            <div class="group-members">${group.members} members</div>
            <div class="group-balance" style="color: ${group.balance >= 0 ? '#10B981' : '#EF4444'}">
                ${group.balance >= 0 ? '+' : ''}${formatCurrency(Math.abs(group.balance))}
            </div>
        `;
        container.appendChild(card);
    });
}

export function renderPremiumFeatures() {
    const container = safeGet('premium-features');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 20px;">
            <div style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: white; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
                <h3 style="margin: 0 0 8px 0; font-size: 24px;">Premium Features</h3>
                <p style="margin: 0 0 20px 0; opacity: 0.9;">Unlock the full potential of monEZ</p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px;">
                    <span style="font-size: 20px; text-decoration: line-through; opacity: 0.7;">₹299</span>
                    <span style="font-size: 32px; font-weight: bold; color: #F59E0B;">₹119/month</span>
                    <span style="background: #F59E0B; color: #1E293B; padding: 4px 8px; border-radius: 20px; font-size: 12px; font-weight: bold;">60% OFF</span>
                </div>
                <button onclick="startPremiumTrial()" style="background: white; color: #8B5CF6; border: none; border-radius: 8px; padding: 12px 24px; font-size: 16px; font-weight: 600; cursor: pointer;">Start Free Trial</button>
            </div>
        </div>
    `;
}

export function renderOnboardingPanel() {
    const container = safeGet('onboarding-modal');
    if (!container) return;
    // This is handled by the onboarding.js module
    return;
}

export function renderInvitePanel() {
    const container = safeGet('invite-panel');
    if (!container) return;
    container.innerHTML = `
        <div class="invite-content">
            <div class="invite-title">Invite Friends</div>
            <div class="invite-description">Share monEZ with your friends to split expenses easily</div>
            <button class="btn-primary" onclick="shareApp()">Share App</button>
        </div>
    `;
}

export function renderSplitBillPanel() {
    const container = safeGet('split-bill-panel');
    if (!container) return;
    container.innerHTML = `
        <div class="split-bill-content">
            <div class="split-bill-title">Split a Bill</div>
            <button class="btn-primary" onclick="showAddExpense()">Add New Expense</button>
        </div>
    `;
}

export function renderGroupPanel() {
    const container = safeGet('group-panel');
    if (!container) return;
    // This is handled by the group view system
    return;
}
