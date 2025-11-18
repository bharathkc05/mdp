import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrencyConfig } from '../hooks/useCurrencyConfig';
import * as currencyFormatter from '../utils/currencyFormatter';

vi.mock('../../utils/currencyFormatter', async () => {
  const actual = await vi.importActual('../../utils/currencyFormatter');
  return {
    ...actual,
    getCachedConfig: vi.fn(),
    subscribeToConfigChanges: vi.fn((callback) => {
      // Immediately call with mock config
      callback({
        currency: {
          code: 'USD',
          symbol: '$',
          position: 'before',
          decimalPlaces: 2
        },
        minimumDonation: { amount: 5, enabled: true }
      });
      // Return unsubscribe function
      return vi.fn();
    }),
    formatCurrencySync: vi.fn((amount) => `$${amount.toFixed(2)}`),
  };
});

describe('useCurrencyConfig Hook', () => {
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
    currencyFormatter.getCachedConfig.mockReturnValue(mockConfig);
  });

  describe('Hook Initialization', () => {
    it('returns config object', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.config).toBeDefined();
      expect(result.current.config.currency).toBeDefined();
    });

    it('returns formatCurrency function', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(typeof result.current.formatCurrency).toBe('function');
    });

    it('returns currency symbol', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencySymbol).toBe('$');
    });

    it('returns currency code', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencyCode).toBe('USD');
    });

    it('returns minimum donation amount', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.minimumDonation).toBe(5);
    });

    it('returns loading state', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(typeof result.current.isLoading).toBe('boolean');
    });
  });

  describe('Config Loading', () => {
    it('starts with loading true when no cached config', () => {
      currencyFormatter.getCachedConfig.mockReturnValueOnce(null);
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.isLoading).toBe(true);
    });

    it('sets loading false when config is available', async () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('loads cached config immediately', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.config).toEqual(mockConfig);
    });
  });

  describe('Config Subscription', () => {
    it('subscribes to config changes on mount', () => {
      renderHook(() => useCurrencyConfig());
      
      expect(currencyFormatter.subscribeToConfigChanges).toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const unsubscribeMock = vi.fn();
      currencyFormatter.subscribeToConfigChanges.mockReturnValue(unsubscribeMock);
      
      const { unmount } = renderHook(() => useCurrencyConfig());
      unmount();
      
      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('updates config when subscription fires', async () => {
      const newConfig = {
        ...mockConfig,
        currency: {
          ...mockConfig.currency,
          code: 'EUR',
          symbol: '€'
        }
      };
      
      let subscriptionCallback;
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        subscriptionCallback = callback;
        callback(mockConfig);
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencyCode).toBe('USD');
      
      // Simulate config update
      subscriptionCallback(newConfig);
      
      await waitFor(() => {
        expect(result.current.currencyCode).toBe('EUR');
      });
    });
  });

  describe('formatCurrency Function', () => {
    it('formats currency correctly', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      const formatted = result.current.formatCurrency(100);
      expect(formatted).toBe('$100.00');
    });

    it('handles zero', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      const formatted = result.current.formatCurrency(0);
      expect(formatted).toBe('$0.00');
    });

    it('handles negative numbers', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      const formatted = result.current.formatCurrency(-50);
      expect(formatted).toBe('$-50.00');
    });

    it('handles large numbers', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      const formatted = result.current.formatCurrency(1234567);
      expect(formatted).toBe('$1234567.00');
    });

    it('handles decimal values', () => {
      const { result } = renderHook(() => useCurrencyConfig());
      
      const formatted = result.current.formatCurrency(99.99);
      expect(formatted).toBe('$99.99');
    });
  });

  describe('Default Values', () => {
    it('provides default currency symbol when config missing', () => {
      currencyFormatter.getCachedConfig.mockReturnValue(null);
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        callback(null);
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencySymbol).toBe('$');
    });

    it('provides default currency code when config missing', () => {
      currencyFormatter.getCachedConfig.mockReturnValue(null);
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        callback(null);
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencyCode).toBe('USD');
    });

    it('provides default minimum donation when config missing', () => {
      currencyFormatter.getCachedConfig.mockReturnValue(null);
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        callback(null);
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.minimumDonation).toBe(1);
    });
  });

  describe('Config Updates', () => {
    it('updates all values when config changes', async () => {
      let subscriptionCallback;
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        subscriptionCallback = callback;
        callback(mockConfig);
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencyCode).toBe('USD');
      expect(result.current.minimumDonation).toBe(5);
      
      const newConfig = {
        currency: {
          code: 'GBP',
          symbol: '£',
          position: 'before',
          decimalPlaces: 2
        },
        minimumDonation: { amount: 10, enabled: true }
      };
      
      subscriptionCallback(newConfig);
      
      await waitFor(() => {
        expect(result.current.currencyCode).toBe('GBP');
        expect(result.current.currencySymbol).toBe('£');
        expect(result.current.minimumDonation).toBe(10);
      });
    });

    it('sets loading to false after first config received', async () => {
      currencyFormatter.getCachedConfig.mockReturnValueOnce(null);
      
      let subscriptionCallback;
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        subscriptionCallback = callback;
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.isLoading).toBe(true);
      
      subscriptionCallback(mockConfig);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Different Currency Configurations', () => {
    it('handles EUR configuration', async () => {
      const eurConfig = {
        currency: {
          code: 'EUR',
          symbol: '€',
          position: 'after',
          decimalPlaces: 2
        },
        minimumDonation: { amount: 5, enabled: true }
      };
      
      currencyFormatter.getCachedConfig.mockReturnValue(eurConfig);
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        callback(eurConfig);
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencyCode).toBe('EUR');
      expect(result.current.currencySymbol).toBe('€');
    });

    it('handles GBP configuration', async () => {
      const gbpConfig = {
        currency: {
          code: 'GBP',
          symbol: '£',
          position: 'before',
          decimalPlaces: 2
        },
        minimumDonation: { amount: 2, enabled: true }
      };
      
      currencyFormatter.getCachedConfig.mockReturnValue(gbpConfig);
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        callback(gbpConfig);
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencyCode).toBe('GBP');
      expect(result.current.currencySymbol).toBe('£');
      expect(result.current.minimumDonation).toBe(2);
    });

    it('handles disabled minimum donation', async () => {
      const configWithDisabled = {
        ...mockConfig,
        minimumDonation: { amount: 0, enabled: false }
      };
      
      currencyFormatter.getCachedConfig.mockReturnValue(configWithDisabled);
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        callback(configWithDisabled);
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.minimumDonation).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles partial config gracefully', () => {
      const partialConfig = {
        currency: { code: 'USD' }
      };
      
      currencyFormatter.getCachedConfig.mockReturnValue(partialConfig);
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        callback(partialConfig);
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencyCode).toBe('USD');
      expect(result.current.currencySymbol).toBe('$'); // Default
    });

    it('handles empty config object', () => {
      currencyFormatter.getCachedConfig.mockReturnValue({});
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        callback({});
        return vi.fn();
      });
      
      const { result } = renderHook(() => useCurrencyConfig());
      
      expect(result.current.currencySymbol).toBe('$');
      expect(result.current.currencyCode).toBe('USD');
      expect(result.current.minimumDonation).toBe(1);
    });

    it('handles subscription errors gracefully', () => {
      currencyFormatter.subscribeToConfigChanges.mockImplementation(() => {
        throw new Error('Subscription error');
      });
      
      // Should not throw
      expect(() => renderHook(() => useCurrencyConfig())).not.toThrow();
    });
  });

  describe('Multiple Hook Instances', () => {
    it('all instances receive config updates', async () => {
      let subscriptionCallback;
      currencyFormatter.subscribeToConfigChanges.mockImplementation((callback) => {
        subscriptionCallback = callback;
        callback(mockConfig);
        return vi.fn();
      });
      
      const { result: result1 } = renderHook(() => useCurrencyConfig());
      const { result: result2 } = renderHook(() => useCurrencyConfig());
      
      expect(result1.current.currencyCode).toBe('USD');
      expect(result2.current.currencyCode).toBe('USD');
      
      const newConfig = {
        ...mockConfig,
        currency: { ...mockConfig.currency, code: 'EUR' }
      };
      
      subscriptionCallback(newConfig);
      
      await waitFor(() => {
        expect(result1.current.currencyCode).toBe('EUR');
        expect(result2.current.currencyCode).toBe('EUR');
      });
    });
  });
});
