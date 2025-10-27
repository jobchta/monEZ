/**
 * UPI Settlement Integration for monEZ
 * Enables users to settle balances using UPI payments (India)
 * Includes deep link generation, QR code support, and UI tracking
 */

// UPI Payment Handler
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

  /**
   * Generate UPI deep link for payment
   * Fixed: Use manual encoding instead of URLSearchParams for proper UPI compliance
   * @param {string} upiId - Payee UPI ID
   * @param {number} amount - Payment amount
   * @param {string} note - Payment note/description
   * @returns {string} UPI deep link
   */
  generateUPILink(upiId, amount, note) {
    // Manual parameter encoding for UPI compliance
    // URLSearchParams encodes spaces as '+' which causes issues with some UPI apps
    // encodeURIComponent encodes spaces as '%20' which is UPI-compliant
    const params = {
      pa: encodeURIComponent(upiId),
      pn: encodeURIComponent('monEZ Settlement'),
      am: encodeURIComponent(amount.toFixed(2)),
      cu: encodeURIComponent('INR'),
      tn: encodeURIComponent(note || 'Bill settlement via monEZ')
    };
    
    // Construct query string manually
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `upi://pay?${queryString}`;
  }

  /**
   * Generate QR code for UPI payment
   * @param {string} upiId - Payee UPI ID
   * @param {number} amount - Payment amount
   * @param {string} note - Payment note
   * @returns {Promise<string>} QR code data URL
   */
  async generateQRCode(upiId, amount, note) {
    const upiLink = this.generateUPILink(upiId, amount, note);
    
    // Using QRCode library (needs to be imported)
    if (typeof QRCode !== 'undefined') {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, upiLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return canvas.toDataURL();
    }
    
    // Fallback: use Google Charts API
    const size = 256;
    return `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(upiLink)}&chs=${size}x${size}&chld=L|0`;
  }

  /**
   * Initiate UPI payment
   * @param {string} upiId - Payee UPI ID
   * @param {number} amount - Payment amount  
   * @param {string} note - Payment note
   * @returns {Promise<Object>} Settlement record
   */
  async initiatePayment(upiId, amount, note) {
    const upiLink = this.generateUPILink(upiId, amount, note);
    
    const settlement = {
      id: Date.now().toString(),
      upiId,
      amount,
      note,
      timestamp: new Date().toISOString(),
      status: 'initiated',
      upiLink
    };
    
    // Save to settlements array
    if (!this.settlements) {
      this.settlements = this.loadSettlements();
    }
    this.settlements.push(settlement);
    this.saveSettlements();
    
    // Open UPI app
    try {
      window.location.href = upiLink;
      
      // Mark as pending after short delay
      setTimeout(() => {
        settlement.status = 'pending';
        this.saveSettlements();
      }, 1000);
      
      return settlement;
    } catch (error) {
      console.error('Error initiating UPI payment:', error);
      settlement.status = 'failed';
      settlement.error = error.message;
      this.saveSettlements();
      throw error;
    }
  }

  /**
   * Mark settlement as completed
   * @param {string} settlementId - Settlement ID
   */
  markComplete(settlementId) {
    if (!this.settlements) {
      this.settlements = this.loadSettlements();
    }
    
    const settlement = this.settlements.find(s => s.id === settlementId);
    if (settlement) {
      settlement.status = 'completed';
      settlement.completedAt = new Date().toISOString();
      this.saveSettlements();
      this.notifyBalanceUpdate(settlement);
    }
  }
}

// Settlement UI Handler
class SettlementUI {
  constructor(upiHandler) {
    this.upiHandler = upiHandler;
    this.settlements = upiHandler.loadSettlements();
  }

  /**
   * Add settle button to element
   * @param {HTMLElement} element - Element to add button to
   * @param {Object} data - Settlement data {upiId, amount, note, userName}
   */
  addSettleButton(element, data) {
    const button = document.createElement('button');
    button.className = 'settle-btn';
    button.innerHTML = '💸 Settle via UPI';
    button.onclick = () => this.showSettleModal(data);
    element.appendChild(button);
  }

  /**
   * Show settlement modal
   * @param {Object} data - Settlement data
   */
  showSettleModal(data) {
    const modal = document.createElement('div');
    modal.className = 'settle-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>💸 Settle with ${data.userName}</h3>
          <button class="close-btn" onclick="this.closest('.settle-modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="amount-display">
            <span class="currency">₹</span>
            <span class="amount">${data.amount.toFixed(2)}</span>
          </div>
          <div class="upi-id">
            <label>UPI ID</label>
            <input type="text" value="${data.upiId}" readonly />
          </div>
          <div class="note">
            <label>Note</label>
            <input type="text" value="${data.note || 'Settlement'}" id="settlement-note" />
          </div>
          <div class="upi-apps">
            ${this.upiHandler.upiApps.map(app => `
              <button class="upi-app-btn" data-app="${app.name}">
                <span class="app-icon">💳</span>
                ${app.name}
              </button>
            `).join('')}
          </div>
          <button class="pay-btn" id="initiate-payment">Pay Now</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Add event listeners
    modal.querySelector('#initiate-payment').onclick = async () => {
      const note = modal.querySelector('#settlement-note').value;
      try {
        await this.upiHandler.initiatePayment(data.upiId, data.amount, note);
        this.showSuccessToast('Payment initiated!');
        modal.remove();
      } catch (error) {
        this.showErrorToast('Failed to initiate payment');
      }
    };
  }

  /**
   * Show success toast
   * @param {string} message - Message to show
   */
  showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Show error toast
   * @param {string} message - Message to show
   */
  showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Notify main app about balance update
   * @param {Object} settlement - Settlement data
   */
  notifyBalanceUpdate(settlement) {
    const event = new CustomEvent('upi-settlement-completed', {
      detail: settlement
    });
    window.dispatchEvent(event);
  }

  /**
   * Load settlements from storage
   * @returns {Array} Settlements
   */
  loadSettlements() {
    const stored = localStorage.getItem('upi_settlements');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Save settlements to storage
   */
  saveSettlements() {
    localStorage.setItem('upi_settlements', JSON.stringify(this.settlements));
  }

  /**
   * Get settlement history
   * @returns {Array} Settlements
   */
  getSettlementHistory() {
    return this.settlements.filter(s => s.status === 'completed');
  }
}

// Initialize and export
const upiHandler = new UPISettlement();
const settlementUI = new SettlementUI(upiHandler);

// Make available globally
window.UPISettlement = {
  handler: upiHandler,
  ui: settlementUI,
  
  // Convenience method to add settle button
  addSettleButton: (element, data) => settlementUI.addSettleButton(element, data),
  
  // Get settlement history
  getHistory: () => settlementUI.getSettlementHistory()
};
