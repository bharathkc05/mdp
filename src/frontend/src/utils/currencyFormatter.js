/**
 * Story 2.6: Currency Formatting Utility
 * Formats monetary values based on platform configuration
 * OPTIMIZED: Instant updates with in-memory cache and event broadcasting
 */

let cachedConfig = null;
let configPromise = null;
let configListeners = new Set();
let isInitialized = false;

// Default configuration fallback
const DEFAULT_CONFIG = {
  currency: {
    code: 'USD',
    symbol: '$',
    position: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  minimumDonation: {
    amount: 1,
    enabled: true
  }
};

/**
 * Fetch and cache platform configuration
 * SINGLETON: Only one fetch will ever be in-flight at a time
 */
async function getPlatformConfig() {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // If a fetch is already in progress, wait for it
  if (configPromise) {
    return configPromise;
  }

  // Prevent multiple simultaneous fetches
  configPromise = fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/config`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch platform config');
      }
      return response.json();
    })
    .then(data => {
      if (data.success && data.data) {
        cachedConfig = data.data;
        isInitialized = true;
        notifyConfigUpdate(cachedConfig);
        return cachedConfig;
      }
      throw new Error('Invalid config response');
    })
    .catch(error => {
      console.error('Error fetching platform config:', error);
      // Use cached config if available, otherwise return default
      if (cachedConfig) {
        return cachedConfig;
      }
      cachedConfig = DEFAULT_CONFIG;
      isInitialized = true;
      return cachedConfig;
    })
    .finally(() => {
      // Don't clear configPromise immediately to prevent race conditions
      // Clear after a small delay to ensure all waiting callers get the result
      setTimeout(() => {
        configPromise = null;
      }, 100);
    });

  return configPromise;
}

/**
 * Notify all listeners of config update
 */
function notifyConfigUpdate(config) {
  // Browser event for backward compatibility
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('platformConfigUpdated', { 
      detail: config 
    }));
  }
  
  // Direct listener callbacks for instant updates
  configListeners.forEach(callback => {
    try {
      callback(config);
    } catch (err) {
      console.error('Error in config listener:', err);
    }
  });
}

/**
 * Subscribe to config changes (returns unsubscribe function)
 * OPTIMIZED: Instant updates without re-fetching
 */
export function subscribeToConfigChanges(callback) {
  configListeners.add(callback);
  
  // Immediately call with current config if available
  if (cachedConfig) {
    try {
      callback(cachedConfig);
    } catch (err) {
      console.error('Error in config listener:', err);
    }
  }
  
  // Return unsubscribe function
  return () => {
    configListeners.delete(callback);
  };
}

/**
 * Invalidate the cached config and fetch fresh data
 * OPTIMIZED: Also broadcasts update to all listeners
 */
export function invalidateConfigCache() {
  cachedConfig = null;
  // Immediately fetch fresh config and notify listeners
  getPlatformConfig().then(config => {
    notifyConfigUpdate(config);
  });
}

/**
 * Update config in cache without fetching (for instant updates after admin save)
 * OPTIMIZED: Instant propagation without server round-trip
 */
export function updateConfigCache(newConfig) {
  cachedConfig = newConfig;
  notifyConfigUpdate(newConfig);
}

/**
 * Format a number with thousands separator
 */
function formatNumberWithSeparators(num, decimalPlaces, thousandsSeparator, decimalSeparator) {
  // Round to specified decimal places
  const fixed = num.toFixed(decimalPlaces);
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = fixed.split('.');
  
  // Add thousands separator
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  
  // Combine with decimal part if needed
  if (decimalPlaces > 0 && decimalPart) {
    return `${formattedInteger}${decimalSeparator}${decimalPart}`;
  }
  
  return formattedInteger;
}

/**
 * Format a monetary value according to platform configuration
 * @param {number} amount - The amount to format
 * @param {Object} options - Optional overrides for formatting
 * @returns {Promise<string>} - Formatted currency string
 */
export async function formatCurrency(amount, options = {}) {
  const config = await getPlatformConfig();
  const currency = config.currency;
  
  // Allow options to override config
  const symbol = options.symbol || currency.symbol;
  const position = options.position || currency.position;
  const decimalPlaces = options.decimalPlaces !== undefined ? options.decimalPlaces : currency.decimalPlaces;
  const thousandsSeparator = options.thousandsSeparator || currency.thousandsSeparator;
  const decimalSeparator = options.decimalSeparator || currency.decimalSeparator;
  
  // Format the number
  const formattedNumber = formatNumberWithSeparators(
    amount, 
    decimalPlaces, 
    thousandsSeparator, 
    decimalSeparator
  );
  
  // Position the currency symbol
  if (position === 'after') {
    return `${formattedNumber}${symbol}`;
  } else {
    return `${symbol}${formattedNumber}`;
  }
}

/**
 * Get the minimum donation amount from config
 * @returns {Promise<Object>} - { amount: number, enabled: boolean }
 */
export async function getMinimumDonation() {
  const config = await getPlatformConfig();
  return config.minimumDonation;
}

/**
 * Get the currency code
 * @returns {Promise<string>} - Currency code (e.g., 'USD', 'EUR')
 */
export async function getCurrencyCode() {
  const config = await getPlatformConfig();
  return config.currency.code;
}

/**
 * Get the full platform configuration
 * @returns {Promise<Object>} - Full config object
 */
export async function getFullConfig() {
  return getPlatformConfig();
}

/**
 * Synchronous version that uses cached config (returns default if not loaded)
 * Use this for immediate rendering, but prefer async version when possible
 * OPTIMIZED: Falls back gracefully if config not loaded
 */
export function formatCurrencySync(amount) {
  const config = cachedConfig || DEFAULT_CONFIG;
  const currency = config.currency;
  
  const formattedNumber = formatNumberWithSeparators(
    amount, 
    currency.decimalPlaces, 
    currency.thousandsSeparator, 
    currency.decimalSeparator
  );
  
  if (currency.position === 'after') {
    return `${formattedNumber}${currency.symbol}`;
  } else {
    return `${currency.symbol}${formattedNumber}`;
  }
}

/**
 * Hook to load configuration on app initialization
 * Call this in your main App component
 */
export async function initializeCurrencyConfig() {
  await getPlatformConfig();
}

/**
 * Get current cached config synchronously (or default)
 * OPTIMIZED: For React hooks and instant access
 */
export function getCachedConfig() {
  return cachedConfig || DEFAULT_CONFIG;
}

export default {
  formatCurrency,
  formatCurrencySync,
  getMinimumDonation,
  getCurrencyCode,
  getFullConfig,
  initializeCurrencyConfig,
  invalidateConfigCache,
  updateConfigCache,
  subscribeToConfigChanges,
  getCachedConfig
};
