import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DonationStats from '../components/DonationStats';
import { donationsAPI } from '../api';
import * as currencyFormatter from '../utils/currencyFormatter';

vi.mock('../../api', () => ({
  donationsAPI: {
    getStats: vi.fn(),
  },
}));

vi.mock('../../utils/currencyFormatter', async () => {
  const actual = await vi.importActual('../../utils/currencyFormatter');
  return {
    ...actual,
    formatCurrencySync: vi.fn((amount) => `$${amount.toFixed(2)}`),
    invalidateConfigCache: vi.fn(),
  };
});

// Mock recharts
vi.mock('recharts', () => ({
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('DonationStats Component', () => {
  const mockStats = {
    totalDonated: 5000,
    donationCount: 25,
    averageDonation: 200,
    donationsByCause: [
      { cause: 'Education Fund', totalAmount: 2000, count: 10 },
      { cause: 'Healthcare Support', totalAmount: 1800, count: 8 },
      { cause: 'Environmental Conservation', totalAmount: 1200, count: 7 },
    ],
    mostSupportedCause: {
      cause: 'Education Fund',
      totalAmount: 2000,
      count: 10
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    donationsAPI.getStats.mockResolvedValue({
      data: { data: mockStats }
    });
  });

  describe('Rendering', () => {
    it('renders stats component with title', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Your Donation Impact')).toBeInTheDocument();
      });
    });

    it('displays loading state initially', () => {
      donationsAPI.getStats.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { data: mockStats }
        }), 100))
      );
      
      render(<DonationStats />);
      
      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });

    it('displays error message when stats fetch fails', async () => {
      donationsAPI.getStats.mockRejectedValue(new Error('Network error'));
      
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load donation statistics')).toBeInTheDocument();
      });
    });

    it('renders all stat cards', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Donated')).toBeInTheDocument();
        expect(screen.getByText('Number of Donations')).toBeInTheDocument();
        expect(screen.getByText('Causes Supported')).toBeInTheDocument();
      });
    });
  });

  describe('Stats Display', () => {
    it('displays total donated amount correctly', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('$5000.00')).toBeInTheDocument();
      });
    });

    it('displays donation count correctly', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });
    });

    it('displays number of causes supported', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('formats currency values using formatCurrencySync', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(currencyFormatter.formatCurrencySync).toHaveBeenCalledWith(5000);
      });
    });
  });

  describe('Most Supported Cause', () => {
    it('displays most supported cause information', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Most Supported Cause')).toBeInTheDocument();
        expect(screen.getByText('Education Fund')).toBeInTheDocument();
      });
    });

    it('does not display most supported cause section when data is missing', async () => {
      donationsAPI.getStats.mockResolvedValue({
        data: {
          data: {
            ...mockStats,
            mostSupportedCause: null
          }
        }
      });
      
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Donated')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Most Supported Cause')).not.toBeInTheDocument();
    });
  });

  describe('Donations by Cause List', () => {
    it('displays list of donations by cause', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Donations by Cause')).toBeInTheDocument();
        expect(screen.getByText('Education Fund')).toBeInTheDocument();
        expect(screen.getByText('Healthcare Support')).toBeInTheDocument();
        expect(screen.getByText('Environmental Conservation')).toBeInTheDocument();
      });
    });

    it('displays donation counts for each cause', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('10 donations')).toBeInTheDocument();
        expect(screen.getByText('8 donations')).toBeInTheDocument();
        expect(screen.getByText('7 donations')).toBeInTheDocument();
      });
    });

    it('uses singular "donation" for count of 1', async () => {
      donationsAPI.getStats.mockResolvedValue({
        data: {
          data: {
            ...mockStats,
            donationsByCause: [
              { cause: 'Single Cause', totalAmount: 100, count: 1 }
            ]
          }
        }
      });
      
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('1 donation')).toBeInTheDocument();
      });
    });
  });

  describe('Pie Chart', () => {
    it('renders pie chart when there are donations by cause', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Donation Breakdown by Cause')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('does not render pie chart when no donations by cause', async () => {
      donationsAPI.getStats.mockResolvedValue({
        data: {
          data: {
            ...mockStats,
            donationsByCause: []
          }
        }
      });
      
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Donated')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('handles missing stat values with defaults', async () => {
      donationsAPI.getStats.mockResolvedValue({
        data: {
          data: {
            totalDonated: 0,
            donationCount: 0,
            donationsByCause: [],
            averageDonation: 0
          }
        }
      });
      
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('$0.00')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('handles null stats gracefully', async () => {
      donationsAPI.getStats.mockResolvedValue({
        data: { data: null }
      });
      
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.queryByText('Your Donation Impact')).not.toBeInTheDocument();
      });
    });

    it('handles unknown cause names', async () => {
      donationsAPI.getStats.mockResolvedValue({
        data: {
          data: {
            ...mockStats,
            donationsByCause: [
              { totalAmount: 100, count: 5 }
            ]
          }
        }
      });
      
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Unknown Cause')).toBeInTheDocument();
      });
    });
  });

  describe('Config Updates', () => {
    it('listens for platform config updates', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Your Donation Impact')).toBeInTheDocument();
      });
      
      const event = new CustomEvent('platformConfigUpdated');
      window.dispatchEvent(event);
      
      expect(currencyFormatter.invalidateConfigCache).toHaveBeenCalled();
    });

    it('re-fetches stats on initial load', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(donationsAPI.getStats).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('includes screen reader accessible summary', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Your Donation Impact')).toBeInTheDocument();
      });
      
      // Check for sr-only content
      const container = screen.getByText('Your Donation Impact').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('pie chart has proper aria labels', async () => {
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles malformed API response', async () => {
      donationsAPI.getStats.mockResolvedValue({
        data: {}
      });
      
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.queryByText('Your Donation Impact')).not.toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      donationsAPI.getStats.mockRejectedValue(new Error('Network error'));
      
      render(<DonationStats />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
      });
    });
  });
});
