import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
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
} from '../utils/currencyFormatter';

// Track unsubscribe functions to clean up
let unsubscribers = [];

// Mock fetch
global.fetch = vi.fn();

describe('Currency Formatter Utility', () => {
  const mockConfig = {
    currency: {
      code: 'USD',
      symbol: '$',
      position: 'before',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    },
    minimumDonation: {
      amount: 5,
      enabled: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockConfig
      })
    });
    // Invalidate cache after fetch mock is in place so getPlatformConfig
    // will use the mocked fetch implementation
    invalidateConfigCache();
  });

  afterEach(() => {
    // Clean up all subscriptions
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    // Clear cache
    invalidateConfigCache();
  });

  describe('formatCurrency', () => {
    it('formats USD currency with default config', async () => {
      const result = await formatCurrency(1234.56);
      expect(result).toBe('$1,234.56');
    });

    it('formats large numbers with thousands separator', async () => {
      const result = await formatCurrency(1234567.89);
      expect(result).toBe('$1,234,567.89');
    });

    it('formats zero correctly', async () => {
      const result = await formatCurrency(0);
      expect(result).toBe('$0.00');
    });

    it('formats small decimals correctly', async () => {
      const result = await formatCurrency(0.99);
      expect(result).toBe('$0.99');
    });

    it('rounds to specified decimal places', async () => {
      const result = await formatCurrency(10.999);
      expect(result).toBe('$11.00');
    });

    it('uses currency after position when configured', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockConfig,
            currency: {
              ...mockConfig.currency,
              position: 'after',
              symbol: '€'
            }
          }
        })
      });
      
      invalidateConfigCache();
      await new Promise(resolve => setTimeout(resolve, 150)); // Wait for config fetch to complete
      const result = await formatCurrency(100);
      expect(result).toBe('100.00€');
    });

    it('accepts custom options to override config', async () => {
      const result = await formatCurrency(1000, {
        symbol: '€',
        position: 'after',
        decimalPlaces: 0
      });
      expect(result).toBe('1,000€');
    });

    it('handles different thousand separators', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockConfig,
            currency: {
              ...mockConfig.currency,
              thousandsSeparator: '.',
              decimalSeparator: ','
            }
          }
        })
      });
      
      invalidateConfigCache();
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await formatCurrency(1234.56);
      expect(result).toBe('$1.234,56');
    });
  });

  describe('formatCurrencySync', () => {
    it('formats currency synchronously with cached config', async () => {
      await initializeCurrencyConfig();
      const result = formatCurrencySync(1234.56);
      expect(result).toBe('$1,234.56');
    });

    it('uses default config when no cached config available', () => {
      invalidateConfigCache();
      const result = formatCurrencySync(100);
      expect(result).toBe('$100.00');
    });

    it('formats large numbers correctly', async () => {
      await initializeCurrencyConfig();
      const result = formatCurrencySync(9876543.21);
      expect(result).toBe('$9,876,543.21');
    });

    it('handles zero', async () => {
      await initializeCurrencyConfig();
      const result = formatCurrencySync(0);
      expect(result).toBe('$0.00');
    });

    it('handles negative numbers', async () => {
      await initializeCurrencyConfig();
      const result = formatCurrencySync(-50.75);
      expect(result).toBe('$-50.75');
    });
  });

  describe('getMinimumDonation', () => {
    it('returns minimum donation config', async () => {
      const result = await getMinimumDonation();
      expect(result).toEqual({
        amount: 5,
        enabled: true
      });
    });

    it('returns config with disabled minimum', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockConfig,
            minimumDonation: {
              amount: 1,
              enabled: false
            }
          }
        })
      });
      
      invalidateConfigCache();
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await getMinimumDonation();
      expect(result).toEqual({
        amount: 1,
        enabled: false
      });
    });
  });

  describe('getCurrencyCode', () => {
    it('returns currency code from config', async () => {
      const result = await getCurrencyCode();
      expect(result).toBe('USD');
    });

    it('returns EUR when configured', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockConfig,
            currency: {
              ...mockConfig.currency,
              code: 'EUR'
            }
          }
        })
      });
      
      invalidateConfigCache();
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await getCurrencyCode();
      expect(result).toBe('EUR');
    });
  });

  describe('getFullConfig', () => {
    it('returns complete configuration object', async () => {
      const result = await getFullConfig();
      expect(result).toEqual(mockConfig);
    });

    it('includes all currency properties', async () => {
      const result = await getFullConfig();
      expect(result.currency).toHaveProperty('code');
      expect(result.currency).toHaveProperty('symbol');
      expect(result.currency).toHaveProperty('position');
      expect(result.currency).toHaveProperty('decimalPlaces');
      expect(result.currency).toHaveProperty('thousandsSeparator');
      expect(result.currency).toHaveProperty('decimalSeparator');
    });

    it('includes minimum donation config', async () => {
      const result = await getFullConfig();
      expect(result.minimumDonation).toHaveProperty('amount');
      expect(result.minimumDonation).toHaveProperty('enabled');
    });
  });

  describe('Config Caching', () => {
    it('fetches config only once with multiple calls', async () => {
      // Clear any previous cache from beforeEach invalidate
      vi.clearAllMocks();
      await getFullConfig();
      await getFullConfig();
      await getFullConfig();
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('uses cached config after first fetch', async () => {
      vi.clearAllMocks();
      await initializeCurrencyConfig();
      const cachedConfig = getCachedConfig();
      
      expect(cachedConfig).toEqual(mockConfig);
    });

    it('invalidates cache and refetches on demand', async () => {
      vi.clearAllMocks();
      await initializeCurrencyConfig();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      invalidateConfigCache();
      await getFullConfig(); // Wait for new config to be fetched
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateConfigCache', () => {
    it('updates cached config without fetching', () => {
      const newConfig = {
        ...mockConfig,
        currency: {
          ...mockConfig.currency,
          code: 'EUR',
          symbol: '€'
        }
      };
      
      updateConfigCache(newConfig);
      const cached = getCachedConfig();
      
      expect(cached.currency.code).toBe('EUR');
      expect(cached.currency.symbol).toBe('€');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('notifies listeners when cache updated', async () => {
      const listenerPromise = new Promise((resolve) => {
        const listener = vi.fn((config) => {
          expect(config.currency.code).toBe('GBP');
          resolve();
        });
        
        const unsub = subscribeToConfigChanges(listener);
        unsubscribers.push(unsub);
        
        updateConfigCache({
          ...mockConfig,
          currency: {
            ...mockConfig.currency,
            code: 'GBP'
          }
        });
      });
      
      await listenerPromise;
    });
  });

  describe('subscribeToConfigChanges', () => {
    it('calls listener immediately with current config', async () => {
      updateConfigCache(mockConfig);
      
      const listenerPromise = new Promise((resolve) => {
        const unsub = subscribeToConfigChanges((config) => {
          expect(config).toEqual(mockConfig);
          resolve();
        });
        unsubscribers.push(unsub);
      });
      
      await listenerPromise;
    });

    it('calls listener when config is updated', async () => {
      let callCount = 0;
      
      const listenerPromise = new Promise((resolve) => {
        const unsub = subscribeToConfigChanges((config) => {
          callCount++;
          if (callCount === 2) {
            expect(config.currency.code).toBe('JPY');
            resolve();
          }
        });
        unsubscribers.push(unsub);
      });
      
      updateConfigCache(mockConfig);
      
      setTimeout(() => {
        updateConfigCache({
          ...mockConfig,
          currency: {
            ...mockConfig.currency,
            code: 'JPY'
          }
        });
      }, 10);
      
      await listenerPromise;
    });

    it('returns unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToConfigChanges(listener);
      unsubscribers.push(unsubscribe);
      
      expect(typeof unsubscribe).toBe('function');
      
      updateConfigCache(mockConfig);
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      updateConfigCache(mockConfig);
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('supports multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      unsubscribers.push(subscribeToConfigChanges(listener1));
      unsubscribers.push(subscribeToConfigChanges(listener2));
      
      updateConfigCache(mockConfig);
      
      expect(listener1).toHaveBeenCalledWith(mockConfig);
      expect(listener2).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('Error Handling', () => {
    it('uses default config on fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      invalidateConfigCache();
      const result = await formatCurrency(100);
      
      // Should still format with default config
      expect(result).toBe('$100.00');
    });

    it('handles invalid JSON response', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });
      
      invalidateConfigCache();
      const result = await formatCurrency(100);
      
      // Should use default config
      expect(result).toBe('$100.00');
    });

    it('handles missing config data in response', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false
        })
      });
      
      invalidateConfigCache();
      const result = await formatCurrency(100);
      
      expect(result).toBe('$100.00');
    });

    it('handles non-ok response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({})
      });
      
      invalidateConfigCache();
      const result = await formatCurrency(100);
      
      expect(result).toBe('$100.00');
    });
  });

  describe('initializeCurrencyConfig', () => {
    it('loads config on initialization', async () => {
      vi.clearAllMocks();
      invalidateConfigCache();
      await initializeCurrencyConfig();
      
      expect(global.fetch).toHaveBeenCalled();
      
      const cached = getCachedConfig();
      expect(cached).toEqual(mockConfig);
    });

    it('can be called multiple times safely', async () => {
      vi.clearAllMocks();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig
      });
      
      await initializeCurrencyConfig();
      await initializeCurrencyConfig();
      await initializeCurrencyConfig();
      
      // Should only fetch once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Browser Events', () => {
    it('dispatches platformConfigUpdated event on cache update', async () => {
      const eventListener = (event) => {
        expect(event.detail).toEqual(mockConfig);
      };
      
      window.addEventListener('platformConfigUpdated', eventListener);
      
      updateConfigCache(mockConfig);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      window.removeEventListener('platformConfigUpdated', eventListener);
    });

    it('dispatches event when config invalidated and refetched', async () => {
      const eventListener = vi.fn();
      window.addEventListener('platformConfigUpdated', eventListener);
      
      invalidateConfigCache();
      await getFullConfig();
      
      expect(eventListener).toHaveBeenCalled();
      
      window.removeEventListener('platformConfigUpdated', eventListener);
    });
  });

  describe('Edge Cases', () => {
    it('handles very large numbers', async () => {
      const result = await formatCurrency(999999999999.99);
      expect(result).toBe('$999,999,999,999.99');
    });

    it('handles very small decimals', async () => {
      const result = await formatCurrency(0.01);
      expect(result).toBe('$0.01');
    });

    it('handles numbers with many decimal places', async () => {
      const result = await formatCurrency(10.12345678);
      expect(result).toBe('$10.12'); // Should round to 2 decimal places
    });

    it('handles zero decimal places', async () => {
      const result = await formatCurrency(100, { decimalPlaces: 0 });
      expect(result).toBe('$100');
    });

    it('handles different decimal separators', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockConfig,
            currency: {
              ...mockConfig.currency,
              decimalSeparator: ',',
              thousandsSeparator: ' '
            }
          }
        })
      });
      
      invalidateConfigCache();
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await formatCurrency(1234.56);
      expect(result).toBe('$1 234,56');
    });
  });
});
