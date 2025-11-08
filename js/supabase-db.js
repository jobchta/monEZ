// js/supabase-db.js
// Supabase DB logic for expenses, friends, groups for monEZ
import { supabase } from './supabase-auth.js';

// Add Expenseexport async function addExpense(data) {
  const { error } = await supabase.from('expenses').insert([data]);
  return !error;
}
// Fetch Expenses (for this user or group)
export async function getExpenses(userId) {
  const { data, error } = await supabase.from('expenses').select('*').eq('created_by', userId);
  return error ? [] : data;
}
// Add Group
export async function addGroup(data) {
  const { error } = await supabase.from('groups').insert([data]);
  return !error;
}
// Fetch User Groups
export async function getGroups(userId) {
  const { data, error } = await supabase.from('groups').select('*').contains('members', [userId]);
  return error ? [] : data;
}
// Add Friend (assume friend relation is in 'friends' table)
export async function addFriend(data) {
  const { error } = await supabase.from('friends').insert([data]);
  return !error;
}
// Fetch all friends for user
export async function getFriends(userId) {
  const { data, error } = await supabase.from('friends').select('*').eq('user_id', userId);
  return error ? [] : data;
}
console.log('🗃️ Supabase DB Module Loaded');