import { safeGet, showNotification, createRippleEffect } from './utils.js';

// Import state from state.js and stateManager from state.js
import { AppState, updateState } from './state.js';
import { stateManager } from './state.js';
import { formatCurrency, formatDate } from './renderUtils.js';
import {
  renderRecentExpenses,
  renderAllExpenses,
  renderBalances,
  populatePeopleSelector,
  updateBalance
} from './render.js';
import {
  auth,
  db,
  collection,
  addDoc,
  serverTimestamp,
  onAuthStateChanged
} from './firebase.js';

// --- Navigation Transition Function ---
/**
 * Switches between different views using fade transitions.
 * @param {string} viewName - The name of the view to switch to (e.g., 'add-expense', 'all-expenses').
 */
export function switchView(viewName) {
  if (viewName === "dev-mode") {
    const devBox = safeGet('dev-mode-box');
    if (!devBox) return;

    devBox.style.display = devBox.style.display === 'none' ? 'block' : 'none';
    if (devBox.style.display === 'block') {
      safeGet('json-display').textContent = JSON.stringify(AppState, null, 2);
    }
    return;
  }

  const views = document.querySelectorAll('.view');
  views.forEach(view => {
    view.classList.remove('view-active');
    setTimeout(() => view.classList.add('hidden'), 300);
  });

  setTimeout(() => {
    const targetView = safeGet(`${viewName}-view`);
    if (targetView) {
      targetView.classList.remove('hidden');
      setTimeout(() => targetView.classList.add('view-active'), 50);

      // Trigger corresponding render function
      if (viewName === 'home') {
        renderRecentExpenses();
        updateBalance();
      } else if (viewName === 'all-expenses') {
        renderAllExpenses();
      } else if (viewName === 'friends') {
        renderBalances();
      }
    }
  }, 300);
}

// --- Form Submission for Adding Expenses ---
export function handleExpenseSubmit(event) {
  event.preventDefault();

  const description = safeGet('expense-description')?.value;
  const amount = parseFloat(safeGet('expense-amount')?.value);
  const category = safeGet('expense-category')?.value;
  const date = safeGet('expense-date')?.value;
  const selectedPeople = Array.from(document.querySelectorAll('.person-checkbox:checked')).map(
    cb => cb.value
  );

  if (!description || !amount || !category || selectedPeople.length === 0) {
    showNotification('⚠️ Please fill all fields and select at least one person', 'warning');
    return;
  }

  const newExpense = {
    id: Date.now(),
    description,
    amount,
    category,
    date: date || new Date().toISOString().split('T')[0],
    paidBy: AppState.currentUser || 'You',
    splitAmong: selectedPeople,
    status: 'pending'
  };

  AppState.expenses.push(newExpense);
  updateState({ expenses: AppState.expenses });

  // Optional: Save to Firebase if connected
  if (auth.currentUser) {
    saveExpenseToFirebase(newExpense);
  }

  showNotification('✅ Expense added successfully!', 'success');
  event.target.reset();
  switchView('home');
}

// --- Firebase Integration ---
async function saveExpenseToFirebase(expense) {
  try {
    await addDoc(collection(db, 'expenses'), {
      ...expense,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    console.log('Expense saved to Firebase');
  } catch (error) {
    console.error('Error saving expense:', error);
    showNotification('⚠️ Could not sync to cloud', 'warning');
  }
}

// --- Setup Auth State Observer ---
export function setupAuthObserver() {
  onAuthStateChanged(auth, user => {
    if (user) {
      updateState({ currentUser: user.displayName || user.email });
      console.log('User signed in:', user.email);
    } else {
      updateState({ currentUser: null });
      console.log('User signed out');
    }
  });
}
