import { AppState, safeGet, formatCurrency, createRippleEffect, animateNumber, calculateUserBalances, showNotification } from './utils.js';

// monEZ - Render Functions

export function renderRecentExpenses() {
  const container = safeGet('recent-expenses');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Show onboarding guidance if no expenses yet
  if (AppState.expenses.length === 0 && AppState.showExample) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #64748B;">
        <div style="font-size: 48px; margin-bottom: 16px;">💎</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #10B981;">Start tracking expenses!</div>
        <div style="font-size: 14px; margin-bottom: 20px;">Add your first expense to see it appear here</div>
        <div style="background: #F6F6F7; padding: 16px; border-radius: 12px; text-align: left; max-width: 320px; margin: 0 auto;">
          <div style="font-size: 12px; font-weight: 600; color: #846941; margin-bottom: 8px;">💡 EXAMPLE</div>
          <div style="font-size: 14px; margin-bottom: 4px;">Dinner with friends</div>
          <div style="font-size: 13px; color: #828288;">₹800 split equally with 3 friends</div>
        </div>
      </div>
    `;
    return;
  }
  
  // If no expenses but user has already used app
  if (AppState.expenses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #64748B;">
        <div style="font-size: 48px; margin-bottom: 16px;">😎</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #10B981;">All caught up!</div>
        <div style="font-size: 14px;">No recent expenses to show</div>
      </div>
    `;
    return;
  }
  
  AppState.expenses.slice(0, 3).forEach((expense, index) => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.style.opacity = '0';
    item.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      item.style.transition = 'all 0.3s ease';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, index * 100);
    
    item.innerHTML = `
      <div class="activity-icon">💸</div>
      <div class="activity-details">
        <div class="activity-title">${expense.description}</div>
        <div class="activity-meta">${formatCurrency(expense.amount)} • Split ${expense.splitWith.length + 1} ways</div>
      </div>
      <div class="activity-amount ${expense.paidBy === 'You' ? 'positive' : 'negative'}">
        ${expense.paidBy === 'You' ? '+' : '-'}${formatCurrency(expense.amount / (expense.splitWith.length + 1))}
      </div>
    `;
    
    container.appendChild(item);
  });
}

export function renderBalances() {
  const container = safeGet('balances-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  const balances = calculateUserBalances();
  
  if (balances.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #64748B;">
        <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #10B981;">All settled up!</div>
        <div style="font-size: 14px;">No outstanding balances</div>
      </div>
    `;
    return;
  }
  
  balances.forEach((balance, index) => {
    const item = document.createElement('div');
    item.className = 'balance-item';
    item.style.opacity = '0';
    item.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      item.style.transition = 'all 0.3s ease';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, index * 100);
    
    const isPositive = balance.amount > 0;
    item.innerHTML = `
      <div class="balance-user">
        <div class="user-avatar">${balance.name.charAt(0)}</div>
        <div class="user-name">${balance.name}</div>
      </div>
      <div class="balance-amount ${isPositive ? 'positive' : 'negative'}">
        ${isPositive ? 'owes you' : 'you owe'} ${formatCurrency(Math.abs(balance.amount))}
      </div>
    `;
    
    item.addEventListener('click', (e) => {
      createRippleEffect(e, item);
      showNotification(`Settlement with ${balance.name}`, 'info');
    });
    
    container.appendChild(item);
  });
}

export function renderAIFeatures() {
  const container = safeGet('ai-features');
  if (!container) return;
  
  container.innerHTML = `
    <div class="section-header">
      <h2>✨ AI-Powered Features</h2>
      <span class="badge badge-pro">PRO</span>
    </div>
    
    <div class="feature-grid">
      <div class="feature-card" onclick="tryAIFeature('receipt')">
        <span class="feature-icon">📸</span>
        <div>
          AI Receipt Scanning
          Scan receipts with 98.5% accuracy
        </div>
        <button class="try-btn">TRY</button>
      </div>
      
      <div class="feature-card" onclick="tryAIFeature('voice')">
        <span class="feature-icon">🎤</span>
        <div>
          Voice Commands
          Add expenses in 22 languages
        </div>
        <button class="try-btn">TRY</button>
      </div>
      
      <div class="feature-card" onclick="tryAIFeature('analytics')">
        <span class="feature-icon">📊</span>
        <div>
          Advanced Analytics
          AI-powered spending insights
        </div>
        <button class="try-btn">TRY</button>
      </div>
    </div>
  `;
}

export function updateBalance() {
  let balance = 0;
  
  AppState.expenses.forEach(expense => {
    const splitAmount = expense.amount / (expense.splitWith.length + 1);
    if (expense.paidBy === 'You') {
      balance += expense.amount - splitAmount;
    } else {
      balance -= splitAmount;
    }
  });
  
  const previousBalance = AppState.balance;
  AppState.balance = balance;
  
  const balanceElement = safeGet('balance-hero');
  if (balanceElement && AppState.animations.enabled && Math.abs(balance - previousBalance) > 0) {
    animateNumber(balanceElement, previousBalance, balance, 800);
  } else if (balanceElement) {
    balanceElement.textContent = formatCurrency(Math.abs(balance));
  }
}

// TODO: Implement renderOnboardingPanel
export function renderOnboardingPanel() {
  // TODO: Render onboarding panel with welcome flow
  // Should display welcome screens, feature highlights, and initial setup
  console.log('renderOnboardingPanel: stub - needs implementation');
}

// TODO: Implement renderInvitePanel
export function renderInvitePanel() {
  // TODO: Render invite panel for sharing with friends
  // Should display invite options, referral links, and social sharing
  console.log('renderInvitePanel: stub - needs implementation');
}

// TODO: Implement renderSplitBillPanel
export function renderSplitBillPanel() {
  // TODO: Render split bill panel for expense splitting
  // Should display expense form, split options, and participant selection
  console.log('renderSplitBillPanel: stub - needs implementation');
}

// TODO: Implement renderGroupPanel
export function renderGroupPanel() {
  // TODO: Render group panel for managing expense groups
  // Should display group list, group creation, and member management
  console.log('renderGroupPanel: stub - needs implementation');
}
