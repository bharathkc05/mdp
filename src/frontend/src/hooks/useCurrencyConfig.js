/**
 * useCurrencyConfig Hook
 * OPTIMIZED: Provides instant currency updates to React components
 * No need to manually subscribe/unsubscribe or invalidate cache
 */

import { useState, useEffect } from 'react';
import { 
  getCachedConfig, 
  subscribeToConfigChanges,
  formatCurrencySync as baseCurrencySync
} from './currencyFormatter';

/**
 * React hook for currency configuration
 * Automatically updates when configuration changes
 * 
 * @returns {Object} - { config, formatCurrency, isLoading }
 * 
 * @example
 * function MyComponent() {
 *   const { config, formatCurrency } = useCurrencyConfig();
 *   return <div>{formatCurrency(100)}</div>;
 * }
 */
export function useCurrencyConfig() {
  const [config, setConfig] = useState(getCachedConfig());
  const [isLoading, setIsLoading] = useState(!config);

  useEffect(() => {
    // Subscribe to config changes
    const unsubscribe = subscribeToConfigChanges((newConfig) => {
      setConfig(newConfig);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Provide a ready-to-use formatCurrency function
  const formatCurrency = (amount) => baseCurrencySync(amount);

  return {
    config,
    formatCurrency,
    currencySymbol: config?.currency?.symbol || '$',
    currencyCode: config?.currency?.code || 'USD',
    minimumDonation: config?.minimumDonation?.amount || 1,
    isLoading
  };
}

export default useCurrencyConfig;
