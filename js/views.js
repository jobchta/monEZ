import {
  safeGet,
  showNotification,
  createRippleEffect
} from './utils.js';

// Import state from state.js and stateManager from globals.js
import { AppState, updateState } from './state.js';
import { stateManager } from './globals.js';
import {
  formatCurrency,
  formatDate
} from './renderUtils.js';
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
    const mainContent = safeGet('main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="container">
          <div class="row">
            <div class="col s12">
              <div class="card dev-mode-card">
                <div class="card-content">
                  <span class="card-title">Developer Mode</span>
                  <p>This is a placeholder for the developer mode view.</p>
                  <p>Features coming soon...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    return;
  }

  const views = [
    safeGet('add-expense-view'),
    safeGet('recent-expenses-view'),
    safeGet('all-expenses-view'),
    safeGet('balances-view'),
    safeGet('settings-view')
  ];

  const targetView = safeGet(`${viewName}-view`);
  if (!targetView) {
    console.error(`View not found: ${viewName}-view`);
    return;
  }

  // Fade out all views
  views.forEach(view => {
    if (view) {
      view.style.display = 'none';
      view.classList.remove('fade-in');
      view.classList.add('fade-out');
    }
  });

  // After a short delay, fade in the target view
  setTimeout(() => {
    targetView.style.display = 'block';
    targetView.classList.remove('fade-out');
    targetView.classList.add('fade-in');

    // Call view-specific setup functions
    if (viewName === 'add-expense') {
      populatePeopleSelector();
      resetAddExpenseForm();
    } else if (viewName === 'recent-expenses') {
      renderRecentExpenses();
    } else if (viewName === 'all-expenses') {
      renderAllExpenses();
    } else if (viewName === 'balances') {
      renderBalances();
    } else if (viewName === 'settings') {
      // Settings-specific code handled in settings.js
    }
  }, 150);
}

// --- Add Expense Form Functions ---
export function resetAddExpenseForm() {
  const form = safeGet('add-expense-form');
  if (form) form.reset();

  const selectElement = safeGet('expense-split-type');
  if (selectElement && M.FormSelect) {
    M.FormSelect.getInstance(selectElement)?.destroy();
    M.FormSelect.init(selectElement);
  }

  const customSplitSection = safeGet('custom-split-section');
  if (customSplitSection) customSplitSection.style.display = 'none';

  const paidByInput = safeGet('paid-by');
  if (paidByInput) paidByInput.value = '';

  // Reset any validation messages
  const validationMessages = document.querySelectorAll('.helper-text[data-error]');
  validationMessages.forEach(msg => {
    msg.style.display = 'none';
  });
}

export function populatePeopleSelectorManual(selectElement, people) {
  if (!selectElement) {
    console.error("Select element not found.");
    return;
  }

  selectElement.innerHTML = '<option value="" disabled selected>Choose person</option>';
  people.forEach(person => {
    const option = document.createElement('option');
    option.value = person.name;
    option.textContent = person.name;
    selectElement.appendChild(option);
  });

  if (M.FormSelect) {
    M.FormSelect.getInstance(selectElement)?.destroy();
    M.FormSelect.init(selectElement);
  }
}

export function updateCustomSplitSection() {
  const splitTypeSelect = safeGet('expense-split-type');
  const customSplitSection = safeGet('custom-split-section');
  const customSplitInputsDiv = safeGet('custom-split-inputs');

  if (!splitTypeSelect || !customSplitSection || !customSplitInputsDiv) return;

  if (splitTypeSelect.value === 'custom') {
    customSplitSection.style.display = 'block';
    customSplitInputsDiv.innerHTML = '';

    const people = AppState.people || [];
    people.forEach(person => {
      const inputDiv = document.createElement('div');
      inputDiv.className = 'input-field';
      inputDiv.innerHTML = `
        <input type="number" step="0.01" id="split-${person.name}" value="0">
        <label for="split-${person.name}">${person.name}</label>
      `;
      customSplitInputsDiv.appendChild(inputDiv);
    });
  } else {
    customSplitSection.style.display = 'none';
  }
}

export async function handleAddExpenseSubmit(e) {
  e.preventDefault();

  try {
    const paidByInput = safeGet('paid-by');
    const amountInput = safeGet('expense-amount');
    const descriptionInput = safeGet('expense-description');
    const dateInput = safeGet('expense-date');
    const splitTypeSelect = safeGet('expense-split-type');

    if (!paidByInput || !amountInput || !descriptionInput || !dateInput || !splitTypeSelect) {
      showNotification('Required form elements not found', 'error');
      return;
    }

    const paidBy = paidByInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    const date = dateInput.value;
    const splitType = splitTypeSelect.value;

    // Validation
    if (!paidBy || !amount || !description || !date) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    if (amount <= 0) {
      showNotification('Amount must be greater than 0', 'error');
      return;
    }

    // Check if paid by person exists
    const people = AppState.people || [];
    const paidByPerson = people.find(p => p.name === paidBy);
    if (!paidByPerson) {
      showNotification('Invalid person selected', 'error');
      return;
    }

    // Create expense object
    const expense = {
      paidBy,
      amount,
      description,
      date,
      splitType,
      timestamp: serverTimestamp(),
      userId: auth.currentUser?.uid
    };

    // Handle custom split
    if (splitType === 'custom') {
      const customSplits = {};
      let totalCustomAmount = 0;

      people.forEach(person => {
        const splitInput = document.getElementById(`split-${person.name}`);
        if (splitInput) {
          const splitAmount = parseFloat(splitInput.value) || 0;
          customSplits[person.name] = splitAmount;
          totalCustomAmount += splitAmount;
        }
      });

      // Validate custom split total
      if (Math.abs(totalCustomAmount - amount) > 0.01) {
        showNotification(
          `Custom split total (${totalCustomAmount.toFixed(2)}) must equal expense amount (${amount.toFixed(2)})`,
          'error'
        );
        return;
      }

      expense.customSplits = customSplits;
    }

    // Add to Firestore
    await addDoc(collection(db, 'expenses'), expense);

    showNotification('Expense added successfully!', 'success');
    resetAddExpenseForm();

    // Update UI
    renderRecentExpenses();
    renderBalances();
  } catch (error) {
    console.error('Error adding expense:', error);
    showNotification('Failed to add expense. Please try again.', 'error');
  }
}

// --- Settings View Functions ---
export function renderPeopleList() {
  const peopleList = safeGet('people-list');
  if (!peopleList) return;

  peopleList.innerHTML = '';
  const people = AppState.people || [];

  if (people.length === 0) {
    peopleList.innerHTML = '<li class="collection-item">No people added yet</li>';
    return;
  }

  people.forEach((person, index) => {
    const li = document.createElement('li');
    li.className = 'collection-item';
    li.innerHTML = `
      <div>
        ${person.name}
        <a href="#!" class="secondary-content" data-person-index="${index}">
          <i class="material-icons red-text">delete</i>
        </a>
      </div>
    `;
    peopleList.appendChild(li);
  });
}

export async function handleAddPerson(e) {
  e.preventDefault();

  try {
    const personInput = safeGet('new-person-name');
    if (!personInput) return;

    const personName = personInput.value.trim();
    if (!personName) {
      showNotification('Please enter a name', 'error');
      return;
    }

    const people = AppState.people || [];
    if (people.some(p => p.name === personName)) {
      showNotification('Person already exists', 'error');
      return;
    }

    const newPerson = {
      name: personName,
      timestamp: serverTimestamp(),
      userId: auth.currentUser?.uid
    };

    await addDoc(collection(db, 'people'), newPerson);
    personInput.value = '';

    showNotification('Person added successfully!', 'success');
    populatePeopleSelector();
  } catch (error) {
    console.error('Error adding person:', error);
    showNotification('Failed to add person. Please try again.', 'error');
  }
}

// --- Initialize Event Listeners ---
export function initializeViewEventListeners() {
  // Navigation buttons
  const navButtons = {
    'nav-add-expense': 'add-expense',
    'nav-recent-expenses': 'recent-expenses',
    'nav-all-expenses': 'all-expenses',
    'nav-balances': 'balances',
    'nav-settings': 'settings'
  };

  Object.entries(navButtons).forEach(([buttonId, viewName]) => {
    const button = safeGet(buttonId);
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        createRippleEffect(e);
        switchView(viewName);
      });
    }
  });

  // Add expense form
  const addExpenseForm = safeGet('add-expense-form');
  if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', handleAddExpenseSubmit);
  }

  // Split type change
  const splitTypeSelect = safeGet('expense-split-type');
  if (splitTypeSelect) {
    splitTypeSelect.addEventListener('change', updateCustomSplitSection);
  }

  // Add person form
  const addPersonForm = safeGet('add-person-form');
  if (addPersonForm) {
    addPersonForm.addEventListener('submit', handleAddPerson);
  }

  // People list delete buttons (event delegation)
  const peopleList = safeGet('people-list');
  if (peopleList) {
    peopleList.addEventListener('click', async (e) => {
      const deleteButton = e.target.closest('a[data-person-index]');
      if (deleteButton) {
        e.preventDefault();
        const index = parseInt(deleteButton.dataset.personIndex);
        // Delete logic would go here
        console.log('Delete person at index:', index);
      }
    });
  }
}

// --- Auth State Observer ---
export function setupAuthObserver() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User signed in:', user.email);
      // User is signed in - handled in render.js
    } else {
      console.log('User signed out');
      // User is signed out - handled in render.js
    }
  });
}
