/**
 * User Preferences Service
 * 
 * Manages user preferences for display, defaults, notifications, and privacy settings.
 * Provides utility functions for applying preferences throughout the application.
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'showsuite_user_preferences';

  const DEFAULT_PREFERENCES = {
  display: {
    theme: 'dark',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currencyFormat: 'USD',
    itemsPerPage: 25,
    defaultView: 'grid'
  },
  defaults: {
    donationRecurringType: 'One-Time',
    donationCampaign: 'general',
    taxDeductible: true,
    contactTags: []
  },
  notifications: {
    showSuccessMessages: true,
    showWarnings: true,
    autoSaveReminders: true
  },
  privacy: {
    rememberFilters: true,
    saveFormDrafts: true
  }
};

/**
 * Load user preferences from localStorage
 * @returns {Object} User preferences object
 */
const loadPreferences = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all keys exist
      return {
        display: { ...DEFAULT_PREFERENCES.display, ...(parsed.display || {}) },
        defaults: { ...DEFAULT_PREFERENCES.defaults, ...(parsed.defaults || {}) },
        notifications: { ...DEFAULT_PREFERENCES.notifications, ...(parsed.notifications || {}) },
        privacy: { ...DEFAULT_PREFERENCES.privacy, ...(parsed.privacy || {}) }
      };
    }
    return JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
  } catch (error) {
    console.error('Error loading preferences:', error);
    return JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
  }
};

/**
 * Save user preferences to localStorage
 * @param {Object} preferences - Preferences object to save
 */
const savePreferences = (preferences) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
};

/**
 * Get default preferences
 * @returns {Object} Default preferences object
 */
const getDefaultPreferences = () => {
  return JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
};

/**
 * Get a specific preference value
 * @param {string} category - Category (display, defaults, notifications, privacy)
 * @param {string} key - Preference key
 * @returns {*} Preference value
 */
const getPreference = (category, key) => {
  const prefs = loadPreferences();
  return prefs[category]?.[key];
};

/**
 * Set a specific preference value
 * @param {string} category - Category (display, defaults, notifications, privacy)
 * @param {string} key - Preference key
 * @param {*} value - Value to set
 */
const setPreference = (category, key, value) => {
  const prefs = loadPreferences();
  if (prefs[category]) {
    prefs[category][key] = value;
    savePreferences(prefs);
  }
};

/**
 * Apply date format preference to a date
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  const format = getPreference('display', 'dateFormat') || 'MM/DD/YYYY';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    return '';
  }
  
  switch (format) {
    case 'MM/DD/YYYY':
      return dateObj.toLocaleDateString('en-US');
    case 'DD/MM/YYYY':
      return dateObj.toLocaleDateString('en-GB');
    case 'YYYY-MM-DD':
      return dateObj.toISOString().split('T')[0];
    default:
      return dateObj.toLocaleDateString();
  }
};

/**
 * Apply time format preference to a time string or Date
 * @param {string|Date} time - Time string (HH:MM) or Date object to format
 * @returns {string} Formatted time string
 */
const formatTime = (time) => {
  const format = getPreference('display', 'timeFormat') || '12h';
  
  let date;
  if (typeof time === 'string') {
    // Handle HH:MM format
    const [hours, minutes] = time.split(':').map(n => parseInt(n, 10));
    date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
  } else if (time instanceof Date) {
    date = time;
  } else {
    return time; // Return as-is if not recognized format
  }
  
  if (format === '12h') {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  } else {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  }
};

/**
 * Apply currency format preference to an amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  const currency = getPreference('display', 'currencyFormat') || 'USD';
  
  const localeMap = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'CAD': 'en-CA'
  };
  
  return new Intl.NumberFormat(localeMap[currency] || 'en-US', {
    style: 'currency',
    currency: currency
  }).format(amount || 0);
};

/**
 * Get items per page preference
 * @returns {number} Items per page
 */
const getItemsPerPage = () => {
  return getPreference('display', 'itemsPerPage') || 25;
};

/**
 * Get default view preference
 * @returns {string} 'grid' or 'list'
 */
const getDefaultView = () => {
  return getPreference('display', 'defaultView') || 'grid';
};

/**
 * Check if a notification type is enabled
 * @param {string} type - Notification type
 * @returns {boolean} Whether notification is enabled
 */
const isNotificationEnabled = (type) => {
  return getPreference('notifications', type) !== false;
};

  // Export for browser environment
  if (typeof window !== 'undefined') {
    window.preferencesService = {
      loadPreferences,
      savePreferences,
      getDefaultPreferences,
      getPreference,
      setPreference,
      formatDate,
      formatTime,
      formatCurrency,
      getItemsPerPage,
      getDefaultView,
      isNotificationEnabled
    };
  }
})();
