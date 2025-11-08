// index-supa.js: Main entry point for monEZ with Supabase backend
// Using global supabase from CDN loaded in index.html

// Supabase configuration
const SUPABASE_URL = 'https://royqgwcrwzqeehrebdrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJveXFnd2Nyd3pxZWVocmViZHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDY4MDcsImV4cCI6MjA3ODA4MjgwN30.MU3klD6uC91mXpY2AKXIMzxWIUswEo3F2vXjB4SRcDc';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Global state
let currentUser = null;
let expenses = [];
let friends = [];
let groups = [];

// Initialize app
async function initApp() {
  console.log('🚀 Initializing monEZ with Supabase...');
  
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    console.log('✅ User logged in:', currentUser.email);
    await loadUserData();
    showDashboard();
  } else {
    console.log('❌ No session found, redirecting to login...');
    window.location.href = '/auth-supa.html';
  }
  
  setupEventListeners();
}

// Load all user data
async function loadUserData() {
  try {
    await Promise.all([
      loadExpenses(),
      loadFriends(),
      loadGroups()
    ]);
    console.log('✅ All data loaded successfully');
  } catch (error) {
    console.error('❌ Error loading data:', error);
    showError('Failed to load data. Please refresh the page.');
  }
}

// Load expenses from Supabase
async function loadExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading expenses:', error);
    return;
  }
  
  expenses = data || [];
  console.log(`📊 Loaded ${expenses.length} expenses`);
  renderExpenses();
  updateStats();
}

// Load friends from Supabase
async function loadFriends() {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', currentUser.id);
  
  if (error) {
    console.error('Error loading friends:', error);
    return;
  }
  
  friends = data || [];
  console.log(`👥 Loaded ${friends.length} friends`);
  renderFriends();
}

// Load groups from Supabase
async function loadGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('creator_id', currentUser.id);
  
  if (error) {
    console.error('Error loading groups:', error);
    return;
  }
  
  groups = data || [];
  console.log(`👥 Loaded ${groups.length} groups`);
  renderGroups();
}

// Add new expense
async function addExpense(expenseData) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      user_id: currentUser.id,
      amount: expenseData.amount,
      description: expenseData.description,
      category: expenseData.category,
      split_with: expenseData.splitWith,
      group_id: expenseData.groupId,
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error adding expense:', error);
    showError('Failed to add expense. Please try again.');
    return false;
  }
  
  console.log('✅ Expense added successfully');
  await loadExpenses();
  return true;
}

// Render expenses list
function renderExpenses() {
  const expensesList = document.getElementById('expenses-list');
  if (!expensesList) return;
  
  if (expenses.length === 0) {
    expensesList.innerHTML = `
      <div class="empty-state">
        <p>No expenses yet. Add your first expense!</p>
      </div>
    `;
    return;
  }
  
  expensesList.innerHTML = expenses.map(expense => `
    <div class="expense-item" data-id="${expense.id}">
      <div class="expense-info">
        <h3>${expense.description}</h3>
        <p class="expense-category">${expense.category}</p>
        <p class="expense-date">${new Date(expense.created_at).toLocaleDateString()}</p>
      </div>
      <div class="expense-amount">
        ₹${parseFloat(expense.amount).toFixed(2)}
      </div>
    </div>
  `).join('');
}

// Render friends list
function renderFriends() {
  const friendsList = document.getElementById('friends-list');
  if (!friendsList) return;
  
  if (friends.length === 0) {
    friendsList.innerHTML = `
      <div class="empty-state">
        <p>No friends added yet. Add friends to split expenses!</p>
      </div>
    `;
    return;
  }
  
  friendsList.innerHTML = friends.map(friend => `
    <div class="friend-item" data-id="${friend.id}">
      <div class="friend-info">
        <h4>${friend.name}</h4>
        <p>${friend.email || ''}</p>
      </div>
    </div>
  `).join('');
}

// Render groups list
function renderGroups() {
  const groupsList = document.getElementById('groups-list');
  if (!groupsList) return;
  
  if (groups.length === 0) {
    groupsList.innerHTML = `
      <div class="empty-state">
        <p>No groups created yet.</p>
      </div>
    `;
    return;
  }
  
  groupsList.innerHTML = groups.map(group => `
    <div class="group-item" data-id="${group.id}">
      <h4>${group.name}</h4>
      <p>${group.members?.length || 0} members</p>
    </div>
  `).join('');
}

// Update stats dashboard
function updateStats() {
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const totalCount = expenses.length;
  
  const totalAmountEl = document.getElementById('total-amount');
  const totalCountEl = document.getElementById('total-count');
  
  if (totalAmountEl) totalAmountEl.textContent = `₹${totalExpenses.toFixed(2)}`;
  if (totalCountEl) totalCountEl.textContent = totalCount;
}

// Show dashboard
function showDashboard() {
  const appRoot = document.getElementById('app-root');
  if (!appRoot) return;
  
  appRoot.innerHTML = `
    <header>
      <h1>monEZ</h1>
      <p>Welcome, ${currentUser?.email || 'User'}</p>
      <button id="logout-btn">Logout</button>
    </header>
    
    <main>
      <section class="stats">
        <div class="stat-card">
          <h3>Total Expenses</h3>
          <p id="total-amount">₹0.00</p>
        </div>
        <div class="stat-card">
          <h3>Number of Expenses</h3>
          <p id="total-count">0</p>
        </div>
      </section>
      
      <section class="expenses">
        <h2>Recent Expenses</h2>
        <button id="add-expense-btn" class="btn-primary">+ Add Expense</button>
        <div id="expenses-list"></div>
      </section>
      
      <section class="friends">
        <h2>Friends</h2>
        <button id="add-friend-btn" class="btn-secondary">+ Add Friend</button>
        <div id="friends-list"></div>
      </section>
      
      <section class="groups">
        <h2>Groups</h2>
        <button id="add-group-btn" class="btn-secondary">+ Create Group</button>
        <div id="groups-list"></div>
      </section>
    </main>
  `;
}

// Show error message
function showError(message) {
  alert(message); // Simple error handling - can be improved with toast/notification
}

// Setup event listeners
function setupEventListeners() {
  // Logout button
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'logout-btn') {
      await supabase.auth.signOut();
      window.location.href = '/auth-supa.html';
    }
    
    if (e.target.id === 'add-expense-btn') {
      showAddExpenseModal();
    }
    
    if (e.target.id === 'add-friend-btn') {
      showAddFriendModal();
    }
    
    if (e.target.id === 'add-group-btn') {
      showAddGroupModal();
    }
  });
}

// Show add expense modal (simplified)
function showAddExpenseModal() {
  const description = prompt('Enter expense description:');
  const amount = prompt('Enter amount:');
  const category = prompt('Enter category (Food/Transport/Entertainment/Other):');
  
  if (description && amount && category) {
    addExpense({
      description,
      amount: parseFloat(amount),
      category,
      splitWith: [],
      groupId: null
    });
  }
}

// Show add friend modal (simplified)
function showAddFriendModal() {
  alert('Add friend feature coming soon!');
}

// Show add group modal (simplified)
function showAddGroupModal() {
  alert('Create group feature coming soon!');
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  if (event === 'SIGNED_OUT') {
    window.location.href = '/auth-supa.html';
  }
});

// Start the app
initApp();
