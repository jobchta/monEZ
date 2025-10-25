// TODO: Fix duplicate imports and add error handling
import { AppState, safeGet, formatCurrency, createRippleEffect, animateNumber, calculateUserBalances, showNotification } from './utils.js';
// monEZ - Render Functions
export function renderRecentExpenses() {
  const container = safeGet('recent-expenses');
  if (!container) return;
  container.innerHTML = '';
