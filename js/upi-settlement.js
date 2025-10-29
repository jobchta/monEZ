import {
    db,
    auth,
    doc,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    collection,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from './firebase.js';
import { showNotification } from './utils.js';

// ... (UPISettlement class remains largely the same, but we can remove the constructor content if not needed)
class UPISettlement {
    // ... (generateUPILink, generateQRCode, openUPIApp, isMobile, showQRModal methods are unchanged)
}

// Settlement UI Handler - Now with Firestore integration
class SettlementUI {
  constructor(upiHandler) {
    this.upiHandler = upiHandler;
    this.settlements = [];
    this.unsubscribe = null;
    this.userId = null;

    auth.onAuthStateChanged(user => {
      if (user) {
        this.userId = user.uid;
        this.loadSettlements();
      } else {
        this.userId = null;
        if (this.unsubscribe) {
          this.unsubscribe();
        }
        this.settlements = [];
      }
    });
  }

  addSettleButton(balanceElement, settlementData) {
    const button = document.createElement('button');
    button.className = 'settle-upi-btn';
    button.innerHTML = '💳 Settle via UPI';
    button.onclick = () => this.initiateSettlement(settlementData);
    balanceElement.appendChild(button);
  }

  async initiateSettlement(data) {
    const upiId = await this.getCreditorUPIId(data.creditor);
    
    if (!upiId) {
      showNotification('UPI ID for ' + data.creditor + ' not found. Please ask them to add it.', 'error');
      return;
    }
    
    const note = `Settlement for ${data.debtor} to ${data.creditor}`;
    const upiLink = this.upiHandler.generateUPILink(upiId, data.amount, note);
    
    const settlementId = await this.createSettlementRecord(data);
    
    if (settlementId) {
      this.upiHandler.openUPIApp(upiLink);
      this.showSettlementConfirmation(settlementId, data);
    }
  }

  async getCreditorUPIId(creditorName) {
    if (!this.userId) {
        showNotification('You must be logged in to do that.', 'error');
        return null;
    }
    // In this app design, friends are not users, so their UPI is stored
    // securely under the current user's own document.
    try {
        const friendUPIRef = doc(db, 'users', this.userId, 'friendPaymentMethods', creditorName);
        const upiDoc = await getDoc(friendUPIRef);

        if (upiDoc.exists() && upiDoc.data().upiId) {
            return upiDoc.data().upiId;
        }

        // If not found, prompt to add it for future use.
        const upiId = prompt(`Enter UPI ID for ${creditorName} (e.g., user@upi):`);
        if (upiId && this.validateUPIId(upiId)) {
            await setDoc(friendUPIRef, { upiId: upiId });
            return upiId;
        }
        return null;

    } catch(error) {
        console.error("Error fetching/setting friend's UPI ID:", error);
        showNotification('Could not retrieve UPI details.', 'error');
        return null;
    }
  }

  validateUPIId(upiId) {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    return upiRegex.test(upiId);
  }

  async createSettlementRecord(data) {
    if (!this.userId) return null;

    const settlementData = {
      ...data,
      ownerId: this.userId,
      status: 'pending',
      timestamp: serverTimestamp(),
      method: 'UPI'
    };
    
    try {
        const docRef = await addDoc(collection(db, 'settlements'), settlementData);
        return docRef.id;
    } catch (error) {
        console.error("Error creating settlement record:", error);
        showNotification('Could not save settlement record.', 'error');
        return null;
    }
  }

  showSettlementConfirmation(settlementId, data) {
    // This UI logic remains mostly the same
    const confirmModal = document.createElement('div');
    // ... (modal creation as before)
    // Event listener should call async confirm/cancel methods
    confirmModal.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm') {
        await this.confirmSettlement(settlementId);
        this.showSuccessMessage(data);
      } else if (action === 'cancel') {
        await this.cancelSettlement(settlementId);
      }
      if (action) confirmModal.remove();
    });
  }

  async confirmSettlement(settlementId) {
    const settlementRef = doc(db, 'settlements', settlementId);
    await updateDoc(settlementRef, {
        status: 'completed',
        completedAt: serverTimestamp()
    });
    this.notifyBalanceUpdate({ id: settlementId, status: 'completed' });
  }

  async cancelSettlement(settlementId) {
    const settlementRef = doc(db, 'settlements', settlementId);
    await updateDoc(settlementRef, { status: 'cancelled' });
  }

  showSuccessMessage(data) {
    // Unchanged
  }

  notifyBalanceUpdate(settlement) {
    const event = new CustomEvent('upi-settlement-completed', { detail: settlement });
    window.dispatchEvent(event);
  }

  loadSettlements() {
    if (!this.userId) return;

    // Unsubscribe from previous listener if it exists
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const q = query(collection(db, 'settlements'), where('ownerId', '==', this.userId));

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.settlements = [];
      snapshot.forEach((doc) => {
        this.settlements.push({ id: doc.id, ...doc.data() });
      });
      console.log('Settlements loaded from Firestore:', this.settlements.length);
    }, (error) => {
      console.error("Error listening to settlements:", error);
      showNotification('Could not load settlement history.', 'error');
    });
  }

  getSettlementHistory() {
    return this.settlements.filter(s => s.status === 'completed');
  }
}
const upiHandler = new UPISettlement();
const settlementUI = new SettlementUI(upiHandler);

// Make available globally
window.UPISettlement = {
  handler: upiHandler,
  ui: settlementUI,
  addSettleButton: (element, data) => settlementUI.addSettleButton(element, data),
  getHistory: () => settlementUI.getSettlementHistory()
};
