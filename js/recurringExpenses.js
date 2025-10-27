/**
 * Recurring Expenses Module
 * Handles weekly/monthly recurring expense schedules with Firestore integration
 */

import { db } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';

const RECURRING_COLLECTION = 'recurringExpenses';

class RecurringExpenseManager {
  constructor() {
    this.userId = null;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  /**
   * Create a new recurring expense
   * @param {Object} expenseData - {description, amount, category, frequency, startDate, participants}
   */
  async createRecurringExpense(expenseData) {
    if (!this.userId) throw new Error('User not authenticated');

    const recurringExpense = {
      userId: this.userId,
      description: expenseData.description,
      amount: parseFloat(expenseData.amount),
      category: expenseData.category || 'General',
      frequency: expenseData.frequency, // 'weekly' or 'monthly'
      startDate: Timestamp.fromDate(new Date(expenseData.startDate)),
      participants: expenseData.participants || [],
      active: true,
      createdAt: Timestamp.now(),
      lastProcessed: null,
      nextDueDate: this.calculateNextDueDate(expenseData.startDate, expenseData.frequency)
    };

    try {
      const docRef = await addDoc(collection(db, RECURRING_COLLECTION), recurringExpense);
      return { id: docRef.id, ...recurringExpense };
    } catch (error) {
      console.error('Error creating recurring expense:', error);
      throw error;
    }
  }

  /**
   * Get all active recurring expenses for current user
   */
  async getActiveRecurringExpenses() {
    if (!this.userId) throw new Error('User not authenticated');

    try {
      const q = query(
        collection(db, RECURRING_COLLECTION),
        where('userId', '==', this.userId),
        where('active', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
      throw error;
    }
  }

  /**
   * Update recurring expense
   */
  async updateRecurringExpense(expenseId, updates) {
    try {
      const expenseRef = doc(db, RECURRING_COLLECTION, expenseId);
      await updateDoc(expenseRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Error updating recurring expense:', error);
      throw error;
    }
  }

  /**
   * Delete/deactivate recurring expense
   */
  async deleteRecurringExpense(expenseId) {
    try {
      const expenseRef = doc(db, RECURRING_COLLECTION, expenseId);
      await updateDoc(expenseRef, {
        active: false,
        deactivatedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      throw error;
    }
  }

  /**
   * Calculate next due date based on frequency
   */
  calculateNextDueDate(startDate, frequency) {
    const date = new Date(startDate);
    const now = new Date();
    
    while (date <= now) {
      if (frequency === 'weekly') {
        date.setDate(date.getDate() + 7);
      } else if (frequency === 'monthly') {
        date.setMonth(date.getMonth() + 1);
      }
    }
    
    return Timestamp.fromDate(date);
  }

  /**
   * Process due recurring expenses and create actual expenses
   */
  async processDueExpenses() {
    const recurringExpenses = await this.getActiveRecurringExpenses();
    const now = new Date();
    const processedExpenses = [];

    for (const expense of recurringExpenses) {
      const dueDate = expense.nextDueDate.toDate();
      
      if (dueDate <= now) {
        // Create actual expense from recurring template
        const newExpense = {
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: Timestamp.now(),
          participants: expense.participants,
          paidBy: this.userId,
          recurring: true,
          recurringId: expense.id
        };

        // Add to expenses collection
        await addDoc(collection(db, 'expenses'), newExpense);

        // Update next due date
        const nextDue = this.calculateNextDueDate(dueDate, expense.frequency);
        await this.updateRecurringExpense(expense.id, {
          lastProcessed: Timestamp.now(),
          nextDueDate: nextDue
        });

        processedExpenses.push(newExpense);
      }
    }

    return processedExpenses;
  }
}

export default RecurringExpenseManager;
