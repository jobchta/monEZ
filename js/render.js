// monEZ - Render Functions

function renderRecentExpenses() {
  const container = $('recent-expenses');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (AppState.expenses.length === 0) {
    AppState.expenses = [...premiumExpenses];
  }
  
  if (AppState.expenses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #64748B;">
        <div style="font-size: 48px; margin-bottom: 16px;">💎</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #10B981;">No expenses yet</div>
        <div style="font-size: 14px;">Start splitting bills with style</div>
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

function renderAllExpenses() {
  const container = $('all-expenses-list');
  if (!container) return;
  
  container.innerHTML = '';
  
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

function renderBalances() {
  const container = $('balances-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  const balances = calculateUserBalances();
  
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

function populatePeopleSelector() {
  const container = $('people-selector');
  if (!container) return;
  
  container.innerHTML = '';
  
  AppState.friends.forEach(friend => {
    const card = document.createElement('div');
    card.className = 'person-card';
    card.dataset.friendName = friend.name;
    
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
        AppState.selectedFriends.delete(friend.name);
      } else {
        card.classList.add('selected');
        AppState.selectedFriends.add(friend.name);
      }
      
      createRippleEffect(card, e);
    });
    
    container.appendChild(card);
  });
}

function renderGroupsPreview() {
  const container = $('groups-preview');
  if (!container) return;
  
  container.innerHTML = '';
  
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

function renderGroups() {
  const container = $('groups-grid');
  if (!container) return;
  
  container.innerHTML = '';
  
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

function renderPremiumFeatures() {
  const container = $('premium-features');
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
