import { AppState, safeGet, formatCurrency, createRippleEffect, animateNumber, calculateUserBalances, showNotification } from './utils.js';
// monEZ - Render Functions
export function renderRecentExpenses() {
  const container = safeGet('recent-expenses');
  if (!container) return;
  container.innerHTML = '';
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
      </div>`;
    return;
  }
  if (AppState.expenses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #64748B;">
        <div style="font-size: 48px; margin-bottom: 16px;">😎</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #10B981;">All caught up!</div>
        <div style="font-size: 14px;">No recent expenses to show</div>
      </div>`;
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
      </div>`;
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
      </div>`;
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
      </div>`;
    item.addEventListener('click', (e) => { createRippleEffect(e, item); showNotification(`Settlement with ${balance.name}`, 'info'); });
    container.appendChild(item);
  });
}
export function renderAIFeatures() {
  const container = safeGet('ai-features');
  if (!container) return;
  container.innerHTML = `
    <div class="section-header">
      ✨ AI-Powered Features
      <span class="badge badge-pro">PRO</span>
    </div>
    <div class="feature-grid">
      <div class="feature-card" onclick="tryAIFeature('receipt')">
        <span class="feature-icon">📸</span>
        <div>AI Receipt Scanning<br/>Scan receipts with 98.5% accuracy</div>
        <button class="try-btn">TRY</button>
      </div>
      <div class="feature-card" onclick="tryAIFeature('voice')">
        <span class="feature-icon">🎤</span>
        <div>Voice Commands<br/>Add expenses in 22 languages</div>
        <button class="try-btn">TRY</button>
      </div>
      <div class="feature-card" onclick="tryAIFeature('analytics')">
        <span class="feature-icon">📊</span>
        <div>Advanced Analytics<br/>AI-powered spending insights</div>
        <button class="try-btn">TRY</button>
      </div>
    </div>`;
}
export function updateBalance() {
  let balance = 0;
  AppState.expenses.forEach(expense => {
    const splitAmount = expense.amount / (expense.splitWith.length + 1);
    if (expense.paidBy === 'You') balance += expense.amount - splitAmount; else balance -= splitAmount;
  });
  const previousBalance = AppState.balance;
  AppState.balance = balance;
  const balanceElement = safeGet('balance-hero');
  if (balanceElement && AppState.animations?.enabled && Math.abs(balance - previousBalance) > 0) {
    animateNumber(balanceElement, previousBalance, balance, 800);
  } else if (balanceElement) {
    balanceElement.textContent = formatCurrency(Math.abs(balance));
  }
}
export function renderOnboardingPanel() {
  const modal = safeGet('onboarding-modal');
  if (!modal) return;
  const steps = [
    { title: 'Welcome to monEZ', body: 'Let’s set up your experience and preferences.' },
    { title: 'Add your friends', body: 'So you can split and settle easily.' },
    { title: 'Enable notifications', body: 'Get alerts for splits, dues and settlements.' }
  ];
  AppState.onboarding = AppState.onboarding || { step: 0, prefs: {} };
  function renderStep() {
    const step = steps[AppState.onboarding.step];
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal">
        <h2>${step.title}</h2>
        <p>${step.body}</p>
        <div class="onboarding-controls">
          <label class="pref"><input type="checkbox" id="pref-animations" ${AppState.animations?.enabled ? 'checked' : ''}/> Enable animations</label>
          <label class="pref"><input type="checkbox" id="pref-notifs" ${AppState.push?.enabled ? 'checked' : ''}/> Enable notifications</label>
        </div>
        <div class="modal-actions">
          <button id="ob-skip">Skip</button>
          <button id="ob-prev" ${AppState.onboarding.step === 0 ? 'disabled' : ''}>Back</button>
          <button id="ob-next">${AppState.onboarding.step === steps.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      </div>`;
    (safeGet('ob-prev') as any)?.addEventListener('click', () => { if (AppState.onboarding.step > 0) { AppState.onboarding.step--; renderStep(); } });
    (safeGet('ob-next') as any)?.addEventListener('click', async () => {
      AppState.animations = { ...(AppState.animations||{}), enabled: !!(safeGet('pref-animations') as any)?.checked };
      AppState.push = { ...(AppState.push||{}), enabled: !!(safeGet('pref-notifs') as any)?.checked };
      if (AppState.onboarding.step < steps.length - 1) { AppState.onboarding.step++; renderStep(); }
      else { modal.innerHTML = ''; AppState.onboarding.completed = true; showNotification('Onboarding complete. You’re all set!', 'success'); }
    });
    (safeGet('ob-skip') as any)?.addEventListener('click', () => { modal.innerHTML = ''; AppState.onboarding.skipped = true; showNotification('Onboarding skipped. You can revisit anytime.', 'info'); });
  }
  renderStep();
}
export function renderInvitePanel() {
  const panel = safeGet('invite-panel');
  if (!panel) return;
  const link = AppState.referralLink || `${location.origin}${location.pathname}?ref=${AppState.currentUser?.id || 'guest'}`;
  panel.innerHTML = `
    <h3>Invite friends</h3>
    <p>Share your link to split and settle faster.</p>
    <div class="invite-row">
      <input id="invite-link" readonly value="${link}" />
      <button id="copy-invite">Copy</button>
      <button id="share-invite">Share</button>
    </div>`;
  (safeGet('copy-invite') as any)?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(link); showNotification('Invite link copied', 'success'); }
    catch { showNotification('Could not copy link', 'error'); }
  });
  (safeGet('share-invite') as any)?.addEventListener('click', async () => {
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: 'Join me on monEZ', url: link }); showNotification('Invite sent', 'success'); }
      catch { showNotification('Share cancelled', 'info'); }
    } else { showNotification('Native share not supported', 'warning'); }
  });
}
export function renderSplitBillPanel() {
  const panel = safeGet('split-bill-panel');
  if (!panel) return;
  const friends = AppState.friends || [];
  panel.innerHTML = `
    <h3>Split a bill</h3>
    <div class="split-form">
      <input id="sb-desc" placeholder="Description (e.g., Dinner)"/>
      <input id="sb-amount" type="number" min="0" step="0.01" placeholder="Total amount"/>
      <div class="participants">
        ${friends.map(f => `<label class=\"chip\"><input type=\"checkbox\" data-id=\"${f.id}\" class=\"sb-friend\"/> ${f.name}</label>`).join('')}
      </div>
      <div class="split-mode">
        <label><input type="radio" name="sb-mode" value="equal" checked/> Equal</label>
        <label><input type="radio" name="sb-mode" value="custom"/> Custom</label>
      </div>
      <div id="sb-custom" class="custom-weights" style="display:none;">
        ${friends.map(f => `<div class=\"weight\"><span>${f.name}</span><input type=\"number\" class=\"sb-weight\" data-id=\"${f.id}\" min=\"0\" step=\"0.01\" placeholder=\"Share\"/></div>`).join('')}
      </div>
      <button id="sb-calc">Calculate split</button>
      <div id="sb-result"></div>
      <button id="sb-save" disabled>Save expense</button>
    </div>`;
  const modeRadios = Array.from(document.querySelectorAll('input[name="sb-mode"]')) as HTMLInputElement[];
  const customBox = safeGet('sb-custom') as HTMLElement;
  modeRadios.forEach(r => r.addEventListener('change', () => { customBox.style.display = r.value === 'custom' && r.checked ? 'block' : 'none'; }));
  (safeGet('sb-calc') as any)?.addEventListener('click', () => {
    const amount = parseFloat((safeGet('sb-amount') as HTMLInputElement).value || '0');
    const desc = (safeGet('sb-desc') as HTMLInputElement).value?.trim();
    const selected = Array.from(document.querySelectorAll('.sb-friend'))
      .filter((el:any) => (el as HTMLInputElement).checked)
      .map((el:any) => ({ id: (el as any).dataset.id, name: el.parentElement?.textContent?.trim() || 'Friend' }));
    if (!amount || amount <= 0 || !desc || selected.length === 0) { showNotification('Enter description, amount and select participants', 'warning'); return; }
    const mode = (modeRadios.find(r => r.checked) as HTMLInputElement).value;
    let shares: Record<string, number> = {};
    if (mode === 'equal') {
      const per = amount / (selected.length + 1);
      selected.forEach(s => shares[s.id] = per);
    } else {
      const weights = Array.from(document.querySelectorAll('.sb-weight')) as any[];
      let total = 0; const map: Record<string, number> = {};
      weights.forEach((w:any) => { const v = parseFloat((w as HTMLInputElement).value||'0'); (map as any)[(w as any).dataset.id] = v; total += v; });
      if (total <= 0) { showNotification('Custom shares must sum to > 0', 'error'); return; }
      selected.forEach(s => shares[s.id] = amount * (((map as any)[s.id]||0) / total));
    }
    const result = safeGet('sb-result') as HTMLElement;
    result.innerHTML = `
      <div class="split-summary">
        <div>Total: ${formatCurrency(amount)}</div>
        ${selected.map(s => `<div>${s.name} owes ${formatCurrency(shares[s.id]||0)}</div>`).join('')}
      </div>`;
    (safeGet('sb-save') as HTMLButtonElement).disabled = false;
    (panel as any).dataset.calculated = JSON.stringify({ amount, desc, selected, shares });
  });
  (safeGet('sb-save') as any)?.addEventListener('click', () => {
    const calc = (panel as any).dataset.calculated ? JSON.parse((panel as any).dataset.calculated) : null;
    if (!calc) { showNotification('Calculate split first', 'warning'); return; }
    const expense = { description: calc.desc, amount: calc.amount, splitWith: calc.selected, paidBy: 'You', createdAt: Date.now() };
    AppState.expenses = [expense, ...(AppState.expenses||[])];
    showNotification('Expense saved', 'success');
  });
}
export function renderGroupPanel() {
  const panel =
