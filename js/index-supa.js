// index-supa.js: Main entry point for monEZ with Supabase backend
// Using modular architecture with render.js, state.js, and views.js

import { AppState } from './state.js';
import { renderExpenseCard } from './render.js';
import { showHome, showAddExpense, showFriends, showGroups, showSettings } from './views.js';

// Supabase configuration
const SUPABASE_URL = 'https://royqgwcrwzqeehrebdrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJveXFnd2Nyd3pxZWVocmViZHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDY4MDcsImV4cCI6MjA3ODA4MjgwN30.MU3klD6uC91mXpY2AKXIMzxWIUswEo3F2vXjB4SRcDc';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialize app
async function initApp() {
  console.log('🚀 Initializing monEZ with Supabase...');
  
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    AppState.user = session.user;
    console.log('✅ User logged in:', AppState.user.email);
    await loadUserData();
    showHome();
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
    alert('Failed to load data. Please refresh the page.');
  }
}

// Load expenses from Supabase
async function loadExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', AppState.user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading expenses:', error);
    return;
  }
  
  AppState.expenses = data || [];
  console.log(`📊 Loaded ${AppState.expenses.length} expenses`);
}

// Load friends from Supabase
async function loadFriends() {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', AppState.user.id);
  
  if (error) {
    console.error('Error loading friends:', error);
    return;
  }
  
  AppState.friends = data || [];
  console.log(`👥 Loaded ${AppState.friends.length} friends`);
}

// Load groups from Supabase
async function loadGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('creator_id', AppState.user.id);
  
  if (error) {
    console.error('Error loading groups:', error);
    return;
  }
  
  AppState.groups = data || [];
  console.log(`👥 Loaded ${AppState.groups.length} groups`);
}

// Add new expense
async function addExpense(expenseData) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      user_id: AppState.user.id,
      amount: expenseData.amount,
      description: expenseData.description,
      category: expenseData.category,
      split_with: expenseData.splitWith || [],
      group_id: expenseData.groupId || null,
      status: 'settled',
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('Error adding expense:', error);
    alert('Failed to add expense. Please try again.');
    return false;
  }
  
  console.log('✅ Expense added successfully');
  await loadExpenses();
  return true;
}

// Setup event listeners
function setupEventListeners() {
  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    if (event === 'SIGNED_OUT') {
      window.location.href = '/auth-supa.html';
    }
  });
}

// Export functions for use in views
window.monezApp = {
  supabase,
  addExpense,
  loadExpenses,
  loadFriends,
  loadGroups
};

// Start the app
initApp();
