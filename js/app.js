// monEZ - Main Application Logic

// Enhanced App Initialization
function initApp() {
  AppState.expenses = [...premiumExpenses];
  
  setupExpenseForm();
  renderRecentExpenses();
  renderGroupsPreview();
  updateBalance();
  
  setTimeout(() => {
    showPWAPrompt();
  }, 3000);
  
  setupPWAListeners();
  
  setTimeout(() => {
    showNotification('Welcome to monEZ! 💎 Split expenses, not friendships', 'success', 4000);
  }, 1000);
}

function setupPWAListeners() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    AppState.deferredPrompt = e;
    showPWAPrompt();
  });
  
  window.addEventListener('appinstalled', () => {
    showNotification('🎉 monEZ installed! Enjoy the native app experience.', 'success');
    AppState.deferredPrompt = null;
    dismissPWAPrompt();
  });
}

// Loading Screen Management
function hideLoadingScreen() {
  const loadingScreen = $('loading-screen');
  const mainApp = $('main-app');
  
  if (loadingScreen && mainApp) {
    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        mainApp.style.display = 'flex';
        mainApp.style.flexDirection = 'column';
        mainApp.style.minHeight = '100vh';
      }, 300);
    }, 2000);
  }
}

// Enhanced Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  hideLoadingScreen();
  
  setTimeout(() => {
    initApp();
  }, 2300);
});

// Add ripple effect to buttons
document.addEventListener('click', (e) => {
  if (e.target.matches('button, .btn, .action-card, .nav-item')) {
    createRippleEffect(e.target, e);
  }
});
