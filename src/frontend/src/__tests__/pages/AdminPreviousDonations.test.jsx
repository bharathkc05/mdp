import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminPreviousDonations from '../pages/AdminPreviousDonations';
import { adminAPI, donationsAPI } from '../api';
import userEvent from '@testing-library/user-event';

vi.mock('../../api', () => ({
  adminAPI: {
    getPreviousDonations: vi.fn(),
  },
  donationsAPI: {
    downloadReceipt: vi.fn(),
  },
}));

vi.mock('../../utils/currencyFormatter', () => ({
  formatCurrencySync: vi.fn((amount) => `$${amount}`),
  invalidateConfigCache: vi.fn(),
}));

vi.mock('../../utils/csvExport', () => ({
  exportDonationsToCSV: vi.fn(),
}));

const mockDonations = [
  {
    _id: '1',
    user: { email: 'user@example.com' },
    cause: 'Education',
    amount: 100,
    date: '2024-01-01',
    paymentId: 'pay_123',
  },
];

describe('AdminPreviousDonations Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAdminPreviousDonations = () => {
    return render(
      <BrowserRouter>
        <AdminPreviousDonations />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    adminAPI.getPreviousDonations.mockImplementation(() => new Promise(() => {}));
    renderAdminPreviousDonations();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display donations', async () => {
    adminAPI.getPreviousDonations.mockResolvedValueOnce({
      data: { data: mockDonations },
    });

    renderAdminPreviousDonations();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
    });
  });

  it('should handle date filter', async () => {
    const user = userEvent.setup();
    adminAPI.getPreviousDonations.mockResolvedValue({
      data: { data: mockDonations },
    });

    renderAdminPreviousDonations();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    const startDate = screen.getByLabelText(/start date/i);
    await user.type(startDate, '2024-01-01');
    
    await waitFor(() => {
      expect(adminAPI.getPreviousDonations).toHaveBeenCalled();
    });
  });

  it('should export CSV', async () => {
    const user = userEvent.setup();
    const { exportDonationsToCSV } = await import('../../utils/csvExport');
    adminAPI.getPreviousDonations.mockResolvedValue({
      data: { data: mockDonations },
    });

    renderAdminPreviousDonations();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    const exportButton = screen.getByText(/export csv/i);
    await user.click(exportButton);
    
    expect(exportDonationsToCSV).toHaveBeenCalled();
  });

  it('should handle empty state', async () => {
    adminAPI.getPreviousDonations.mockResolvedValue({
      data: { data: [] },
    });

    renderAdminPreviousDonations();
    
    await waitFor(() => {
      expect(screen.getByText(/no donations found/i)).toBeInTheDocument();
    });
  });

  it('should handle error', async () => {
    adminAPI.getPreviousDonations.mockRejectedValue(new Error('Failed'));

    renderAdminPreviousDonations();
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should display total amount', async () => {
    adminAPI.getPreviousDonations.mockResolvedValue({
      data: { data: mockDonations, totalAmount: 100 },
    });

    renderAdminPreviousDonations();
    
    await waitFor(() => {
      expect(screen.getByText(/total/i)).toBeInTheDocument();
    });
  });
});
