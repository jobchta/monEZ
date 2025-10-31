import { AppState } from './state.js';
import { safeGet, createRippleEffect, animateNumber, calculateUserBalances, showNotification } from './utils.js';
import { createElement, formatCurrency } from './renderUtils.js';

// --- Component Creators ---

export function createExpenseCard(expense, index = 0) {
    try {
        const item = createElement('div', 'activity-item');
        item.style.animationDelay = `${index * 100}ms`;
        
        const statusColor = expense.status === 'settled' ? '#10B981' : '#F59E0B';
        const statusIcon = expense.status === 'settled' ? '✅' : '⏳';
        
        // XSS FIX: Use textContent instead of innerHTML for user data
        const icon = createElement('div', 'activity-icon');
        icon.style.background = statusColor;
        icon.textContent = expense.category || '💰';
        
        const content = createElement('div', 'activity-content');
        
        const title = createElement('div', 'activity-title');
        title.textContent = expense.description; // ✅ SAFE - No XSS
        
        const meta = createElement('div', 'activity-meta');
        meta.textContent = `${expense.date || 'Recent'} • ${expense.location || 'Unknown'} ${statusIcon}`;
        
        content.appendChild(title);
        content.appendChild(meta);
        
        const amountDiv = createElement('div', 'activity-amount');
        amountDiv.textContent = formatCurrency(expense.amount);
        
        item.appendChild(icon);
        item.appendChild(content);
        item.appendChild(amountDiv);
        
        item.addEventListener('click', (e) => {
            createRippleEffect(item, e);
            showNotification(`💰 ${expense.description} - ${formatCurrency(expense.amount)}`, 'info');
        });
        
        return item;
    } catch (error) {
        console.error('Failed to create expense card:', error);
        const errorDiv = createElement('div', 'expense-card-error');
        errorDiv.textContent = 'Failed to load expense';
        return errorDiv;
    }
}




export function createBalanceRow(balance, index = 0) {
    try {
        const item = createElement('div', 'balance-item');
        item.style.animationDelay = `${index * 100}ms`;
        
        const isPositive = balance.amount > 0;
        const statusText = isPositive ? 'owes you' : 'you owe';
        const statusClass = isPositive ? 'positive' : 'negative';
        
        const avatar = createElement('div', 'balance-avatar');
        avatar.textContent = balance.name.charAt(0).toUpperCase();
        
        const content = createElement('div', 'balance-content');
        
        const name = createElement('div', 'balance-name');
        name.textContent = balance.name; // ✅ SAFE
        
        const status = createElement('div', 'balance-status');
        status.textContent = statusText;
        
        content.appendChild(name);
        content.appendChild(status);
        
        const amountContainer = createElement('div', 'balance-amount-container');
        
        const amountDiv = createElement('div', `balance-amount ${statusClass}`);
        amountDiv.textContent = formatCurrency(Math.abs(balance.amount));
        
        const btn = createElement('button', 'settle-btn-small');
        btn.dataset.action = isPositive ? 'remind' : 'pay';
        btn.dataset.friend = balance.name;
        btn.dataset.amount = Math.abs(balance.amount);
        btn.textContent = isPositive ? 'Remind' : 'Pay Now';
        
        amountContainer.appendChild(amountDiv);
        amountContainer.appendChild(btn);
        
        item.appendChild(avatar);
        item.appendChild(content);
        item.appendChild(amountContainer);
        
        return item;
    } catch (error) {
        console.error('Failed to create balance row:', error);
        const errorDiv = createElement('div', 'balance-row-error');
        errorDiv.textContent = 'Failed to load balance';
        return errorDiv;
    }
}


// --- Rendering Functions ---


// Replace ALL render functions with error boundaries:
export function renderRecentExpenses() {
    try {
        const container = safeGet('recent-expenses');
        if (!container) {
            console.error('Recent expenses container not found');
            return;
        }
        
        container.innerHTML = '';
        
        if (!AppState.expenses || AppState.expenses.length === 0) {
            renderEmptyState(container, {
                icon: '💎',
                title: 'Start tracking expenses!',
                message: 'Add your first expense to see it appear here.'
            });
            return;
        }
        
        AppState.expenses.slice(0, 3).forEach((expense, index) => {
            try {
                container.appendChild(createExpenseCard(expense, index));
            } catch (err) {
                console.error('Failed to render expense:', expense.id, err);
            }
        });
    } catch (error) {
        console.error('renderRecentExpenses failed:', error);
        showNotification('Failed to load expenses', 'error');
    }
}

export function renderAllExpenses() {
    try {
        const container = safeGet('all-expenses-list');
        if (!container) {
            console.error('All expenses container not found');
            return;
        }
        
        container.innerHTML = '';
        
        if (!AppState.expenses || AppState.expenses.length === 0) {
            renderEmptyState(container, {
                icon: '📊',
                title: 'Your expense history will appear here',
                message: 'Add expenses to track and manage your spending.',
                actionText: '➕ Add First Expense',
                onAction: () => window.showAddExpense && window.showAddExpense()
            });
            return;
        }
        
        AppState.expenses.forEach((expense, index) => {
            try {
                container.appendChild(createExpenseCard(expense, index));
            } catch (err) {
                console.error('Failed to render expense:', expense.id, err);
            }
        });
    } catch (error) {
        console.error('renderAllExpenses failed:', error);
        showNotification('Failed to load expenses', 'error');
    }
}

export function renderBalances() {
    try {
        const container = safeGet('balances-list');
        if (!container) {
            console.error('Balances container not found');
            return;
        }
        
        container.innerHTML = '';
        
        const balances = calculateUserBalances(AppState.expenses || []);
        
        if (balances.length === 0) {
            renderEmptyState(container, {
                icon: '⚖️',
                title: 'All settled up!',
                message: 'No outstanding balances. Split an expense to see balances here.'
            });
            return;
        }
        
        balances.forEach((balance, index) => {
            try {
                container.appendChild(createBalanceRow(balance, index));
            } catch (err) {
                console.error('Failed to render balance:', balance.name, err);
            }
        });
    } catch (error) {
        console.error('renderBalances failed:', error);
        showNotification('Failed to load balances', 'error');
    }
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
