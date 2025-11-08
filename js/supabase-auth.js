// js/supabase-auth.js
// Auth module using Supabase for monEZ
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseConfig } from '../supabase-config.js';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

// SIGN UP
export async function signup(email, password, name, phone) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone }
      }
    });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// LOGIN
export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// LOGOUT
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// CHECK SESSION
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

// GET CURRENT USER
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

console.log('🔑 Supabase Auth Module Loaded');
