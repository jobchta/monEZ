/**
 * UPI Settlement Integration for monEZ (finalized)
 * Adds UPI deep link, QR, and success/error toasts
 */
class UPISettlement {
  constructor() {
    this.upiApps = [
      { name: 'GPay', package: 'com.google.android.apps.nqo' },
      { name: 'PhonePe', package: 'com.phonepe.app' },
      { name: 'Paytm', package: 'net.one97.paytm' },
      { name: 'BHIM', package: 'in.org.npci.upiapp' },
      { name: 'Amazon Pay', package: 'in.amazon.mShop.android.shopping' }
    ];
  }
  generateUPILink(upiId, amount, note) {
    const params = {
      pa: encodeURIComponent(upiId),
      pn: encodeURIComponent('monEZ Settlement'),
      am: encodeURIComponent(Number(amount).toFixed(2)),
      cu: encodeURIComponent('INR'),
      tn: encodeURIComponent(note || 'Bill settlement via monEZ')
    };
    const queryString = Object.entries(params).map(([k,v]) => `${k}=${v}`).join('&');
    return `upi://pay?${queryString}`;
  }
  async generateQRCode(upiId, amount, note) {
    const upiLink = this.generateUPILink(upiId, amount, note);
    if (typeof QRCode !== 'undefined') {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, upiLink, { width: 256, margin: 2, color: { dark: '#000', light: '#fff' } });
      return canvas.toDataURL();
    }
    const size = 256; return `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(upiLink)}&chs=${size}x${size}&chld=L|0`;
  }
  async initiatePayment(upiId, amount, note) {
    const upiLink = this.generateUPILink(upiId, amount, note);
    const settlement = { id: Date.now().toString(), upiId, amount, note, timestamp: new Date().toISOString(), status: 'initiated', upiLink };
    if (!this.settlements) this.settlements = this.loadSettlements();
    this.settlements.push(settlement); this.saveSettlements();
    try {
      window.location.href = upiLink;
      setTimeout(() => { settlement.status = 'pending'; this.saveSettlements(); }, 1000);
      return settlement;
    } catch (e) {
      settlement.status = 'failed'; settlement.error = e.message; this.saveSettlements(); throw e;
    }
  }
  markComplete(settlementId) {
    if (!this.settlements) this.settlements = this.loadSettlements();
    const s = this.settlements.find(x => x.id === settlementId);
    if (s) { s.status = 'completed'; s.completedAt = new Date().toISOString(); this.saveSettlements(); this.notifyBalanceUpdate(s); }
  }
  notifyBalanceUpdate(settlement) { const ev = new CustomEvent('upi-settlement-completed', { detail: settlement }); window.dispatchEvent(ev); }
  loadSettlements() { const stored = localStorage.getItem('upi_settlements'); return stored ? JSON.parse(stored) : []; }
  saveSettlements() { localStorage.setItem('upi_settlements', JSON.stringify(this.settlements)); }
  getSettlementHistory() { return this.settlements.filter(s => s.status === 'completed'); }
}
class SettlementUI {
  constructor(upiHandler) { this.upiHandler = upiHandler; this.settlements = upiHandler.loadSettlements(); }
  addSettleButton(element, data) { const b = document.createElement('button'); b.className='settle-btn'; b.innerHTML='💸 Settle via UPI'; b.onclick=()=>this.showSettleModal(data); element.appendChild(b); }
  showSettleModal(data) {
    const modal = document.createElement('div'); modal.className='settle-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">💸 Settle with ${data.userName}<button class="close-btn" onclick="this.closest('.settle-modal').remove()">×</button></div>
        <div class="modal-body">
          <div class="amount-display"><span class="currency">₹</span><span class="amount">${Number(data.amount).toFixed(2)}</span></div>
          <div class="upi-id">UPI ID <input readonly type="text" value="${data.upiId}"/></div>
          <div class="note">Note <input id="settlement-note" type="text" value="${data.note || 'Settlement'}"/></div>
          <div class="upi-apps">${this.upiHandler.upiApps.map(app=>`<button class="upi-app-btn" data-app="${app.name}"><span class="app-icon">💳</span>${app.name}</button>`).join('')}</div>
          <button class="pay-btn" id="initiate-payment">Pay Now</button>
        </div>
      </div>`;
    document.body.appendChild(modal); modal.style.display='flex';
    modal.querySelector('#initiate-payment').onclick = async () => {
      const note = (modal.querySelector('#settlement-note') as HTMLInputElement).value;
      try { await this.upiHandler.initiatePayment(data.upiId, data.amount, note); this.showSuccessToast('Payment initiated!'); modal.remove(); }
      catch { this.showErrorToast('Failed to initiate payment'); }
    };
  }
  showSuccessToast(message) { this._toast(message, 'success'); }
  showErrorToast(message) { this._toast(message, 'error'); }
  _toast(message, type) {
    const toast = document.createElement('div'); toast.className = `toast toast-${type}`; toast.textContent = message; document.body.appendChild(toast);
    setTimeout(()=>{ toast.classList.add('show'); },100);
    setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=>toast.remove(),300); },3000);
  }
}
const upiHandler = new UPISettlement();
const settlementUI = new SettlementUI(upiHandler);
window.UPISettlement = { handler: upiHandler, ui: settlementUI, addSettleButton: (el, data)=>settlementUI.addSettleButton(el, data), getHistory: ()=>settlementUI.getSettlementHistory() };
