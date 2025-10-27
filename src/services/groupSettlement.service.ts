/**
 * Group Settlement Service
 * Handles multi-user, multi-currency group expense settlements
 * with comprehensive debt simplification algorithms
 */

import { Currency } from '../types/currency.types';
import { User } from '../types/user.types';
import { currencyService } from './currency.service';

interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: Currency;
  description: string;
  date: Date;
}

interface Settlement {
  from: User;
  to: User;
  amount: number;
  currency: Currency;
}

interface GroupBalance {
  userId: string;
  balance: number; // positive = owed, negative = owes
  currency: Currency;
}

export class GroupSettlementService {
  /**
   * Calculate simplified settlements for a group
   * @param transactions - List of all transactions in the group
   * @param baseCurrency - Base currency for settlement calculation
   * @returns Optimized list of settlements
   */
  async calculateSettlements(
    transactions: Transaction[],
    baseCurrency: Currency = 'USD'
  ): Promise<Settlement[]> {
    // Step 1: Calculate net balance for each user in base currency
    const balances = await this.calculateBalances(transactions, baseCurrency);

    // Step 2: Separate creditors (owed money) and debtors (owe money)
    const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

    // Step 3: Apply greedy algorithm for debt simplification
    return this.simplifyDebts(creditors, debtors, baseCurrency);
  }

  /**
   * Calculate net balance for each user
   */
  private async calculateBalances(
    transactions: Transaction[],
    baseCurrency: Currency
  ): Promise<GroupBalance[]> {
    const balanceMap = new Map<string, number>();

    // Process all transactions
    for (const transaction of transactions) {
      // Convert amount to base currency
      const amount = await currencyService.convert(
        transaction.amount,
        transaction.currency,
        baseCurrency
      );

      // Update balances
      const fromBalance = balanceMap.get(transaction.from) || 0;
      const toBalance = balanceMap.get(transaction.to) || 0;

      balanceMap.set(transaction.from, fromBalance - amount);
      balanceMap.set(transaction.to, toBalance + amount);
    }

    // Convert map to array
    return Array.from(balanceMap.entries()).map(([userId, balance]) => ({
      userId,
      balance,
      currency: baseCurrency
    }));
  }

  /**
   * Simplify debts using greedy algorithm
   * Minimizes number of transactions needed
   */
  private simplifyDebts(
    creditors: GroupBalance[],
    debtors: GroupBalance[],
    currency: Currency
  ): Settlement[] {
    const settlements: Settlement[] = [];
    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];

      // Calculate settlement amount (minimum of what's owed and what's due)
      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

      if (amount > 0.01) { // Ignore tiny amounts
        settlements.push({
          from: { id: debtor.userId } as User,
          to: { id: creditor.userId } as User,
          amount: Math.round(amount * 100) / 100, // Round to 2 decimals
          currency
        });
      }

      // Update balances
      creditor.balance -= amount;
      debtor.balance += amount;

      // Move to next creditor/debtor if settled
      if (creditor.balance < 0.01) i++;
      if (Math.abs(debtor.balance) < 0.01) j++;
    }

    return settlements;
  }

  /**
   * Get settlement summary with statistics
   */
  async getSettlementSummary(
    transactions: Transaction[],
    baseCurrency: Currency = 'USD'
  ) {
    const settlements = await this.calculateSettlements(transactions, baseCurrency);
    
    const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
    const uniqueUsers = new Set(
      settlements.flatMap(s => [s.from.id, s.to.id])
    ).size;

    return {
      settlements,
      summary: {
        totalAmount,
        currency: baseCurrency,
        numberOfSettlements: settlements.length,
        numberOfUsers: uniqueUsers,
        calculatedAt: new Date()
      }
    };
  }

  /**
   * Validate settlement data
   */
  validateSettlement(settlement: Settlement): boolean {
    if (!settlement.from?.id || !settlement.to?.id) {
      throw new Error('Invalid user IDs in settlement');
    }
    if (settlement.amount <= 0) {
      throw new Error('Settlement amount must be positive');
    }
    if (!settlement.currency) {
      throw new Error('Currency is required');
    }
    return true;
  }
}

export const groupSettlementService = new GroupSettlementService();
