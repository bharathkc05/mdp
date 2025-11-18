import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDonationsByUser from '../pages/AdminDonationsByUser';
import { adminAPI } from '../api';
import userEvent from '@testing-library/user-event';

vi.mock('../../api', () => ({
  adminAPI: {
    getDonationsByUser: vi.fn(),
  },
}));

vi.mock('../../utils/currencyFormatter', () => ({
  formatCurrencySync: vi.fn((amount) => `$${amount}`),
  invalidateConfigCache: vi.fn(),
}));

vi.mock('../../utils/csvExport', () => ({
  exportUserDonationsToCSV: vi.fn(),
}));

const mockUserDonations = [
  {
    _id: '1',
    email: 'user@example.com',
    totalDonations: 500,
    donationCount: 5,
  },
];

describe('AdminDonationsByUser Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAdminDonationsByUser = () => {
    return render(
      <BrowserRouter>
        <AdminDonationsByUser />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    adminAPI.getDonationsByUser.mockImplementation(() => new Promise(() => {}));
    renderAdminDonationsByUser();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display user donations', async () => {
    adminAPI.getDonationsByUser.mockResolvedValueOnce({
      data: { data: mockUserDonations },
    });

    renderAdminDonationsByUser();
    
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  it('should export CSV', async () => {
    const user = userEvent.setup();
    const { exportUserDonationsToCSV } = await import('../../utils/csvExport');
    adminAPI.getDonationsByUser.mockResolvedValue({
      data: { data: mockUserDonations },
    });

    renderAdminDonationsByUser();
    
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    const exportButton = screen.getByText(/export csv/i);
    await user.click(exportButton);
    
    expect(exportUserDonationsToCSV).toHaveBeenCalled();
  });

  it('should handle search', async () => {
    const user = userEvent.setup();
    adminAPI.getDonationsByUser.mockResolvedValue({
      data: { data: mockUserDonations },
    });

    renderAdminDonationsByUser();
    
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'user');
    
    await waitFor(() => {
      expect(adminAPI.getDonationsByUser).toHaveBeenCalled();
    });
  });

  it('should handle empty state', async () => {
    adminAPI.getDonationsByUser.mockResolvedValue({
      data: { data: [] },
    });

    renderAdminDonationsByUser();
    
    await waitFor(() => {
      expect(screen.getByText(/no donations found/i)).toBeInTheDocument();
    });
  });

  it('should handle error', async () => {
    adminAPI.getDonationsByUser.mockRejectedValue(new Error('Failed'));

    renderAdminDonationsByUser();
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
