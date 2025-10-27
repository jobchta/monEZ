/**
 * Internationalization (i18n) Module
 * Supports 22 Indian languages + English
 */

class I18n {
  constructor() {
    this.currentLanguage = this.detectLanguage();
    this.translations = {};
    this.loadTranslations();
  }

  /**
   * Supported languages (22 Indian languages)
   */
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
      { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
      { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
      { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
      { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
      { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
      { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
      { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
      { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
      { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
      { code: 'mag', name: 'Magahi', nativeName: 'मगही' },
      { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी' },
      { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
      { code: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी' },
      { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
      { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
      { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी' },
      { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
      { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্' }
    ];
  }

  /**
   * Detect user's preferred language
   */
  detectLanguage() {
    // Check localStorage first
    const saved = localStorage.getItem('preferredLanguage');
    if (saved) return saved;

    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    const supported = this.getSupportedLanguages().map(l => l.code);
    
    return supported.includes(browserLang) ? browserLang : 'en';
  }

  /**
   * Set current language
   */
  setLanguage(languageCode) {
    this.currentLanguage = languageCode;
    localStorage.setItem('preferredLanguage', languageCode);
    document.documentElement.lang = languageCode;
    this.loadTranslations();
    this.updatePageTranslations();
  }

  /**
   * Get current language
   */
  getLanguage() {
    return this.currentLanguage;
  }

  /**
   * Load translations for current language
   */
  async loadTranslations() {
    try {
      const module = await import(`../translations/${this.currentLanguage}.js`);
      this.translations = module.default;
    } catch (error) {
      console.warn(`Failed to load translations for ${this.currentLanguage}, falling back to English`);
      if (this.currentLanguage !== 'en') {
        const module = await import('../translations/en.js');
        this.translations = module.default;
      }
    }
  }

  /**
   * Translate a key
   */
  t(key, params = {}) {
    let translation = this.translations[key] || key;
    
    // Replace parameters
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{{${param}}}`, params[param]);
    });
    
    return translation;
  }

  /**
   * Update all translatable elements on the page
   */
  updatePageTranslations() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });

    // Update ARIA labels
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
      const key = element.getAttribute('data-i18n-aria');
      element.setAttribute('aria-label', this.t(key));
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.setAttribute('placeholder', this.t(key));
    });

    // Update titles
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.setAttribute('title', this.t(key));
    });
  }

  /**
   * Get RTL (Right-to-Left) languages
   */
  isRTL() {
    const rtlLanguages = ['ur', 'ar', 'he', 'fa', 'sd'];
    return rtlLanguages.includes(this.currentLanguage);
  }

  /**
   * Apply RTL/LTR direction
   */
  applyTextDirection() {
    document.documentElement.dir = this.isRTL() ? 'rtl' : 'ltr';
  }
}

// Export singleton instance
export const i18n = new I18n();
export default i18n;
