/**
 * Story 2.6: React Hook for Currency Formatting
 * Custom hook to use currency formatting in React components
 */

import { useState, useEffect } from 'react';
import { 
  formatCurrency, 
  formatCurrencySync, 
  getMinimumDonation, 
  getCurrencyCode,
  getFullConfig,
  invalidateConfigCache
} from './currencyFormatter';

/**
 * Hook to use formatted currency in components
 * Returns formatted value as a string
 */
export function useCurrency(amount) {
  const [formatted, setFormatted] = useState(formatCurrencySync(amount));

  useEffect(() => {
    const updateFormatting = () => {
      if (amount !== null && amount !== undefined) {
        formatCurrency(amount).then(setFormatted);
      }
    };

    updateFormatting();

    // Listen for config updates
    const handleConfigUpdate = () => {
      invalidateConfigCache();
      updateFormatting();
    };

    window.addEventListener('platformConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('platformConfigUpdated', handleConfigUpdate);
  }, [amount]);

  return formatted;
}

/**
 * Hook to get platform configuration
 */
export function usePlatformConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConfig = () => {
      setLoading(true);
      getFullConfig()
        .then(data => {
          setConfig(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err);
          setLoading(false);
        });
    };

    loadConfig();

    // Listen for config updates
    const handleConfigUpdate = (event) => {
      invalidateConfigCache();
      if (event.detail) {
        setConfig(event.detail);
      } else {
        loadConfig();
      }
    };

    window.addEventListener('platformConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('platformConfigUpdated', handleConfigUpdate);
  }, []);

  return { config, loading, error };
}

/**
 * Hook to get minimum donation configuration
 */
export function useMinimumDonation() {
  const [minDonation, setMinDonation] = useState({ amount: 1, enabled: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMinDonation = () => {
      getMinimumDonation()
        .then(data => {
          setMinDonation(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch minimum donation:', err);
          setLoading(false);
        });
    };

    loadMinDonation();

    // Listen for config updates
    const handleConfigUpdate = () => {
      invalidateConfigCache();
      loadMinDonation();
    };

    window.addEventListener('platformConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('platformConfigUpdated', handleConfigUpdate);
  }, []);

  return { minDonation, loading };
}

/**
 * Hook to get currency code
 */
export function useCurrencyCode() {
  const [currencyCode, setCurrencyCode] = useState('USD');

  useEffect(() => {
    const loadCurrencyCode = () => {
      getCurrencyCode().then(setCurrencyCode);
    };

    loadCurrencyCode();

    // Listen for config updates
    const handleConfigUpdate = () => {
      invalidateConfigCache();
      loadCurrencyCode();
    };

    window.addEventListener('platformConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('platformConfigUpdated', handleConfigUpdate);
  }, []);

  return currencyCode;
}

/**
 * Currency formatter component for simple use cases
 */
export function CurrencyDisplay({ amount, className = '' }) {
  const formatted = useCurrency(amount);
  return <span className={className}>{formatted}</span>;
}

export default {
  useCurrency,
  usePlatformConfig,
  useMinimumDonation,
  useCurrencyCode,
  CurrencyDisplay
};
