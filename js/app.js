import { updateState, setupNavTransitions, setupBalanceHandlers, setupModalHandlers, loadUserPreferences, loadFriends, startBalanceListener, setupExpenseForm, ensurePushPermission } from './actions.js';
import { safeGet } from './utils.js';
import { auth, onAuthStateChanged } from './firebase.js';

let balanceUnsubscribe = null;
let authUnsubscribe = null;

function startBalanceListener(userId) {
    if (balanceUnsubscribe) {
        balanceUnsubscribe();
        balanceUnsubscribe = null;
    }
    const q = query(
        collection(db, 'expenses'), 
        where('userId', '==', userId), 
        orderBy('timestamp', 'desc')
    );
    balanceUnsubscribe = onSnapshot(q, (snapshot) => {
        const expenses = [];
        snapshot.forEach((doc) => {
            expenses.push({ id: doc.id, ...doc.data() });
        });
        updateState({ expenses: expenses });
        updateBalance();
        if (AppState.currentView === 'dashboard') {
            renderRecentExpenses();
        }
    }, (error) => {
        console.error('Balance listener error:', error);
        showNotification('Failed to load expenses', 'error');
    });
}

function initApp() {
    console.log('🚀 Initializing monEZ...');
    setupNavTransitions();
    setupBalanceHandlers();
    setupModalHandlers();
    authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        const loadingScreen = safeGet('loading-screen');
        const loginScreen = safeGet('panel-login');
        const mainApp = safeGet('main-app');
        const onboardingScreen = safeGet('onboarding-screen');
        if (user) {
            console.log('✅ User authenticated:', user.email);
            const hasCompletedOnboarding = await checkUserOnboarding(user.uid);
            if (!hasCompletedOnboarding) {
                if (loadingScreen) loadingScreen.classList.add('hidden');
                if (loginScreen) loginScreen.style.display = 'none';
                if (mainApp) mainApp.classList.add('hidden');
                if (onboardingScreen) onboardingScreen.classList.remove('hidden');
                initOnboarding();
                return;
            }
            if (loadingScreen) loadingScreen.classList.add('hidden');
            if (loginScreen) loginScreen.style.display = 'none';
            if (mainApp) mainApp.classList.remove('hidden');
            if (onboardingScreen) onboardingScreen.classList.add('hidden');
            updateState({
                currentUser: { uid: user.uid, email: user.email, name: user.displayName }
            });
            await loadUserPreferences(user.uid);
            await loadFriends(user.uid);
            startBalanceListener(user.uid);
            setupExpenseForm();
            await ensurePushPermission();
            console.log('✅ App initialized successfully');
        } else {
            if (balanceUnsubscribe) {
                balanceUnsubscribe();
                balanceUnsubscribe = null;
            }
            if (window.invalidateFriendsCache) {
                window.invalidateFriendsCache();
            }
            updateState({
                currentUser: null,
                expenses: [],
                friends: [],
                balance: 0
            });
            if (loadingScreen) loadingScreen.classList.add('hidden');
            if (mainApp) mainApp.classList.add('hidden');
            if (loginScreen) loginScreen.style.display = 'flex';
            if (onboardingScreen) onboardingScreen.classList.add('hidden');
        }
    });
}

// Cleanup on app unload
window.addEventListener('beforeunload', () => {
    if (balanceUnsubscribe) balanceUnsubscribe();
    if (authUnsubscribe) authUnsubscribe();
});

initApp();

