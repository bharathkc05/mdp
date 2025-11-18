import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCurrency,
  usePlatformConfig,
  useMinimumDonation,
  useCurrencyCode,
  CurrencyDisplay
} from '../utils/useCurrency';
import { render, screen } from '@testing-library/react';
import * as currencyFormatter from '../utils/currencyFormatter';

vi.mock('../../utils/currencyFormatter', async () => {
  const actual = await vi.importActual('../../utils/currencyFormatter');
  return {
    ...actual,
    formatCurrency: vi.fn(async (amount) => `$${amount.toFixed(2)}`),
    formatCurrencySync: vi.fn((amount) => `$${amount.toFixed(2)}`),
    getMinimumDonation: vi.fn(async () => ({ amount: 5, enabled: true })),
    getCurrencyCode: vi.fn(async () => 'USD'),
    getFullConfig: vi.fn(async () => ({
      currency: {
        code: 'USD',
        symbol: '$',
        position: 'before',
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.'
      },
      minimumDonation: { amount: 5, enabled: true }
    })),
    invalidateConfigCache: vi.fn(),
  };
});

describe('useCurrency Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCurrency', () => {
    it('formats currency value', async () => {
      const { result } = renderHook(() => useCurrency(100));
      
      await waitFor(() => {
        expect(result.current).toBe('$100.00');
      });
    });

    it('handles zero value', async () => {
      const { result } = renderHook(() => useCurrency(0));
      
      await waitFor(() => {
        expect(result.current).toBe('$0.00');
      });
    });

    it('handles null value', () => {
      const { result } = renderHook(() => useCurrency(null));
      
      expect(result.current).toBeDefined();
    });

    it('handles undefined value', () => {
      const { result } = renderHook(() => useCurrency(undefined));
      
      expect(result.current).toBeDefined();
    });

    it('updates when amount changes', async () => {
      const { result, rerender } = renderHook(
        ({ amount }) => useCurrency(amount),
        { initialProps: { amount: 100 } }
      );
      
      await waitFor(() => {
        expect(result.current).toBe('$100.00');
      });
      
      rerender({ amount: 200 });
      
      await waitFor(() => {
        expect(result.current).toBe('$200.00');
      });
    });

    it('listens to config update events', async () => {
      const { result } = renderHook(() => useCurrency(100));
      
      await waitFor(() => {
        expect(result.current).toBe('$100.00');
      });
      
      // Trigger config update event
      const event = new CustomEvent('platformConfigUpdated');
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(currencyFormatter.invalidateConfigCache).toHaveBeenCalled();
      });
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useCurrency(100));
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'platformConfigUpdated',
        expect.any(Function)
      );
      
      removeEventListenerSpy.mockRestore();
    });

    it('handles large numbers', async () => {
      const { result } = renderHook(() => useCurrency(1234567.89));
      
      await waitFor(() => {
        expect(result.current).toBe('$1234567.89');
      });
    });

    it('handles negative numbers', async () => {
      const { result } = renderHook(() => useCurrency(-50.25));
      
      await waitFor(() => {
        expect(result.current).toBe('$-50.25');
      });
    });
  });

  describe('usePlatformConfig', () => {
    it('loads platform configuration', async () => {
      const { result } = renderHook(() => usePlatformConfig());
      
      expect(result.current.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.config).toBeDefined();
      expect(result.current.config.currency).toBeDefined();
    });

    it('provides currency configuration', async () => {
      const { result } = renderHook(() => usePlatformConfig());
      
      await waitFor(() => {
        expect(result.current.config?.currency?.code).toBe('USD');
      });
    });

    it('provides minimum donation configuration', async () => {
      const { result } = renderHook(() => usePlatformConfig());
      
      await waitFor(() => {
        expect(result.current.config?.minimumDonation?.amount).toBe(5);
      });
    });

    it('handles loading errors', async () => {
      currencyFormatter.getFullConfig.mockRejectedValueOnce(new Error('Load error'));
      
      const { result } = renderHook(() => usePlatformConfig());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.error).toBeDefined();
    });

    it('updates on config change events', async () => {
      const { result } = renderHook(() => usePlatformConfig());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Mock updated config
      currencyFormatter.getFullConfig.mockResolvedValueOnce({
        currency: {
          code: 'EUR',
          symbol: '€',
          position: 'after',
          decimalPlaces: 2,
          thousandsSeparator: '.',
          decimalSeparator: ','
        },
        minimumDonation: { amount: 10, enabled: true }
      });
      
      const event = new CustomEvent('platformConfigUpdated', {
        detail: {
          currency: { code: 'EUR' }
        }
      });
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(currencyFormatter.invalidateConfigCache).toHaveBeenCalled();
      });
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => usePlatformConfig());
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'platformConfigUpdated',
        expect.any(Function)
      );
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('useMinimumDonation', () => {
    it('loads minimum donation configuration', async () => {
      const { result } = renderHook(() => useMinimumDonation());
      
      expect(result.current.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.minDonation).toEqual({
        amount: 5,
        enabled: true
      });
    });

    it('handles disabled minimum donation', async () => {
      currencyFormatter.getMinimumDonation.mockResolvedValueOnce({
        amount: 1,
        enabled: false
      });
      
      const { result } = renderHook(() => useMinimumDonation());
      
      await waitFor(() => {
        expect(result.current.minDonation.enabled).toBe(false);
      });
    });

    it('handles loading errors gracefully', async () => {
      currencyFormatter.getMinimumDonation.mockRejectedValueOnce(
        new Error('Load error')
      );
      
      const { result } = renderHook(() => useMinimumDonation());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Should have default values
      expect(result.current.minDonation).toBeDefined();
    });

    it('updates on config change events', async () => {
      const { result } = renderHook(() => useMinimumDonation());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      currencyFormatter.getMinimumDonation.mockResolvedValueOnce({
        amount: 10,
        enabled: true
      });
      
      const event = new CustomEvent('platformConfigUpdated');
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(currencyFormatter.invalidateConfigCache).toHaveBeenCalled();
      });
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useMinimumDonation());
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'platformConfigUpdated',
        expect.any(Function)
      );
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('useCurrencyCode', () => {
    it('loads currency code', async () => {
      const { result } = renderHook(() => useCurrencyCode());
      
      await waitFor(() => {
        expect(result.current).toBe('USD');
      });
    });

    it('updates when config changes', async () => {
      const { result } = renderHook(() => useCurrencyCode());
      
      await waitFor(() => {
        expect(result.current).toBe('USD');
      });
      
      currencyFormatter.getCurrencyCode.mockResolvedValueOnce('EUR');
      
      const event = new CustomEvent('platformConfigUpdated');
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(currencyFormatter.invalidateConfigCache).toHaveBeenCalled();
      });
    });

    it('has default value before loading', () => {
      const { result } = renderHook(() => useCurrencyCode());
      
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('string');
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useCurrencyCode());
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'platformConfigUpdated',
        expect.any(Function)
      );
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe.skip('CurrencyDisplay Component', () => {
    it('renders formatted currency', async () => {
      render(<CurrencyDisplay amount={100} />);
      
      await waitFor(() => {
        expect(screen.getByText('$100.00')).toBeInTheDocument();
      });
    });

    it('applies custom className', async () => {
      render(<CurrencyDisplay amount={100} className="text-bold text-green" />);
      
      await waitFor(() => {
        const element = screen.getByText('$100.00');
        expect(element).toHaveClass('text-bold');
        expect(element).toHaveClass('text-green');
      });
    });

    it('handles zero amount', async () => {
      render(<CurrencyDisplay amount={0} />);
      
      await waitFor(() => {
        expect(screen.getByText('$0.00')).toBeInTheDocument();
      });
    });

    it('handles negative amount', async () => {
      render(<CurrencyDisplay amount={-50} />);
      
      await waitFor(() => {
        expect(screen.getByText('$-50.00')).toBeInTheDocument();
      });
    });

    it('updates when amount changes', async () => {
      const { rerender } = render(<CurrencyDisplay amount={100} />);
      
      await waitFor(() => {
        expect(screen.getByText('$100.00')).toBeInTheDocument();
      });
      
      rerender(<CurrencyDisplay amount={200} />);
      
      await waitFor(() => {
        expect(screen.getByText('$200.00')).toBeInTheDocument();
      });
    });
  });

  describe('Hook Integration', () => {
    it('all hooks work together', async () => {
      const { result: currencyResult } = renderHook(() => useCurrency(100));
      const { result: configResult } = renderHook(() => usePlatformConfig());
      const { result: minDonationResult } = renderHook(() => useMinimumDonation());
      const { result: codeResult } = renderHook(() => useCurrencyCode());
      
      await waitFor(() => {
        expect(currencyResult.current).toBe('$100.00');
        expect(configResult.current.loading).toBe(false);
        expect(minDonationResult.current.loading).toBe(false);
        expect(codeResult.current).toBe('USD');
      });
    });

    it('all hooks respond to config updates', async () => {
      renderHook(() => useCurrency(100));
      renderHook(() => usePlatformConfig());
      renderHook(() => useMinimumDonation());
      renderHook(() => useCurrencyCode());
      
      await waitFor(() => {
        expect(currencyFormatter.formatCurrency).toHaveBeenCalled();
      });
      
      const event = new CustomEvent('platformConfigUpdated');
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(currencyFormatter.invalidateConfigCache).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid amount changes', async () => {
      const { result, rerender } = renderHook(
        ({ amount }) => useCurrency(amount),
        { initialProps: { amount: 100 } }
      );
      
      for (let i = 1; i <= 10; i++) {
        rerender({ amount: i * 10 });
      }
      
      await waitFor(() => {
        expect(result.current).toBe('$100.00');
      });
    });

    it('handles very large numbers', async () => {
      const { result } = renderHook(() => useCurrency(999999999));
      
      await waitFor(() => {
        expect(result.current).toBe('$999999999.00');
      });
    });

    it('handles decimal precision', async () => {
      const { result } = renderHook(() => useCurrency(123.456789));
      
      await waitFor(() => {
        expect(result.current).toBe('$123.46');
      });
    });
  });
});
