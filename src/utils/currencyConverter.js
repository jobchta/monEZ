/**
 * Currency Converter Module
 * Handles automatic currency conversion with live exchange rates
 */

const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const API_ENDPOINT = 'https://api.exchangerate-api.com/v4/latest/';

class CurrencyConverter {
  constructor() {
    this.cache = new Map();
    this.lastUpdate = null;
  }

  /**
   * Fetch exchange rates from API
   * @param {string} baseCurrency - Base currency code (e.g., 'INR')
   * @returns {Promise<Object>} Exchange rates object
   */
  async fetchRates(baseCurrency = 'INR') {
    const cacheKey = `rates_${baseCurrency}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(`${API_ENDPOINT}${baseCurrency}`);
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      
      const data = await response.json();
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: data.rates,
        timestamp: Date.now()
      });
      
      this.lastUpdate = new Date();
      return data.rates;
    } catch (error) {
      console.error('Currency conversion error:', error);
      // Return cached data if available, even if expired
      if (cached) return cached.data;
      throw error;
    }
  }

  /**
   * Convert amount from one currency to another
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @returns {Promise<number>} Converted amount
   */
  async convert(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    try {
      const rates = await this.fetchRates(fromCurrency);
      const rate = rates[toCurrency];
      
      if (!rate) {
        throw new Error(`Exchange rate not available for ${toCurrency}`);
      }
      
      return amount * rate;
    } catch (error) {
      console.error('Conversion failed:', error);
      return amount; // Return original amount on error
    }
  }

  /**
   * Get user's default currency from settings or locale
   * @returns {string} Currency code
   */
  getUserDefaultCurrency() {
    // Check user settings first
    const saved = localStorage.getItem('defaultCurrency');
    if (saved) return saved;
    
    // Fallback to locale-based detection
    const locale = navigator.language;
    const currencyMap = {
      'en-IN': 'INR',
      'hi-IN': 'INR',
      'en-US': 'USD',
      'en-GB': 'GBP',
      'en-EU': 'EUR'
    };
    
    return currencyMap[locale] || 'INR';
  }

  /**
   * Set user's default currency
   * @param {string} currency - Currency code
   */
  setUserDefaultCurrency(currency) {
    localStorage.setItem('defaultCurrency', currency);
  }

  /**
   * Get supported currencies
   * @returns {Array<Object>} List of supported currencies
   */
  getSupportedCurrencies() {
    return [
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' }
    ];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.lastUpdate = null;
  }
}

// Export singleton instance
export const currencyConverter = new CurrencyConverter();
export default currencyConverter;
