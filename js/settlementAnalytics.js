/**
 * Settlement Analytics Dashboard Module
 * Provides comprehensive analytics for settlements, categories, and payment completion rates
 */

import { db } from './firebase.js';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

class SettlementAnalytics {
  constructor() {
    this.userId = null;
    this.groupId = null;
  }

  setUser(userId) {
    this.userId = userId;
  }

  setGroup(groupId) {
    this.groupId = groupId;
  }

  /**
   * Get comprehensive settlement summary
   * @param {Date} startDate - Analysis start date
   * @param {Date} endDate - Analysis end date
   * @returns {Object} Settlement analytics summary
   */
  async getSettlementSummary(startDate = null, endDate = null) {
    if (!this.userId) throw new Error('User not set');

    const start = startDate ? Timestamp.fromDate(startDate) : Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = endDate ? Timestamp.fromDate(endDate) : Timestamp.now();

    try {
      // Get settlements in date range
      const settlementsQuery = query(
        collection(db, 'settlements'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end)
      );

      const settlementsSnapshot = await getDocs(settlementsQuery);
      const settlements = settlementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate summary metrics
      const totalSettlements = settlements.length;
      const completedSettlements = settlements.filter(s => s.status === 'completed').length;
      const pendingSettlements = settlements.filter(s => s.status === 'pending').length;
      const totalAmount = settlements.reduce((sum, s) => sum + (s.amount || 0), 0);
      const completedAmount = settlements.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.amount || 0), 0);
      const pendingAmount = settlements.filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.amount || 0), 0);

      // Calculate completion rate
      const completionRate = totalSettlements > 0 ? (completedSettlements / totalSettlements) * 100 : 0;

      // Get user-specific settlements
      const userOwedSettlements = settlements.filter(s => s.to === this.userId);
      const userOwesSettlements = settlements.filter(s => s.from === this.userId);

      return {
        period: { start: start.toDate(), end: end.toDate() },
        totals: {
          settlements: totalSettlements,
          completed: completedSettlements,
          pending: pendingSettlements,
          totalAmount,
          completedAmount,
          pendingAmount
        },
        completionRate: completionRate.toFixed(2),
        userStats: {
          owed: {
            count: userOwedSettlements.length,
            amount: userOwedSettlements.reduce((sum, s) => sum + (s.amount || 0), 0)
          },
          owes: {
            count: userOwesSettlements.length,
            amount: userOwesSettlements.reduce((sum, s) => sum + (s.amount || 0), 0)
          }
        },
        settlements
      };
    } catch (error) {
      console.error('Error getting settlement summary:', error);
      throw error;
    }
  }

  /**
   * Get top expense categories with analytics
   * @param {number} limit - Number of top categories to return
   * @returns {Array} Top categories with spending data
   */
  async getTopCategories(limit = 10, startDate = null, endDate = null) {
    if (!this.userId) throw new Error('User not set');

    const start = startDate ? Timestamp.fromDate(startDate) : Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = endDate ? Timestamp.fromDate(endDate) : Timestamp.now();

    try {
      // Get all expenses in date range
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('date', '>=', start),
        where('date', '<=', end)
      );

      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Group by category
      const categoryMap = new Map();

      expenses.forEach(expense => {
        const category = expense.category || 'Uncategorized';
        const amount = parseFloat(expense.amount) || 0;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            totalAmount: 0,
            count: 0,
            expenses: []
          });
        }

        const categoryData = categoryMap.get(category);
        categoryData.totalAmount += amount;
        categoryData.count += 1;
        categoryData.expenses.push(expense);
      });

      // Convert to array and sort by total amount
      const categories = Array.from(categoryMap.values())
        .map(cat => ({
          ...cat,
          averageAmount: cat.count > 0 ? cat.totalAmount / cat.count : 0,
          percentage: 0 // Will be calculated after getting total
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit);

      // Calculate percentages
      const totalSpending = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      categories.forEach(cat => {
        cat.percentage = totalSpending > 0 ? ((cat.totalAmount / totalSpending) * 100).toFixed(2) : 0;
        delete cat.expenses; // Remove detailed expenses from response
      });

      return {
        period: { start: start.toDate(), end: end.toDate() },
        totalSpending,
        totalExpenses: expenses.length,
        categories
      };
    } catch (error) {
      console.error('Error getting top categories:', error);
      throw error;
    }
  }

  /**
   * Get payment completion rate analytics
   * @returns {Object} Payment completion metrics and trends
   */
  async getPaymentCompletionMetrics() {
    if (!this.userId) throw new Error('User not set');

    try {
      // Get all settlements
      const settlementsSnapshot = await getDocs(collection(db, 'settlements'));
      const settlements = settlementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter user-relevant settlements
      const userSettlements = settlements.filter(
        s => s.from === this.userId || s.to === this.userId
      );

      // Calculate metrics
      const total = userSettlements.length;
      const completed = userSettlements.filter(s => s.status === 'completed').length;
      const pending = userSettlements.filter(s => s.status === 'pending').length;
      const overdue = userSettlements.filter(s => {
        if (s.status !== 'pending' || !s.dueDate) return false;
        return s.dueDate.toDate() < new Date();
      }).length;

      // Calculate average completion time for completed settlements
      const completionTimes = userSettlements
        .filter(s => s.status === 'completed' && s.completedAt && s.createdAt)
        .map(s => {
          const created = s.createdAt.toDate();
          const completed = s.completedAt.toDate();
          return (completed - created) / (1000 * 60 * 60 * 24); // Days
        });

      const avgCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0;

      // Calculate monthly trends
      const monthlyData = this.calculateMonthlyTrends(userSettlements);

      return {
        overall: {
          total,
          completed,
          pending,
          overdue,
          completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
          averageCompletionDays: avgCompletionTime.toFixed(1)
        },
        trends: monthlyData,
        userRole: {
          asCreditor: userSettlements.filter(s => s.to === this.userId).length,
          asDebtor: userSettlements.filter(s => s.from === this.userId).length
        }
      };
    } catch (error) {
      console.error('Error getting payment completion metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate monthly settlement trends
   */
  calculateMonthlyTrends(settlements) {
    const monthlyMap = new Map();

    settlements.forEach(settlement => {
      if (!settlement.createdAt) return;

      const date = settlement.createdAt.toDate();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          total: 0,
          completed: 0,
          pending: 0,
          amount: 0
        });
      }

      const monthData = monthlyMap.get(monthKey);
      monthData.total += 1;
      monthData.amount += settlement.amount || 0;

      if (settlement.status === 'completed') {
        monthData.completed += 1;
      } else if (settlement.status === 'pending') {
        monthData.pending += 1;
      }
    });

    return Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }

  /**
   * Generate comprehensive analytics dashboard data
   */
  async getDashboardData(startDate = null, endDate = null) {
    try {
      const [settlementSummary, topCategories, completionMetrics] = await Promise.all([
        this.getSettlementSummary(startDate, endDate),
        this.getTopCategories(10, startDate, endDate),
        this.getPaymentCompletionMetrics()
      ]);

      return {
        settlementSummary,
        topCategories,
        completionMetrics,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating dashboard data:', error);
      throw error;
    }
  }
}

export default SettlementAnalytics;
