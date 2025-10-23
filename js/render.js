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
          <div style="font-size: 14px; margin-bottom: 4px;"><strong>Dinner with friends</strong></div>
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
    item.style.animationDelay = `${index * 100}ms`;

    const statusColor = expense.status === 'settled' ? '#10B981' : '#F59E0B';
    const statusIcon = expense.status === 'settled' ? '✅' : '⏳';

    item.innerHTML = `
      <div class="activity-icon" style="background: ${statusColor};">
        ${expense.category || '💰'}
      </div>
      <div class="activity-content">
        <div class="activity-title">${expense.description}</div>
        <div class="activity-meta">
          ${expense.date} • ${expense.location || 'Unknown location'} ${statusIcon}
        </div>
      </div>
      <div class="activity-amount">${formatCurrency(expense.amount)}</div>
    `;

    item.addEventListener('click', (e) => {
      createRippleEffect(item, e);
      showNotification(`💰 ${expense.description} - ${formatCurrency(expense.amount)}`, 'info');
    });

    container.appendChild(item);
  });
}

export function renderAllExpenses() {
  const container = safeGet('all-expenses-list');
  if (!container) return;

  container.innerHTML = '';

  // Show onboarding guidance if no expenses yet
  if (AppState.expenses.length === 0 && AppState.showExample) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #64748B;">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #10B981;">Your expense history will appear here</div>
        <div style="font-size: 14px; margin-bottom: 24px;">Add expenses to track and manage your spending</div>
        <button onclick="showAddExpense()" style="background: #846941; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
          ➕ Add First Expense
        </button>
      </div>
    `;
    return;
  }

  if (AppState.expenses.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748B;">No expenses yet</div>';
    return;
  }

  AppState.expenses.forEach((expense, index) => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.style.animationDelay = `${index * 50}ms`;

    const statusColor = expense.status === 'settled' ? '#10B981' : '#F59E0B';

    item.innerHTML = `
      <div class="activity-icon" style="background: ${statusColor};">
        ${expense.category || '💰'}
      </div>
      <div class="activity-content">
        <div class="activity-title">${expense.description}</div>
        <div class="activity-meta">${expense.date}</div>
      </div>
      <div class="activity-amount">${formatCurrency(expense.amount)}</div>
    `;

    container.appendChild(item);
  });
}

export function renderBalances() {
  const container = safeGet('balances-list');
  if (!container) return;

  container.innerHTML = '';

  const balances = calculateUserBalances();

  // Show onboarding guidance if no balances yet
  if (balances.length === 0 && AppState.showExample) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #64748B;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚖️</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #10B981;">Track who owes what</div>
        <div style="font-size: 14px; margin-bottom: 20px;">Split expenses with friends and see balances here</div>
        <div style="background: #F6F6F7; padding: 16px; border-radius: 12px; text-align: left; max-width: 320px; margin: 0 auto;">
          <div style="font-size: 12px; font-weight: 600; color: #846941; margin-bottom: 8px;">💡 HOW IT WORKS</div>
          <div style="font-size: 13px; line-height: 1.6;">
            1. Add an expense<br>
            2. Select who to split with<br>
            3. See who owes you (or who you owe)
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (balances.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #64748B;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚖️</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #10B981;">All settled up!</div>
        <div style="font-size: 14px;">No outstanding balances</div>
      </div>
    `;
    return;
  }

  balances.forEach((balance, index) => {
    const item = document.createElement('div');
    item.className = 'balance-item';
    item.style.animationDelay = `${index * 100}ms`;

    const isPositive = balance.amount > 0;
    const statusText = isPositive ? 'owes you' : 'you owe';
    const statusClass = isPositive ? 'positive' : 'negative';
    const avatar = balance.name.charAt(0).toUpperCase();

    item.innerHTML = `
      <div class="balance-avatar">${avatar}</div>
      <div class="balance-content">
        <div class="balance-name">${balance.name}</div>
        <div class="balance-status">${statusText} • Last activity: 2 days ago</div>
      </div>
      <div class="balance-amount-container">
        <div class="balance-amount ${statusClass}">
          ${formatCurrency(Math.abs(balance.amount))}
        </div>
        ${!isPositive ?
          `<button class="settle-btn-small" onclick="settleBalance('${balance.name}', ${Math.abs(balance.amount)})">Pay Now</button>` :
          `<button class="settle-btn-small" onclick="remindUser('${balance.name}')">Remind</button>`
        }
      </div>
    `;

    container.appendChild(item);
  });
}

import { addFriend, searchFriends } from './friends.js';

export function populatePeopleSelector() {
  const container = safeGet('people-selector');
  if (!container) return;

  container.innerHTML = '';

  // Show guidance if no friends added yet
  if (AppState.friends.length === 0 && AppState.showExample) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 24px; background: #F6F6F7; border-radius: 12px; color: #64748B;">
        <div style="font-size: 32px; margin-bottom: 12px;">👥</div>
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Add friends to split with</div>
        <div style="font-size: 13px; margin-bottom: 16px;">Type a name below and press Enter</div>
        <input 
          type="text" 
          id="quick-add-friend" 
          placeholder="Friend's name (e.g., Rahul)" 
          style="width: 100%; padding: 12px; border: 1px solid #ECECEC; border-radius: 8px; font-size: 14px;"
        >
      </div>
    `;
    
    // Add event listener for quick friend add
    setTimeout(() => {
      const input = safeGet('quick-add-friend');
      if (input) {
        input.addEventListener('keypress', async (e) => {
          if (e.key === 'Enter' && input.value.trim()) {
            const name = input.value.trim();
            await addFriend(name);
            input.value = '';
          }
        });
      }
    }, 100);
    return;
  }

  if (AppState.friends.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #64748B;">
        <div style="font-size: 14px; margin-bottom: 12px;">No friends added yet</div>
        <button 
          id="add-friend-btn"
          style="background: var(--gold-accent); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;"
        >
          + Add Friend
        </button>
      </div>
    `;
    const addFriendBtn = safeGet('add-friend-btn');
    if (addFriendBtn) {
      addFriendBtn.addEventListener('click', () => showAddFriendModal());
    }
    return;
  }

  // Render friend cards
  AppState.friends.forEach(friend => {
    const card = document.createElement('div');
    card.className = 'person-card';
    card.dataset.friendId = friend.id;

    card.innerHTML = `
      <div class="person-avatar" style="background: ${friend.color}">
        ${friend.avatar}
      </div>
      <div class="person-name">${friend.name.split(' ')[0]}</div>
    `;

    card.addEventListener('click', (e) => {
      const isSelected = card.classList.contains('selected');

      if (isSelected) {
        card.classList.remove('selected');
        AppState.selectedFriends.delete(friend.id);
      } else {
        card.classList.add('selected');
        AppState.selectedFriends.add(friend.id);
      }

      createRippleEffect(card, e);
    });

    container.appendChild(card);
  });
  
  // Add "Add Friend" button at the end
  const addBtn = document.createElement('div');
  addBtn.className = 'person-card add-friend-card';
  addBtn.innerHTML = `
    <div class="person-avatar" style="background: var(--gold-accent);">
      +
    </div>
    <div class="person-name">Add</div>
  `;
  addBtn.addEventListener('click', () => showAddFriendModal());
  container.appendChild(addBtn);
}

// Add Friend Modal (you'll need to add HTML for this)
function showAddFriendModal() {
  const name = prompt('Enter friend\'s name:');
  if (name && name.trim()) {
    addFriend(name.trim());
  }
}


// Helper function to add friend
function addFriend(name) {
  const colors = ['#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];
  const avatar = name.charAt(0).toUpperCase();
  const color = colors[AppState.friends.length % colors.length];
  
  AppState.friends.push({ name, avatar, color });
  populatePeopleSelector();
  showNotification(`✅ ${name} added to your friends!`, 'success');
}

export function renderGroupsPreview() {
  const container = safeGet('groups-preview');
  if (!container) return;

  container.innerHTML = '';

  // Show guidance if no groups yet
  if (AppState.groups.length === 0 && AppState.showExample) {
    container.innerHTML = `
      <div style="min-width: 100%; text-align: center; padding: 24px; background: #F6F6F7; border-radius: 12px; color: #64748B;">
        <div style="font-size: 32px; margin-bottom: 12px;">👥</div>
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Create groups for trips or events</div>
        <div style="font-size: 13px;">Coming soon!</div>
      </div>
    `;
    return;
  }

  if (AppState.groups.length === 0) {
    container.innerHTML = `
      <div style="min-width: 100%; text-align: center; padding: 20px; color: #64748B;">
        <div style="font-size: 14px;">No groups yet</div>
      </div>
    `;
    return;
  }

  AppState.groups.forEach(group => {
    const card = document.createElement('div');
    card.className = 'group-card';

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

    card.addEventListener('click', (e) => {
      createRippleEffect(card, e);
      showNotification(`👥 ${group.name}: ${group.members} members`, 'info');
    });

    container.appendChild(card);
  });
}

export function renderGroups() {
  const container = safeGet('groups-grid');
  if (!container) return;

  container.innerHTML = '';

  // Show guidance if no groups yet
  if (AppState.groups.length === 0 && AppState.showExample) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #64748B;">
        <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #10B981;">Organize expenses by groups</div>
        <div style="font-size: 14px; margin-bottom: 20px;">Perfect for trips, roommates, or events</div>
        <div style="background: #F6F6F7; padding: 16px; border-radius: 12px; text-align: left; max-width: 320px; margin: 0 auto;">
          <div style="font-size: 12px; font-weight: 600; color: #846941; margin-bottom: 8px;">💡 COMING SOON</div>
          <div style="font-size: 13px; line-height: 1.6;">
            Create groups for:<br>
            🏖️ Vacation trips<br>
            🏠 Roommate expenses<br>
            🎉 Events & parties
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (AppState.groups.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748B;">No groups yet</div>';
    return;
  }

  AppState.groups.forEach(group => {
    const card = document.createElement('div');
    card.className = 'group-card-full';

    card.innerHTML = `
      <div class="group-header">
        <span class="group-icon" style="font-size: 32px;">${group.icon}</span>
        <div>
          <div class="group-name" style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${group.name}</div>
          <div class="group-members" style="font-size: 14px; color: #64748B;">${group.members} members</div>
        </div>
      </div>
      <div style="margin-top: 16px; text-align: right;">
        <div style="font-size: 12px; color: #64748B; margin-bottom: 4px;">Your balance</div>
        <div class="group-balance" style="font-size: 20px; font-weight: 700; color: ${group.balance >= 0 ? '#10B981' : '#EF4444'}">
          ${group.balance >= 0 ? '+' : ''}${formatCurrency(Math.abs(group.balance))}
        </div>
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
      <div style="display: grid; gap: 16px;">
        <div onclick="tryAIFeature('receipt')" style="background: #FEFEFE; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">📸</span>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">AI Receipt Scanning</div>
              <div style="font-size: 14px; color: #64748B;">Scan receipts with 98.5% accuracy</div>
            </div>
            <span style="background: #10B981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">TRY</span>
          </div>
        </div>
        <div onclick="tryAIFeature('voice')" style="background: #FEFEFE; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">🎤</span>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">Voice Commands</div>
              <div style="font-size: 14px; color: #64748B;">Add expenses in 22 languages</div>
            </div>
            <span style="background: #10B981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">TRY</span>
          </div>
        </div>
        <div onclick="tryAIFeature('analytics')" style="background: #FEFEFE; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">📊</span>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">Advanced Analytics</div>
              <div style="font-size: 14px; color: #64748B;">AI-powered spending insights</div>
            </div>
            <span style="background: #10B981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">TRY</span>
          </div>
        </div>
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
