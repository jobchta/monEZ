// monEZ - Main Application Logic

// Enhanced App Initialization with Firebase
function initApp() {
    // Check authentication state
    if (window.firebase) {
        window.firebase.onAuthStateChanged((user) => {
            if (user) {
                // User signed in
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-app').style.display = 'flex';
                loadUserData(user);
            } else {
                // User signed out
                document.getElementById('login-screen').style.display = 'flex';
                document.getElementById('main-app').style.display = 'none';
            }
        });
    }
    
    setupExpenseForm();
    setupPWAListeners();
}

// Add Google Sign-in function
window.signInWithGoogle = async function() {
    try {
        const result = await window.firebase.signInWithPopup(window.firebase.auth, window.firebase.provider);
        showNotification(`Welcome ${result.user.displayName}!`, 'success');
    } catch (error) {
        showNotification('Sign in failed: ' + error.message, 'error');
    }
};

// Add real data loading
function loadUserData(user) {
    const q = window.firebase.query(
        window.firebase.collection(window.firebase.db, 'expenses'),
        window.firebase.where('userId', '==', user.uid),
        window.firebase.orderBy('timestamp', 'desc')
    );

    window.firebase.onSnapshot(q, (snapshot) => {
        AppState.expenses = [];
        snapshot.forEach((doc) => {
            AppState.expenses.push({ id: doc.id, ...doc.data() });
        });
        renderRecentExpenses();
        renderAllExpenses();
        updateBalance();
    });
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
