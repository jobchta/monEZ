// monEZ - Utility Functions

// Enhanced App State
const AppState = {
  currentView: 'home',
  expenses: [],
  friends: [
    { name: 'Raj Kumar', avatar: 'R', color: '#10B981' },
    { name: 'Priya Singh', avatar: 'P', color: '#F59E0B' },
    { name: 'Amit Sharma', avatar: 'A', color: '#8B5CF6' },
    { name: 'Sarah Johnson', avatar: 'S', color: '#EF4444' },
    { name: 'Mike Chen', avatar: 'M', color: '#06B6D4' }
  ],
  groups: [
    {
      id: 1,
      name: 'College Friends',
      icon: '🎓',
      members: 4,
      balance: -420,
      color: '#10B981'
    },
    {
      id: 2,
      name: 'Family Trip',
      icon: '✈️',
      members: 5,
      balance: 150,
      color: '#F59E0B'
    }
  ],
  balance: 2450,
  selectedFriends: new Set(),
  selectedCategory: '',
  animations: {
    enabled: true,
    duration: 300
  },
  pwaPromptShown: false,
  deferredPrompt: null
};

// Premium Sample Data
const premiumExpenses = [
  {
    id: 1,
    description: 'Gourmet Dinner at Olive Garden',
    amount: 2850,
    date: 'Today, 8:30 PM',
    paidBy: 'You',
    splitWith: ['Raj Kumar', 'Priya Singh'],
    category: '🍽️',
    location: 'Connaught Place, Delhi',
    status: 'pending'
  },
  {
    id: 2,
    description: 'Premium Uber Ride',
    amount: 680,
    date: 'Today, 6:15 PM', 
    paidBy: 'Raj Kumar',
    splitWith: ['You'],
    category: '🚗',
    location: 'Airport → Hotel',
    status: 'settled'
  },
  {
    id: 3,
    description: 'IMAX Movie Experience',
    amount: 1200,
    date: 'Yesterday, 9:30 PM',
    paidBy: 'Priya Singh',
    splitWith: ['You', 'Amit Sharma'],
    category: '🎬',
    location: 'PVR Director\'s Cut',
    status: 'settled'
  }
];

// Enhanced Helper Functions
function $(id) {
  return document.getElementById(id);
}

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function createRippleEffect(element, event) {
  const ripple = document.createElement('div');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.style.position = 'absolute';
  ripple.style.borderRadius = '50%';
  ripple.style.background = 'rgba(255,255,255,0.3)';
  ripple.style.transform = 'scale(0)';
  ripple.style.animation = 'ripple 0.6s ease-out';
  ripple.style.pointerEvents = 'none';
  
  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

function animateNumber(element, start, end, duration = 1000) {
  const startTime = performance.now();
  const range = end - start;
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(start + range * easeOutQuart);
    
    element.textContent = formatCurrency(current);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
  `;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 8px; font-size: 16px;">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

function calculateUserBalances() {
  const balanceMap = new Map();
  
  AppState.expenses.forEach(expense => {
    if (!expense.splitWith) return;
    
    const totalPeople = expense.splitWith.length + 1;
    const sharePerPerson = expense.amount / totalPeople;
    
    expense.splitWith.forEach(friendName => {
      if (expense.paidBy === 'You') {
        const currentBalance = balanceMap.get(friendName) || 0;
        balanceMap.set(friendName, currentBalance + sharePerPerson);
      } else if (expense.paidBy === friendName) {
        const currentBalance = balanceMap.get(friendName) || 0;
        balanceMap.set(friendName, currentBalance - sharePerPerson);
      }
    });
  });
  
  return Array.from(balanceMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .filter(balance => Math.abs(balance.amount) > 0.01);
}
