import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminAnalyticsDashboard from '../pages/AdminAnalyticsDashboard';
import { dashboardAPI } from '../api';

vi.mock('../../api', () => ({
  dashboardAPI: {
    getAggregatedDonations: vi.fn(),
    getDonationTrends: vi.fn(),
    getCategoryBreakdown: vi.fn(),
    getTopCauses: vi.fn(),
    getPerformanceMetrics: vi.fn(),
  },
}));

vi.mock('../../utils/currencyFormatter', () => ({
  formatCurrencySync: vi.fn((amount) => `$${amount}`),
  invalidateConfigCache: vi.fn(),
}));

vi.mock('../../utils/csvExport', () => ({
  formatAnalyticsForExport: vi.fn(() => ({
    causesSummary: [],
    donationTrends: [],
    categories: [],
    topPerformers: [],
  })),
  exportCausesSummary: vi.fn(),
  exportDonationTrends: vi.fn(),
  exportCategoryBreakdown: vi.fn(),
  exportTopCauses: vi.fn(),
}));

vi.mock('recharts', () => ({
  BarChart: () => <div>BarChart</div>,
  Bar: () => <div>Bar</div>,
  LineChart: () => <div>LineChart</div>,
  Line: () => <div>Line</div>,
  PieChart: () => <div>PieChart</div>,
  Pie: () => <div>Pie</div>,
  Cell: () => <div>Cell</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  Legend: () => <div>Legend</div>,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Area: () => <div>Area</div>,
  AreaChart: () => <div>AreaChart</div>,
}));

const mockData = {
  aggregatedData: { totalDonations: 10000, totalCauses: 50 },
  trendData: [{ date: '2024-01-01', amount: 1000 }],
  categoryData: [{ 
    category: 'education', 
    amount: 5000, 
    totalDonations: 100,
    totalDonors: 75,
    averageDonation: 66.67
  }],
  topCauses: [{ name: 'Education', amount: 3000 }],
  performanceMetrics: { avgDonation: 100 },
};

describe('AdminAnalyticsDashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAdminAnalyticsDashboard = () => {
    return render(
      <BrowserRouter>
        <AdminAnalyticsDashboard />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    dashboardAPI.getAggregatedDonations.mockImplementation(() => new Promise(() => {}));
    dashboardAPI.getDonationTrends.mockImplementation(() => new Promise(() => {}));
    dashboardAPI.getCategoryBreakdown.mockImplementation(() => new Promise(() => {}));
    dashboardAPI.getTopCauses.mockImplementation(() => new Promise(() => {}));
    dashboardAPI.getPerformanceMetrics.mockImplementation(() => new Promise(() => {}));

    renderAdminAnalyticsDashboard();
    
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
  });

  it('should fetch and display analytics data', async () => {
    dashboardAPI.getAggregatedDonations.mockResolvedValue({ data: { data: mockData.aggregatedData } });
    dashboardAPI.getDonationTrends.mockResolvedValue({ data: { data: { trends: mockData.trendData } } });
    dashboardAPI.getCategoryBreakdown.mockResolvedValue({ data: { data: mockData.categoryData } });
    dashboardAPI.getTopCauses.mockResolvedValue({ data: { data: { topCauses: mockData.topCauses } } });
    dashboardAPI.getPerformanceMetrics.mockResolvedValue({ data: { data: mockData.performanceMetrics } });

    renderAdminAnalyticsDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/analytics dashboard/i)).toBeInTheDocument();
    });
  });

  it('should handle export CSV', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    dashboardAPI.getAggregatedDonations.mockResolvedValue({ data: { data: mockData.aggregatedData } });
    dashboardAPI.getDonationTrends.mockResolvedValue({ data: { data: { trends: mockData.trendData } } });
    dashboardAPI.getCategoryBreakdown.mockResolvedValue({ data: { data: mockData.categoryData } });
    dashboardAPI.getTopCauses.mockResolvedValue({ data: { data: { topCauses: mockData.topCauses } } });
    dashboardAPI.getPerformanceMetrics.mockResolvedValue({ data: { data: mockData.performanceMetrics } });

    renderAdminAnalyticsDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/export csv/i)).toBeInTheDocument();
    });

    const exportButton = screen.getByText(/export csv/i);
    await user.click(exportButton);
    
    expect(screen.getByText(/summary/i)).toBeInTheDocument();
  });

  it('should handle date range filter', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    dashboardAPI.getAggregatedDonations.mockResolvedValue({ data: { data: mockData.aggregatedData } });
    dashboardAPI.getDonationTrends.mockResolvedValue({ data: { data: { trends: mockData.trendData } } });
    dashboardAPI.getCategoryBreakdown.mockResolvedValue({ data: { data: mockData.categoryData } });
    dashboardAPI.getTopCauses.mockResolvedValue({ data: { data: { topCauses: mockData.topCauses } } });
    dashboardAPI.getPerformanceMetrics.mockResolvedValue({ data: { data: mockData.performanceMetrics } });

    renderAdminAnalyticsDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/analytics dashboard/i)).toBeInTheDocument();
    });

    const dateRangeButtons = screen.getAllByRole('button');
    const last30Days = dateRangeButtons.find(btn => btn.textContent.includes('30'));
    if (last30Days) {
      await user.click(last30Days);
    }
  });

  it('should display charts', async () => {
    dashboardAPI.getAggregatedDonations.mockResolvedValue({ data: { data: mockData.aggregatedData } });
    dashboardAPI.getDonationTrends.mockResolvedValue({ data: { data: { trends: mockData.trendData } } });
    dashboardAPI.getCategoryBreakdown.mockResolvedValue({ data: { data: mockData.categoryData } });
    dashboardAPI.getTopCauses.mockResolvedValue({ data: { data: { topCauses: mockData.topCauses } } });
    dashboardAPI.getPerformanceMetrics.mockResolvedValue({ data: { data: mockData.performanceMetrics } });

    renderAdminAnalyticsDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/analytics dashboard/i)).toBeInTheDocument();
    });
  });

  it('should handle error', async () => {
    dashboardAPI.getAggregatedDonations.mockRejectedValue(new Error('Failed'));
    dashboardAPI.getDonationTrends.mockRejectedValue(new Error('Failed'));
    dashboardAPI.getCategoryBreakdown.mockRejectedValue(new Error('Failed'));
    dashboardAPI.getTopCauses.mockRejectedValue(new Error('Failed'));
    dashboardAPI.getPerformanceMetrics.mockRejectedValue(new Error('Failed'));

    renderAdminAnalyticsDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load analytics/i)).toBeInTheDocument();
    });
  });
});
