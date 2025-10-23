// monEZ - Onboarding System

import { countries, countryDefaults, currencies, languages } from './countries-data.js';
import { auth, db, doc, setDoc, serverTimestamp } from './firebase.js';
import { showNotification, safeGet } from './utils.js';
import { showHome } from './views.js';

// Onboarding State
const OnboardingState = {
  selectedCountry: null,
  userPreferences: {
    country: null,
    language: 'en',
    currency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'en-US',
    paymentMethods: []
  },
  detectedCountry: null
};

// Popular countries to show first
const POPULAR_COUNTRIES = ['IN', 'US', 'GB', 'AE', 'SG', 'CA', 'AU', 'PH', 'ID', 'MY'];

// Popular languages
const POPULAR_LANGUAGES = ['en', 'hi', 'es', 'zh-CN', 'ar', 'bn', 'pt', 'ru', 'ja', 'fr'];

// Date format options
const DATE_FORMATS = [
  { format: 'DD/MM/YYYY', example: '25/10/2025', name: 'Day/Month/Year' },
  { format: 'MM/DD/YYYY', example: '10/25/2025', name: 'Month/Day/Year' },
  { format: 'YYYY-MM-DD', example: '2025-10-25', name: 'Year-Month-Day (ISO)' },
  { format: 'DD.MM.YYYY', example: '25.10.2025', name: 'Day.Month.Year' },
  { format: 'YYYY/MM/DD', example: '2025/10/25', name: 'Year/Month/Day' }
];

// Initialize Onboarding
export async function initOnboarding() {
  // Auto-detect country
  OnboardingState.detectedCountry = await autoDetectCountry();
  
  // Populate country selection
  populatePopularCountries();
  
  // Setup event listeners
  setupOnboardingListeners();
  
  // Show onboarding screen
  const onboardingScreen = safeGet('onboarding-screen');
  if (onboardingScreen) {
    onboardingScreen.classList.remove('hidden');
  }
}

// Auto-detect user's country
async function autoDetectCountry() {
  try {
    // Method 1: IP-based geolocation (free API)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    console.log('Detected country:', data.country_code);
    return data.country_code;
  } catch (error) {
    console.log('IP detection failed, using browser locale');
    // Method 2: Browser locale fallback
    const locale = navigator.language || navigator.userLanguage;
    const countryCode = locale.split('-')[1];
    return countryCode || 'US';
  }
}

// Populate popular countries
function populatePopularCountries() {
  const container = safeGet('popular-countries');
  if (!container) return;
  
  container.innerHTML = '';
  
  POPULAR_COUNTRIES.forEach(countryCode => {
    if (countries[countryCode]) {
      const btn = createCountryButton(countryCode, countries[countryCode]);
      
      // Mark detected country as suggested
      if (countryCode === OnboardingState.detectedCountry) {
        btn.classList.add('suggested');
      }
      
      container.appendChild(btn);
    }
  });
}

// Populate all countries
function populateAllCountries() {
  const container = safeGet('all-countries');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Sort countries alphabetically
  const sortedCountries = Object.entries(countries).sort((a, b) => 
    a[1].name.localeCompare(b[1].name)
  );
  
  sortedCountries.forEach(([code, data]) => {
    const btn = createCountryButton(code, data);
    container.appendChild(btn);
  });
}

// Create country button
function createCountryButton(code, data) {
  const btn = document.createElement('button');
  btn.className = 'country-btn';
  btn.dataset.country = code;
  
  btn.innerHTML = `
    <span class="flag">${data.flag}</span>
    <span class="name">${data.name}</span>
  `;
  
  btn.addEventListener('click', () => selectCountry(code));
  
  return btn;
}

// Select country and move to next step
function selectCountry(countryCode) {
  OnboardingState.selectedCountry = countryCode;
  const defaults = countryDefaults[countryCode];
  
  if (!defaults) {
    showNotification('Country not fully supported yet. Using defaults.', 'info');
    // Use US defaults
    OnboardingState.userPreferences = {
      country: countryCode,
      language: 'en',
      currency: currencies[countryCode] ? countryCode : 'USD',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      paymentMethods: ['bank_transfer']
    };
  } else {
    // Auto-populate preferences from country defaults
    OnboardingState.userPreferences = {
      country: countryCode,
      language: defaults.primaryLanguage,
      currency: defaults.currency,
      timezone: defaults.timezone,
      dateFormat: defaults.dateFormat,
      numberFormat: defaults.numberFormat,
      paymentMethods: defaults.paymentMethods
    };
  }
  
  // Show confirmation step
  showConfirmationStep();
}

// Show confirmation step with smart defaults
function showConfirmationStep() {
  // Hide country step
  const countryStep = safeGet('onboarding-country');
  const confirmStep = safeGet('onboarding-confirm');
  
  if (countryStep) countryStep.classList.add('hidden');
  if (confirmStep) {
    confirmStep.classList.remove('hidden');
    populateConfirmation();
  }
}

// Populate confirmation screen
function populateConfirmation() {
  const country = countries[OnboardingState.selectedCountry];
  const prefs = OnboardingState.userPreferences;
  
  // Country display
  const countryDisplay = safeGet('selected-country-display');
  if (countryDisplay) {
    countryDisplay.textContent = `${country.name} ${country.flag}`;
  }
  
  // Language
  const lang = languages[prefs.language] || { name: 'English', nativeName: 'English' };
  const langDisplay = safeGet('selected-language-display');
  if (langDisplay) {
    langDisplay.textContent = `${lang.name} (${lang.nativeName})`;
  }
  
  // Currency
  const curr = currencies[prefs.currency] || { symbol: '$', name: 'US Dollar' };
  const currDisplay = safeGet('selected-currency-display');
  if (currDisplay) {
    currDisplay.textContent = `${prefs.currency} (${curr.symbol})`;
  }
  
  // Timezone
  const tzDisplay = safeGet('selected-timezone-display');
  if (tzDisplay) {
    tzDisplay.textContent = formatTimezone(prefs.timezone);
  }
  
  // Date Format
  const dateDisplay = safeGet('selected-dateformat-display');
  if (dateDisplay) {
    dateDisplay.textContent = prefs.dateFormat;
  }
}

// Format timezone for display
function formatTimezone(tz) {
  const now = new Date();
  const offset = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    timeZoneName: 'short'
  }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '';
  
  return `${tz.replace('_', ' ')} (${offset})`;
}

// Setup all event listeners
function setupOnboardingListeners() {
  // Country search
  const countrySearch = safeGet('country-search-input');
  if (countrySearch) {
    countrySearch.addEventListener('input', (e) => {
      filterCountries(e.target.value);
    });
  }
  
  // Show all countries
  const showAllBtn = safeGet('show-all-countries-btn');
  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      const allContainer = safeGet('all-countries-container');
      if (allContainer) {
        const isHidden = allContainer.classList.contains('hidden');
        allContainer.classList.toggle('hidden');
        showAllBtn.textContent = isHidden ? 'Show less ▲' : 'Show all countries ▼';
        
        if (isHidden) {
          populateAllCountries();
          allContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
  }
  
  // Back button
  const backBtn = safeGet('onboarding-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', goBackToCountrySelection);
  }
  
  // Continue button
  const continueBtn = safeGet('onboarding-continue-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', confirmAndFinishOnboarding);
  }
  
  // Change language button
  const changeLangBtn = safeGet('change-language-btn');
  if (changeLangBtn) {
    changeLangBtn.addEventListener('click', openLanguagePicker);
  }
  
  // Change currency button
  const changeCurrBtn = safeGet('change-currency-btn');
  if (changeCurrBtn) {
    changeCurrBtn.addEventListener('click', openCurrencyPicker);
  }
  
  // Change timezone button
  const changeTzBtn = safeGet('change-timezone-btn');
  if (changeTzBtn) {
    changeTzBtn.addEventListener('click', openTimezonePicker);
  }
  
  // Change date format button
  const changeDateBtn = safeGet('change-dateformat-btn');
  if (changeDateBtn) {
    changeDateBtn.addEventListener('click', openDateFormatPicker);
  }
  
  // Modal close buttons
  setupModalListeners();
}

// Filter countries by search
function filterCountries(searchTerm) {
  const term = searchTerm.toLowerCase();
  const allButtons = document.querySelectorAll('.country-btn');
  
  allButtons.forEach(btn => {
    const name = btn.querySelector('.name').textContent.toLowerCase();
    if (name.includes(term)) {
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  });
}

// Go back to country selection
function goBackToCountrySelection() {
  const countryStep = safeGet('onboarding-country');
  const confirmStep = safeGet('onboarding-confirm');
  
  if (countryStep) countryStep.classList.remove('hidden');
  if (confirmStep) confirmStep.classList.add('hidden');
}

// Open language picker modal
function openLanguagePicker() {
  const modal = safeGet('language-picker-modal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  populateLanguagePicker();
}

// Populate language picker
function populateLanguagePicker() {
  const defaults = countryDefaults[OnboardingState.selectedCountry];
  
  // Suggested languages (from country)
  const suggestedList = safeGet('suggested-languages-list');
  if (suggestedList && defaults) {
    suggestedList.innerHTML = '';
    defaults.languages.forEach(langCode => {
      if (languages[langCode]) {
        const btn = createLanguageButton(langCode, languages[langCode]);
        suggestedList.appendChild(btn);
      }
    });
  }
  
  // Popular languages
  const popularList = safeGet('popular-languages-list');
  if (popularList) {
    popularList.innerHTML = '';
    POPULAR_LANGUAGES.forEach(langCode => {
      if (languages[langCode]) {
        const btn = createLanguageButton(langCode, languages[langCode]);
        popularList.appendChild(btn);
      }
    });
  }
  
  // All languages
  const allList = safeGet('all-languages-list');
  if (allList) {
    allList.innerHTML = '';
    Object.entries(languages).forEach(([code, data]) => {
      const btn = createLanguageButton(code, data);
      allList.appendChild(btn);
    });
  }
}

// Create language button
function createLanguageButton(code, data) {
  const btn = document.createElement('button');
  btn.className = 'language-btn';
  btn.dataset.lang = code;
  
  if (code === OnboardingState.userPreferences.language) {
    btn.classList.add('selected');
  }
  
  btn.innerHTML = `
    <div>
      <span class="lang-name">${data.name}</span>
      <span class="lang-native">${data.nativeName}</span>
    </div>
  `;
  
  btn.addEventListener('click', () => {
    OnboardingState.userPreferences.language = code;
    closeLanguagePicker();
    populateConfirmation();
    showNotification(`Language changed to ${data.name}`, 'success');
  });
  
  return btn;
}

// Open currency picker modal
function openCurrencyPicker() {
  const modal = safeGet('currency-picker-modal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  populateCurrencyPicker();
}

// Populate currency picker
function populateCurrencyPicker() {
  const list = safeGet('currency-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  Object.entries(currencies).forEach(([code, data]) => {
    const btn = document.createElement('button');
    btn.className = 'currency-btn';
    btn.dataset.currency = code;
    
    if (code === OnboardingState.userPreferences.currency) {
      btn.classList.add('selected');
    }
    
    btn.innerHTML = `
      <div>
        <span class="currency-name">${data.name}</span>
        <span class="currency-symbol">${data.symbol}</span>
      </div>
      <span style="font-weight: 600;">${code}</span>
    `;
    
    btn.addEventListener('click', () => {
      OnboardingState.userPreferences.currency = code;
      closeCurrencyPicker();
      populateConfirmation();
      showNotification(`Currency changed to ${code}`, 'success');
    });
    
    list.appendChild(btn);
  });
}

// Open date format picker
function openDateFormatPicker() {
  const modal = safeGet('dateformat-picker-modal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  populateDateFormatPicker();
}

// Populate date format picker
function populateDateFormatPicker() {
  const list = safeGet('dateformat-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  DATE_FORMATS.forEach(format => {
    const btn = document.createElement('button');
    btn.className = 'dateformat-btn';
    
    if (format.format === OnboardingState.userPreferences.dateFormat) {
      btn.classList.add('selected');
    }
    
    btn.innerHTML = `
      <div>
        <span class="dateformat-name">${format.name}</span>
        <div class="dateformat-example" style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
          Example: ${format.example}
        </div>
      </div>
      <span style="font-weight: 600;">${format.format}</span>
    `;
    
    btn.addEventListener('click', () => {
      OnboardingState.userPreferences.dateFormat = format.format;
      closeDateFormatPicker();
      populateConfirmation();
      showNotification(`Date format changed to ${format.format}`, 'success');
    });
    
    list.appendChild(btn);
  });
}

// Open timezone picker
function openTimezonePicker() {
  const modal = safeGet('timezone-picker-modal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  populateTimezonePicker();
}

// Populate timezone picker
function populateTimezonePicker() {
  const list = safeGet('timezone-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  // Get common timezones
  const commonTimezones = Intl.supportedValuesOf('timeZone');
  
  commonTimezones.forEach(tz => {
    const btn = document.createElement('button');
    btn.className = 'timezone-btn';
    
    if (tz === OnboardingState.userPreferences.timezone) {
      btn.classList.add('selected');
    }
    
    btn.innerHTML = `
      <span class="timezone-name">${tz.replace('_', ' ')}</span>
      <span class="timezone-offset">${formatTimezone(tz)}</span>
    `;
    
    btn.addEventListener('click', () => {
      OnboardingState.userPreferences.timezone = tz;
      closeTimezonePicker();
      populateConfirmation();
      showNotification(`Timezone changed to ${tz}`, 'success');
    });
    
    list.appendChild(btn);
  });
}

// Close modals
function closeLanguagePicker() {
  const modal = safeGet('language-picker-modal');
  if (modal) modal.classList.add('hidden');
}

function closeCurrencyPicker() {
  const modal = safeGet('currency-picker-modal');
  if (modal) modal.classList.add('hidden');
}

function closeDateFormatPicker() {
  const modal = safeGet('dateformat-picker-modal');
  if (modal) modal.classList.add('hidden');
}

function closeTimezonePicker() {
  const modal = safeGet('timezone-picker-modal');
  if (modal) modal.classList.add('hidden');
}

// Setup modal listeners
function setupModalListeners() {
  // Language modal
  const closeLangBtn = safeGet('close-language-modal');
  if (closeLangBtn) closeLangBtn.addEventListener('click', closeLanguagePicker);
  
  const langModal = safeGet('language-picker-modal');
  if (langModal) {
    langModal.querySelector('.modal-overlay')?.addEventListener('click', closeLanguagePicker);
  }
  
  // Currency modal
  const closeCurrBtn = safeGet('close-currency-modal');
  if (closeCurrBtn) closeCurrBtn.addEventListener('click', closeCurrencyPicker);
  
  const currModal = safeGet('currency-picker-modal');
  if (currModal) {
    currModal.querySelector('.modal-overlay')?.addEventListener('click', closeCurrencyPicker);
  }
  
  // Date format modal
  const closeDateBtn = safeGet('close-dateformat-modal');
  if (closeDateBtn) closeDateBtn.addEventListener('click', closeDateFormatPicker);
  
  const dateModal = safeGet('dateformat-picker-modal');
  if (dateModal) {
    dateModal.querySelector('.modal-overlay')?.addEventListener('click', closeDateFormatPicker);
  }
  
  // Timezone modal
  const closeTzBtn = safeGet('close-timezone-modal');
  if (closeTzBtn) closeTzBtn.addEventListener('click', closeTimezonePicker);
  
  const tzModal = safeGet('timezone-picker-modal');
  if (tzModal) {
    tzModal.querySelector('.modal-overlay')?.addEventListener('click', closeTimezonePicker);
  }
}

// Confirm and finish onboarding
async function confirmAndFinishOnboarding() {
  const continueBtn = safeGet('onboarding-continue-btn');
  if (continueBtn) {
    continueBtn.innerHTML = '💾 Saving...';
    continueBtn.disabled = true;
  }
  
  try {
    // Save to Firebase
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        preferences: OnboardingState.userPreferences,
        onboardingCompleted: true,
        onboardedAt: serverTimestamp(),
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        photoURL: auth.currentUser.photoURL
      }, { merge: true });
    }
    
    // Save to localStorage
    localStorage.setItem('userPreferences', JSON.stringify(OnboardingState.userPreferences));
    localStorage.setItem('onboardingCompleted', 'true');
    
    // Apply preferences
    await applyUserPreferences(OnboardingState.userPreferences);
    
    // Show success
    showNotification('✅ All set! Welcome to monEZ', 'success');
    
    // Hide onboarding, show main app
    const onboardingScreen = safeGet('onboarding-screen');
    if (onboardingScreen) {
      onboardingScreen.classList.add('hidden');
    }
    
    // Trigger app initialization
    if (showHome) {
      showHome();
    }
    
  } catch (error) {
    console.error('Error saving preferences:', error);
    showNotification('Error saving preferences: ' + error.message, 'error');
    
    if (continueBtn) {
      continueBtn.innerHTML = 'Looks good! Continue →';
      continueBtn.disabled = false;
    }
  }
}

// Apply user preferences to app
async function applyUserPreferences(prefs) {
  // Will integrate with i18n system later
  console.log('Applying preferences:', prefs);
  
  // Save to AppState if available
  if (window.AppState) {
    window.AppState.userPreferences = prefs;
  }
}

// Check if onboarding is needed
export function checkOnboardingStatus() {
  const completed = localStorage.getItem('onboardingCompleted');
  return completed === 'true';
}

// Show onboarding for existing users (settings)
export function showOnboardingFromSettings() {
  // Load existing preferences
  const saved = localStorage.getItem('userPreferences');
  if (saved) {
    OnboardingState.userPreferences = JSON.parse(saved);
  }
  
  initOnboarding();
}
