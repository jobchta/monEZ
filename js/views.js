import { 
  safeGet, 
  showNotification, 
  createRippleEffect, 
  hideExampleData 
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
  updateBalance,
  updateUIForAuthChange
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
 * Transitions between views with animation and updates the application state
 * @param {string} viewName - The name of the view to transition to
 */
export function transitionTo(viewName) {
    // Update application state with the new view
    updateState({
        currentView: viewName,
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView,
            lastTransition: Date.now()
        }
    });

    const viewId = `${viewName}-view`;
    const targetView = safeGet(viewId);
    const currentView = document.querySelector('.view.active');
    
    if (!targetView) {
        console.warn(`View not found: ${viewId}`);
        return;
    }
    
    // Skip if already on the target view
    if (currentView && currentView.id === viewId) {
        return;
    }
    
    // Emit view change event
    stateManager.emit('view:changing', {
        from: currentView ? currentView.id.replace('-view', '') : null,
        to: viewName
    });
    
    // Hide current view with animation
    if (currentView) {
        currentView.classList.add('exiting');
        currentView.classList.remove('active');
        
        // Wait for exit animation to complete
        const onTransitionEnd = () => {
            currentView.classList.remove('exiting');
            currentView.removeEventListener('transitionend', onTransitionEnd);
            showNewView();
        };
        
        currentView.addEventListener('transitionend', onTransitionEnd);
    } else {
        showNewView();
    }
    
    function showNewView() {
        // Show new view with animation
        targetView.classList.add('entering');
        targetView.classList.add('active');
        
        // Focus on the first focusable element in the new view
        const focusable = targetView.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) {
            focusable.focus();
        }
        
        // Remove entering class after animation completes
        const onEnterTransitionEnd = () => {
            targetView.classList.remove('entering');
            targetView.removeEventListener('transitionend', onEnterTransitionEnd);
            
            // Update window title
            document.title = `${viewName.charAt(0).toUpperCase() + viewName.slice(1)} | monEZ`;
            
            // Emit view changed event
            stateManager.emit('view:changed', {
                view: viewName,
                element: targetView
            });
        };
        
        targetView.addEventListener('transitionend', onEnterTransitionEnd);
    }
    
    // View-specific initialization is handled by the view:changed event listener
} // --- View Navigation ---

/**
 * Shows the home view with recent expenses
 */
export function showHome() {
    // Update application state
    updateState({
        currentView: 'home',
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView
        }
    });
    
    // Trigger transition
    transitionTo('home');
    
    // Load recent expenses
    renderRecentExpenses();
    
    // Emit analytics event
    stateManager.emit('navigation:home');
}

/**
 * Shows the add expense form and resets the form state
 */
export function showAddExpense() {
    // Update application state
    updateState({
        form: {
            ...AppState.form,
            mode: 'add',
            selectedFriends: new Set(),
            selectedCategory: '',
            isSubmitting: false
        },
        ui: {
            ...AppState.ui,
            showForm: true,
            formError: null
        }
    });
    
    // Show the add expense view
    showView('add-expense');
    
    // Populate people selector
    populatePeopleSelector();
    
    // Reset form fields
    resetForm();
    
    // Focus on the first input field
    const firstInput = document.querySelector('#expense-amount');
    if (firstInput) {
        firstInput.focus();
    }
    
    // Emit event for analytics/tracking
    stateManager.emit('form:opened', { formType: 'add-expense' });
}

/**
 * Shows the expenses view with all expenses
 */
export function showExpenses() {
    updateState({
        currentView: 'expenses',
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView
        }
    });
    transitionTo('expenses');
    renderAllExpenses();
    stateManager.emit('navigation:expenses');
}

/**
 * Shows the balances view with all balances
 */
export function showBalances() {
    updateState({
        currentView: 'balances',
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView
        }
    });
    transitionTo('balances');
    renderBalances();
    stateManager.emit('navigation:balances');
}

/**
 * Shows the groups view
 */
export function showGroups() {
    updateState({
        currentView: 'groups',
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView
        }
    });
    transitionTo('groups');
    stateManager.emit('navigation:groups');
}

/**
 * Shows the premium features view
 */
export function showPremiumFeatures() {
    updateState({
        currentView: 'premium',
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView
        }
    });
    transitionTo('premium');
    stateManager.emit('navigation:premium');
}

/**
 * Shows the settings view
 */
export function showSettings() {
    updateState({
        currentView: 'settings',
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView
        }
    });
    transitionTo('settings');
    stateManager.emit('navigation:settings');
}

/**
 * Shows the split bill form
 */
export function showSplitBill() {
    updateState({
        currentView: 'split-bill',
        form: {
            ...AppState.form,
            mode: 'split-bill',
            selectedFriends: new Set()
        }
    });
    
    showView('split-bill');
    populatePeopleSelector();
    stateManager.emit('form:opened', { formType: 'split-bill' });
}

/**
 * Shows the settle up view
 */
export function showSettle() {
    updateState({
        currentView: 'settle',
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView
        }
    });
    
    showView('settle');
    renderBalances();
    stateManager.emit('navigation:settle');
}

/**
 * Shows the notifications view
 */
export function showNotifications() {
    updateState({
        currentView: 'notifications',
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView
        }
    });
    transitionTo('notifications');
    stateManager.emit('navigation:notifications');
}

/**
 * Shows the user profile view
 */
export function showProfile() {
    updateState({
        currentView: 'profile',
        navigation: {
            ...AppState.navigation,
            previousView: AppState.currentView
        }
    });
    transitionTo('profile');
    stateManager.emit('navigation:profile');
}

export function showFilters() {
    showNotification('🔍 Filters: All categories, All friends, Last 30 days', 'info');
}

export function settleAll() {
    showNotification('💳 Settling all balances... Payment links sent!', 'success');
}

export function showCreateGroup() {
    if (AppState.groups.length >= 3) {
        showPremiumModal();
    } else {
        showNotification('➕ Create Group: Coming soon!', 'info');
    }
}

export function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const targetView = safeGet(viewId + '-view');
    if (targetView) {
        setTimeout(() => {
            targetView.classList.add('active');
            AppState.currentView = viewId;
        }, AppState.animations.enabled ? 50 : 0);
    }
}

export function updateNavigation(activeView) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const navMap = {
        'home': 0,
        'expenses': 1,
        'balances': 2,
        'groups': 3,
        'premium': 4
    };

    const navItems = document.querySelectorAll('.nav-item');
    if (navItems[navMap[activeView]]) {
        navItems[navMap[activeView]].classList.add('active');
    }
}

// Enhanced Form Handling with Accessible Error Messages
export function setupExpenseForm() {
    const form = safeGet('expense-form');
    if (!form) return;

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedCategory = btn.dataset.category;
            createRippleEffect(btn, e);
            clearFormError();
        });
    });

    document.querySelectorAll('.split-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.classList.contains('premium')) {
                showPremiumModal();
                return;
            }
            document.querySelectorAll('.split-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            createRippleEffect(btn, e);
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFormError();

        if (!auth.currentUser) {
            showFormError('Please log in first');
            return;
        }

        const amountInput = safeGet('amount');
        const descInput = safeGet('description');
        const amount = amountInput ? parseFloat(amountInput.value) : 0;
        const description = descInput ? descInput.value.trim() : '';
        const selectedFriends = Array.from(AppState.selectedFriends);

        if (!amount || amount <= 0) {
            showFormError('Please enter a valid amount');
            if (amountInput) amountInput.focus();
            return;
        }

        if (!description) {
            showFormError('Please enter a description');
            if (descInput) descInput.focus();
            return;
        }

        if (selectedFriends.length === 0) {
            showFormError('Please select at least one friend');
            return;
        }

        const expense = {
            userId: auth.currentUser.uid,
            timestamp: serverTimestamp(),
            description,
            amount,
            date: 'Today, ' + new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
            paidBy: 'You',
            splitWith: selectedFriends,
            category: AppState.selectedCategory || '💰',
            location: 'Current Location',
            status: 'pending'
        };

        const submitBtn = form.querySelector('.btn-primary');
        const originalContent = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.innerHTML = '💾 Saving...';
            submitBtn.disabled = true;
        }

        try {
            await addDoc(collection(db, 'expenses'), expense);

            // IMPORTANT: Hide onboarding after first expense is added
            hideExampleData();

            if (submitBtn) {
                submitBtn.innerHTML = '✅ Saved!';
                submitBtn.style.background = '#10B981';
            }

            setTimeout(() => {
                resetForm();
                if (submitBtn) {
                    submitBtn.innerHTML = originalContent;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;
                }
                showNotification('Expense added successfully! 🎉', 'success');
                showHome();
            }, 1000);
        } catch (error) {
            console.error('Error adding expense:', error);
            showFormError('Failed to save: ' + error.message);
            if (submitBtn) {
                submitBtn.innerHTML = originalContent;
                submitBtn.disabled = false;
            }
        }
    });
}

export function resetForm() {
    const form = safeGet('expense-form');
    if (form) {
        form.reset();
    }

    clearFormError();
    AppState.selectedFriends.clear();
    AppState.selectedCategory = '';

    document.querySelectorAll('.person-card').forEach(card => {
        card.classList.remove('selected');
    });

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.querySelectorAll('.split-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const equalSplitBtn = document.querySelector('.split-btn[data-type="equal"]');
    if (equalSplitBtn) {
        equalSplitBtn.classList.add('active');
    }
}

// AI and Premium Features
export function aiSuggestAmount() {
    const amounts = [250, 350, 500, 750, 1200, 1500];
    const suggestedAmount = amounts[Math.floor(Math.random() * amounts.length)];
    const amountInput = safeGet('amount');
    if (amountInput) amountInput.value = suggestedAmount;
    showNotification(`🤖 AI suggested: ${formatCurrency(suggestedAmount)} based on your spending patterns`, 'info');
}

export function startVoiceInput() {
    showNotification('🎤 Voice input: "Add 500 rupee dinner split equally with Default 1 and Default 2"', 'info', 4000);
    setTimeout(() => {
        const amountInput = safeGet('amount');
        const descInput = safeGet('description');
        if (amountInput) amountInput.value = '500';
        if (descInput) descInput.value = 'Dinner at restaurant';
        AppState.selectedCategory = '🍽️';
        document.querySelector('.category-btn[data-category="🍽️"]')?.classList.add('active');
        AppState.selectedFriends.add('Default 1');
        AppState.selectedFriends.add('Default 2');
        document.querySelector('.person-card[data-friend-name="Default 1"]')?.classList.add('selected');
        document.querySelector('.person-card[data-friend-name="Default 2"]')?.classList.add('selected');
        showNotification('✅ Voice input processed successfully!', 'success');
    }, 2000);
}

export function tryAIFeature(type) {
    switch (type) {
        case 'receipt':
            showNotification('📸 AI Receipt Scan: Upload a receipt photo and watch AI extract all details automatically!', 'info', 5000);
            break;
        case 'voice':
            showNotification('🎤 Voice Commands: Say "Split 500 rupee dinner with Default 1" in Hindi, English, or 20 other languages!', 'info', 5000);
            break;
        case 'analytics':
            showNotification('📊 AI Analytics: "You spend 23% more on weekends. Consider home cooking to save ₹2,400/month"', 'info', 6000);
            break;
    }
}

export function startPremiumTrial() {
    showNotification('🚀 Premium trial started! All features unlocked for 7 days. Welcome to the premium experience!', 'success', 5000);
}

export function showPaymentMethods() {
    showNotification('💳 Payment Methods: UPI, Cards, and Bank accounts', 'info');
}

export function settleBalance(friendName, amount) {
    showNotification(`💳 Payment of ${formatCurrency(amount)} to ${friendName} initiated!`, 'success');
    setTimeout(() => {
        showNotification(`✅ Payment successful! Balance with ${friendName} cleared.`, 'success');
        renderBalances();
    }, 2000);
}

export function remindUser(friendName) {
    showNotification(`🔔 Reminder sent to ${friendName}`, 'info');
}

// PWA Features
export function showPWAPrompt() {
    if (!AppState.pwaPromptShown) {
        const prompt = safeGet('pwa-prompt');
        if (prompt) {
            prompt.classList.remove('hidden');
            AppState.pwaPromptShown = true;
        }
    }
}

export function dismissPWAPrompt() {
    const prompt = safeGet('pwa-prompt');
    if (prompt) {
        prompt.classList.add('hidden');
    }
}

export function installPWA() {
    if (AppState.deferredPrompt) {
        AppState.deferredPrompt.prompt();
        AppState.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showNotification('📱 monEZ installed successfully! Launch from your home screen.', 'success', 4000);
            }
            AppState.deferredPrompt = null;
        });
    } else {
        showNotification('📱 monEZ can be installed from your browser menu or home screen!', 'info', 4000);
    }
    dismissPWAPrompt();
}

// Premium Modal Functions
export function showPremiumModal() {
    showNotification('✨ Premium features coming soon! Get early access with 60% off - only ₹119/month', 'info', 4000);
}

export function closePremiumModal() {
    const modal = safeGet('premium-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
