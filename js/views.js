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

// --- Centralized Error Messaging ---
const ErrorMessages = {
  VALIDATION: {
    EMPTY_FIELDS: '⚠️ Please fill all required fields',
    NO_PEOPLE: '⚠️ Please select at least one person',
    INVALID_AMOUNT: '⚠️ Please enter a valid amount',
    INVALID_EMAIL: '⚠️ Please enter a valid email address',
    INVALID_NAME: '⚠️ Please enter a valid name',
    DUPLICATE_ENTRY: '⚠️ This entry already exists'
  },
  SAVE: {
    SUCCESS: '✅ Saved successfully!',
    FAILURE: '❌ Failed to save. Please try again.',
    SYNC_WARNING: '⚠️ Could not sync to cloud'
  }
};

function showError(message, type = 'warning') {
  showNotification(message, type);
}

function showSuccess(message) {
  showNotification(message, 'success');
}

// --- Form Validation Utilities ---
function validateRequired(fields) {
  return fields.every(field => field && field.toString().trim() !== '');
}

function validateAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateName(name) {
  return name && name.trim().length >= 2;
}

// --- Navigation Transition Function (Atomic) ---
/**
 * Switches between different views using atomic fade transitions.
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

  return new Promise((resolve) => {
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
        } else if (viewName === 'balances') {
          renderBalances();
        }
        resolve();
      } else {
        resolve();
      }
    }, 350);
  });
}

// --- Expense Form Handler ---
export function handleExpenseSubmit(event) {
  event.preventDefault();

  const description = safeGet('expense-description')?.value;
  const amount = parseFloat(safeGet('expense-amount')?.value);
  const category = safeGet('expense-category')?.value;
  const date = safeGet('expense-date')?.value;
  const selectedCheckboxes = document.querySelectorAll('#people-selector input[type="checkbox"]:checked');
  const selectedPeople = Array.from(selectedCheckboxes).map(cb => cb.value);

  // Validation
  if (!validateRequired([description, amount, category])) {
    showError(ErrorMessages.VALIDATION.EMPTY_FIELDS);
    return;
  }

  if (!validateAmount(amount)) {
    showError(ErrorMessages.VALIDATION.INVALID_AMOUNT);
    return;
  }

  if (selectedPeople.length === 0) {
    showError(ErrorMessages.VALIDATION.NO_PEOPLE);
    return;
  }

  // Create expense atomically
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

  // Save to Firebase if connected
  if (auth.currentUser) {
    saveExpenseToFirebase(newExpense);
  }

  showSuccess(ErrorMessages.SAVE.SUCCESS);
  event.target.reset();
  
  // Atomic navigation
  switchView('home');
}

// --- Friend Form Handler ---
export function handleFriendSubmit(event) {
  event.preventDefault();

  const name = safeGet('friend-name')?.value;
  const email = safeGet('friend-email')?.value;

  // Validation
  if (!validateRequired([name, email])) {
    showError(ErrorMessages.VALIDATION.EMPTY_FIELDS);
    return;
  }

  if (!validateName(name)) {
    showError(ErrorMessages.VALIDATION.INVALID_NAME);
    return;
  }

  if (!validateEmail(email)) {
    showError(ErrorMessages.VALIDATION.INVALID_EMAIL);
    return;
  }

  // Check for duplicate
  if (AppState.friends && AppState.friends.some(f => f.email === email)) {
    showError(ErrorMessages.VALIDATION.DUPLICATE_ENTRY);
    return;
  }

  // Create friend atomically
  const newFriend = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim(),
    addedAt: new Date().toISOString()
  };

  if (!AppState.friends) AppState.friends = [];
  AppState.friends.push(newFriend);
  updateState({ friends: AppState.friends });

  // Save to Firebase if connected
  if (auth.currentUser) {
    saveFriendToFirebase(newFriend);
  }

  showSuccess(ErrorMessages.SAVE.SUCCESS);
  event.target.reset();
  
  // Atomic navigation
  switchView('home');
}

// --- Group Form Handler ---
export function handleGroupSubmit(event) {
  event.preventDefault();

  const name = safeGet('group-name')?.value;
  const description = safeGet('group-description')?.value;
  const selectedCheckboxes = document.querySelectorAll('#group-members input[type="checkbox"]:checked');
  const members = Array.from(selectedCheckboxes).map(cb => cb.value);

  // Validation
  if (!validateRequired([name])) {
    showError(ErrorMessages.VALIDATION.EMPTY_FIELDS);
    return;
  }

  if (!validateName(name)) {
    showError(ErrorMessages.VALIDATION.INVALID_NAME);
    return;
  }

  if (members.length === 0) {
    showError(ErrorMessages.VALIDATION.NO_PEOPLE);
    return;
  }

  // Check for duplicate
  if (AppState.groups && AppState.groups.some(g => g.name === name)) {
    showError(ErrorMessages.VALIDATION.DUPLICATE_ENTRY);
    return;
  }

  // Create group atomically
  const newGroup = {
    id: Date.now(),
    name: name.trim(),
    description: description?.trim() || '',
    members,
    createdAt: new Date().toISOString()
  };

  if (!AppState.groups) AppState.groups = [];
  AppState.groups.push(newGroup);
  updateState({ groups: AppState.groups });

  // Save to Firebase if connected
  if (auth.currentUser) {
    saveGroupToFirebase(newGroup);
  }

  showSuccess(ErrorMessages.SAVE.SUCCESS);
  event.target.reset();
  
  // Atomic navigation
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
    showError(ErrorMessages.SAVE.SYNC_WARNING);
  }
}

async function saveFriendToFirebase(friend) {
  try {
    await addDoc(collection(db, 'friends'), {
      ...friend,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    console.log('Friend saved to Firebase');
  } catch (error) {
    console.error('Error saving friend:', error);
    showError(ErrorMessages.SAVE.SYNC_WARNING);
  }
}

async function saveGroupToFirebase(group) {
  try {
    await addDoc(collection(db, 'groups'), {
      ...group,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    console.log('Group saved to Firebase');
  } catch (error) {
    console.error('Error saving group:', error);
    showError(ErrorMessages.SAVE.SYNC_WARNING);
  }
}

// --- Setup Form Handlers ---
export function setupExpenseForm() {
  const form = safeGet('expense-form');
  if (form) {
    form.removeEventListener('submit', handleExpenseSubmit);
    form.addEventListener('submit', handleExpenseSubmit);
  }
}

export function setupFriendForm() {
  const form = safeGet('friend-form');
  if (form) {
    form.removeEventListener('submit', handleFriendSubmit);
    form.addEventListener('submit', handleFriendSubmit);
  }
}

export function setupGroupForm() {
  const form = safeGet('group-form');
  if (form) {
    form.removeEventListener('submit', handleGroupSubmit);
    form.addEventListener('submit', handleGroupSubmit);
  }
}

export function setupAllForms() {
  setupExpenseForm();
  setupFriendForm();
  setupGroupForm();
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
