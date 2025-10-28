import { AppState, safeGet, formatCurrency, createRippleEffect, animateNumber, calculateUserBalances, showNotification } from './utils.js';

// monEZ - Render Functions
export function renderRecentExpenses() { /* omitted for brevity in editor paste step */ }
export function renderBalances() { /* omitted for brevity in editor paste step */ }
export function renderAIFeatures() { /* omitted for brevity in editor paste step */ }
export function updateBalance() { /* omitted for brevity in editor paste step */ }
export function renderOnboardingPanel() { /* omitted for brevity in editor paste step */ }
export function renderInvitePanel() { /* omitted for brevity in editor paste step */ }
export function renderSplitBillPanel() { /* omitted for brevity in editor paste step */ }

// Required exports for views.js compatibility
export function renderGroupsPreview() {
  const container = safeGet('groups-preview');
  if (!container) return;
  const groups = AppState.groups || [];
  if (groups.length === 0) {
    container.innerHTML = `<div class="empty-state">No groups yet. Create one to get started.</div>`;
    return;
  }
  container.innerHTML = groups.map(g => `
    <div class="group-card" data-id="${g.id}">
      <div class="group-title">${g.name}</div>
      <div class="group-meta">${g.members?.length || 1} members • ${g.expenses?.length || 0} expenses</div>
      <div class="group-balance ${g.balance > 0 ? 'positive' : (g.balance < 0 ? 'negative' : '')}">
        ${g.balance === 0 ? 'settled' : (g.balance > 0 ? 'you are owed' : 'you owe')} ${formatCurrency(Math.abs(g.balance||0))}
      </div>
    </div>`).join('');
}

export function renderAllExpenses() {
  const list = safeGet('all-expenses');
  if (!list) return;
  const items = (AppState.expenses || []).slice().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state">No expenses yet.</div>`;
    return;
  }
  list.innerHTML = items.map(e => `
    <div class="expense-item">
      <div class="expense-main">
        <div class="expense-title">${e.description}</div>
        <div class="expense-meta">${new Date(e.createdAt||Date.now()).toLocaleString()} • split ${ (e.splitWith?.length||0) + 1 } ways</div>
      </div>
      <div class="expense-amount ${e.paidBy === 'You' ? 'positive' : 'negative'}">
        ${e.paidBy === 'You' ? '+' : '-'}${formatCurrency(e.amount)}
      </div>
    </div>`).join('');
}

export function renderGroups() {
  const root = safeGet('groups-root');
  if (!root) return;
  const groups = AppState.groups || [];
  root.innerHTML = `
    <div class="groups-header">
      <button id="create-group">New group</button>
    </div>
    <div id="groups-list" class="groups-list">
      ${groups.map(g => `
        <div class="group-row" data-id="${g.id}">
          <div class="group-row-main">
            <div class="group-row-title">${g.name}</div>
            <div class="group-row-meta">${g.members?.length || 1} members</div>
          </div>
          <div class="group-row-balance ${g.balance>0?'positive':(g.balance<0?'negative':'')}">
            ${g.balance===0?'settled':(g.balance>0?'you are owed':'you owe')} ${formatCurrency(Math.abs(g.balance||0))}
          </div>
        </div>`).join('')}
    </div>`;

  (safeGet('create-group') as any)?.addEventListener('click', () => showNotification('Group creation not implemented in demo', 'info'));
  Array.from(document.querySelectorAll('.group-row')).forEach((row:any)=>{
    row.addEventListener('click', (e:any)=>{ createRippleEffect(e, row as any); AppState.activeGroupId = row.dataset.id; showNotification('Opened group '+row.querySelector('.group-row-title')?.textContent, 'info'); });
  });
}

export function renderPremiumFeatures() {
  const panel = safeGet('premium-panel') || safeGet('ai-features');
  if (!panel) return;
  panel.innerHTML = `
    <div class="premium-hero">Unlock monEZ Pro</div>
    <ul class="premium-list">
      <li>📸 AI receipt scanning</li>
      <li>🎤 Voice commands</li>
      <li>📊 Advanced analytics</li>
      <li>⚡ Priority sync</li>
    </ul>
    <button id="go-pro" class="btn-pro">Get Pro</button>`;
  (safeGet('go-pro') as any)?.addEventListener('click', () => showNotification('Pro purchase flow not enabled in demo', 'warning'));
}

export function populatePeopleSelector(targetId='people-select') {
  const target = safeGet(targetId);
  if (!target) return;
  const friends = AppState.friends || [];
  target.innerHTML = friends.map(f => `
    <label class="chip"><input type="checkbox" data-id="${f.id}" class="person-pick"/> ${f.name}</label>`).join('');
}
