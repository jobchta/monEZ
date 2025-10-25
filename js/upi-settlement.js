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
   * @param {string} upiId - Payee UPI ID
   * @param {number} amount - Payment amount
   * @param {string} note - Payment note/description
   * @returns {string} UPI deep link
   */
  generateUPILink(upiId, amount, note) {
    const params = new URLSearchParams({
      pa: upiId,
      pn: 'monEZ Settlement',
      am: amount.toFixed(2),
      cu: 'INR',
      tn: note || 'Bill settlement via monEZ'
    });
    return `upi://pay?${params.toString()}`;
  }

  /**
   * Generate QR code data URL for UPI payment
   * @param {string} upiLink - UPI deep link
   * @returns {Promise<string>} Data URL of QR code image
   */
  async generateQRCode(upiLink) {
    // Using a simple QR code library (assumes QRCode.js is loaded)
    return new Promise((resolve, reject) => {
      if (typeof QRCode === 'undefined') {
        // Fallback: use online QR API
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;
        resolve(qrApiUrl);
      } else {
        try {
          const canvas = document.createElement('canvas');
          QRCode.toCanvas(canvas, upiLink, { width: 300 }, (error) => {
            if (error) reject(error);
            else resolve(canvas.toDataURL());
          });
        } catch (error) {
          reject(error);
        }
      }
    });
  }

  /**
   * Open UPI payment in native app
   * @param {string} upiLink - UPI deep link
   */
  openUPIApp(upiLink) {
    if (this.isMobile()) {
      window.location.href = upiLink;
    } else {
      // Desktop: show QR code modal
      this.showQRModal(upiLink);
    }
  }

  /**
   * Check if device is mobile
   * @returns {boolean}
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Show QR code modal for desktop users
   * @param {string} upiLink - UPI deep link
   */
  async showQRModal(upiLink) {
    const qrUrl = await this.generateQRCode(upiLink);
    
    const modal = document.createElement('div');
    modal.className = 'upi-qr-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Scan to Pay via UPI</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <img src="${qrUrl}" alt="UPI QR Code" class="qr-code" />
          <p>Scan this QR code with any UPI app</p>
          <div class="upi-apps">
            ${this.upiApps.map(app => `<span class="app-badge">${app.name}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
}

// Settlement UI Handler
class SettlementUI {
  constructor(upiHandler) {
    this.upiHandler = upiHandler;
    this.settlements = this.loadSettlements();
  }

  /**
   * Add 'Settle via UPI' button to balance displays
   * @param {HTMLElement} balanceElement - Element displaying balance
   * @param {Object} settlementData - { creditor, debtor, amount, balanceId }
   */
  addSettleButton(balanceElement, settlementData) {
    const button = document.createElement('button');
    button.className = 'settle-upi-btn';
    button.innerHTML = '💳 Settle via UPI';
    button.onclick = () => this.initiateSettlement(settlementData);
    
    balanceElement.appendChild(button);
  }

  /**
   * Initiate UPI settlement process
   * @param {Object} data - Settlement data
   */
  async initiateSettlement(data) {
    // Prompt for UPI ID if not already stored
    const upiId = await this.getCreditorUPIId(data.creditor);
    
    if (!upiId) {
      alert('UPI ID not found. Please ask the creditor to set up their UPI ID.');
      return;
    }
    
    const note = `Settlement for ${data.debtor} to ${data.creditor}`;
    const upiLink = this.upiHandler.generateUPILink(upiId, data.amount, note);
    
    // Create settlement record
    const settlementId = this.createSettlementRecord(data);
    
    // Open UPI app or show QR
    this.upiHandler.openUPIApp(upiLink);
    
    // Show confirmation UI
    this.showSettlementConfirmation(settlementId, data);
  }

  /**
   * Get or prompt for creditor's UPI ID
   * @param {string} creditorId - Creditor user ID
   * @returns {Promise<string>} UPI ID
   */
  async getCreditorUPIId(creditorId) {
    // Check if stored in user profile
    const storedUPI = localStorage.getItem(`upi_${creditorId}`);
    if (storedUPI) return storedUPI;
    
    // Prompt user to enter (in real app, this would be fetched from database)
    const upiId = prompt('Enter creditor\'s UPI ID (e.g., user@upi):');
    if (upiId && this.validateUPIId(upiId)) {
      localStorage.setItem(`upi_${creditorId}`, upiId);
      return upiId;
    }
    return null;
  }

  /**
   * Validate UPI ID format
   * @param {string} upiId - UPI ID to validate
   * @returns {boolean}
   */
  validateUPIId(upiId) {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    return upiRegex.test(upiId);
  }

  /**
   * Create settlement record (honor system)
   * @param {Object} data - Settlement data
   * @returns {string} Settlement ID
   */
  createSettlementRecord(data) {
    const settlement = {
      id: Date.now().toString(),
      ...data,
      status: 'pending',
      timestamp: new Date().toISOString(),
      method: 'UPI'
    };
    
    this.settlements.push(settlement);
    this.saveSettlements();
    
    return settlement.id;
  }

  /**
   * Show settlement confirmation dialog
   * @param {string} settlementId - Settlement ID
   * @param {Object} data - Settlement data
   */
  showSettlementConfirmation(settlementId, data) {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'settlement-confirm-modal';
    confirmModal.innerHTML = `
      <div class="modal-content">
        <h3>Payment Initiated</h3>
        <p>Amount: ₹${data.amount.toFixed(2)}</p>
        <p>To: ${data.creditor}</p>
        <p>Have you completed the UPI payment?</p>
        <div class="button-group">
          <button class="btn-confirm" data-action="confirm">Yes, I've Paid</button>
          <button class="btn-cancel" data-action="cancel">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    confirmModal.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm') {
        this.confirmSettlement(settlementId);
        this.showSuccessMessage(data);
      } else if (action === 'cancel') {
        this.cancelSettlement(settlementId);
      }
      confirmModal.remove();
    });
  }

  /**
   * Confirm settlement (honor system)
   * @param {string} settlementId - Settlement ID
   */
  confirmSettlement(settlementId) {
    const settlement = this.settlements.find(s => s.id === settlementId);
    if (settlement) {
      settlement.status = 'completed';
      settlement.completedAt = new Date().toISOString();
      this.saveSettlements();
      
      // Trigger balance update in main app
      this.notifyBalanceUpdate(settlement);
    }
  }

  /**
   * Cancel settlement
   * @param {string} settlementId - Settlement ID
   */
  cancelSettlement(settlementId) {
    const settlement = this.settlements.find(s => s.id === settlementId);
    if (settlement) {
      settlement.status = 'cancelled';
      this.saveSettlements();
    }
  }

  /**
   * Show success message with visual feedback
   * @param {Object} data - Settlement data
   */
  showSuccessMessage(data) {
    const toast = document.createElement('div');
    toast.className = 'settlement-toast success';
    toast.innerHTML = `
      <span class="icon">✓</span>
      <span>Settlement of ₹${data.amount.toFixed(2)} recorded!</span>
    `;
    
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
