/**
 * Story 2.6: Currency Formatting Utility
 * Formats monetary values based on platform configuration
 */

let cachedConfig = null;
let configPromise = null;

/**
 * Fetch and cache platform configuration
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

  // Fetch configuration
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
        // Notify all listeners that config has been loaded
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('platformConfigUpdated'));
        }
        return cachedConfig;
      }
      throw new Error('Invalid config response');
    })
    .catch(error => {
      console.error('Error fetching platform config:', error);
      // Return default config on error
      return {
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
    })
    .finally(() => {
      configPromise = null;
    });

  return configPromise;
}

/**
 * Invalidate the cached config (call this when config is updated)
 */
export function invalidateConfigCache() {
  cachedConfig = null;
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
 */
export function formatCurrencySync(amount) {
  if (!cachedConfig) {
    // Return simple format if config not loaded yet
    return `$${amount.toFixed(2)}`;
  }
  
  const currency = cachedConfig.currency;
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

export default {
  formatCurrency,
  formatCurrencySync,
  getMinimumDonation,
  getCurrencyCode,
  getFullConfig,
  initializeCurrencyConfig,
  invalidateConfigCache
};
