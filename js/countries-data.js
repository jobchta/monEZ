// countries-data.js - Country and language data for onboarding

export const countries = {
  'US': { name: 'United States', flag: '🇺🇸' },
  'IN': { name: 'India', flag: '🇮🇳' },
  'GB': { name: 'United Kingdom', flag: '🇬🇧' },
  'CA': { name: 'Canada', flag: '🇨🇦' },
  'AU': { name: 'Australia', flag: '🇦🇺' },
  'DE': { name: 'Germany', flag: '🇩🇪' },
  'FR': { name: 'France', flag: '🇫🇷' },
  'JP': { name: 'Japan', flag: '🇯🇵' },
  'CN': { name: 'China', flag: '🇨🇳' },
  'BR': { name: 'Brazil', flag: '🇧🇷' }
};

export const countryDefaults = {
  'US': {
    primaryLanguage: 'en',
    currency: 'USD',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'en-US',
    languages: ['en', 'es'],
    paymentMethods: ['card', 'bank_transfer', 'paypal']
  },
  'IN': {
    primaryLanguage: 'en',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'en-IN',
    languages: ['en', 'hi'],
    paymentMethods: ['upi', 'card', 'bank_transfer']
  },
  'GB': {
    primaryLanguage: 'en',
    currency: 'GBP',
    timezone: 'Europe/London',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'en-GB',
    languages: ['en'],
    paymentMethods: ['card', 'bank_transfer']
  }
};

export const currencies = {
  'USD': { symbol: '$', name: 'US Dollar' },
  'INR': { symbol: '₹', name: 'Indian Rupee' },
  'GBP': { symbol: '£', name: 'British Pound' },
  'EUR': { symbol: '€', name: 'Euro' },
  'CAD': { symbol: 'C$', name: 'Canadian Dollar' },
  'AUD': { symbol: 'A$', name: 'Australian Dollar' }
};

export const languages = {
  'en': { name: 'English', nativeName: 'English' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी' },
  'es': { name: 'Spanish', nativeName: 'Español' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '中文(简体)' },
  'ar': { name: 'Arabic', nativeName: 'العربية' },
  'fr': { name: 'French', nativeName: 'Français' },
  'de': { name: 'German', nativeName: 'Deutsch' },
  'ja': { name: 'Japanese', nativeName: '日本語' }
};
