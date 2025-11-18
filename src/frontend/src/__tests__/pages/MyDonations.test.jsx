import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyDonations from '../pages/MyDonations';
import { donationsAPI } from '../api';

vi.mock('../../api', () => ({
  donationsAPI: {
    getDonations: vi.fn(),
    downloadReceipt: vi.fn(),
  },
}));

const mockDonations = [
  {
    paymentId: 'pay-123',
    cause: 'Education for Children',
    amount: 100,
    date: '2024-01-15T10:00:00Z',
  },
  {
    paymentId: 'pay-456',
    cause: 'Healthcare Initiative',
    amount: 50,
    date: '2024-01-20T15:30:00Z',
  },
];

describe('MyDonations Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/123');
    global.URL.revokeObjectURL = vi.fn();
  });

  const renderMyDonations = () => {
    return render(
      <BrowserRouter>
        <MyDonations />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    donationsAPI.getDonations.mockImplementation(() => new Promise(() => {}));
    renderMyDonations();
    
    expect(screen.getByText(/loading your donations/i)).toBeInTheDocument();
  });

  it('should fetch and display donations', async () => {
    donationsAPI.getDonations.mockResolvedValueOnce({
      data: { data: { donations: mockDonations } },
    });

    renderMyDonations();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
      expect(screen.getByText('Healthcare Initiative')).toBeInTheDocument();
    });
  });

  it('should display empty state when no donations', async () => {
    donationsAPI.getDonations.mockResolvedValueOnce({
      data: { data: { donations: [] } },
    });

    renderMyDonations();
    
    await waitFor(() => {
      expect(screen.getByText(/no donations found/i)).toBeInTheDocument();
    });
  });

  it('should handle fetch error', async () => {
    donationsAPI.getDonations.mockRejectedValueOnce(new Error('Failed to fetch'));

    renderMyDonations();
    
    await waitFor(() => {
      expect(screen.getByText(/no donations found/i)).toBeInTheDocument();
    });
  });

  it('should display donation details', async () => {
    donationsAPI.getDonations.mockResolvedValueOnce({
      data: { data: { donations: mockDonations } },
    });

    renderMyDonations();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
      expect(screen.getByText(/amount.*100/i)).toBeInTheDocument();
      expect(screen.getByText(/payment id.*pay-123/i)).toBeInTheDocument();
    });
  });

  it('should download receipt when button clicked', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    
    donationsAPI.getDonations.mockResolvedValueOnce({
      data: { data: { donations: mockDonations } },
    });
    
    donationsAPI.downloadReceipt.mockResolvedValueOnce({
      data: new Blob(['PDF content'], { type: 'application/pdf' }),
    });

    renderMyDonations();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const downloadButtons = screen.getAllByText(/download receipt/i);
    await user.click(downloadButtons[0]);
    
    await waitFor(() => {
      expect(donationsAPI.downloadReceipt).toHaveBeenCalledWith('pay-123');
    });
  });

  it('should handle download receipt error', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    global.alert = vi.fn();
    
    donationsAPI.getDonations.mockResolvedValueOnce({
      data: { data: { donations: mockDonations } },
    });
    
    donationsAPI.downloadReceipt.mockRejectedValueOnce(new Error('Download failed'));

    renderMyDonations();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const downloadButtons = screen.getAllByText(/download receipt/i);
    await user.click(downloadButtons[0]);
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to download receipt');
    });
  });

  it('should format dates correctly', async () => {
    donationsAPI.getDonations.mockResolvedValueOnce({
      data: { data: { donations: mockDonations } },
    });

    renderMyDonations();
    
    await waitFor(() => {
      const dateElements = screen.getAllByText(/2024/i);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('should format amounts correctly', async () => {
    donationsAPI.getDonations.mockResolvedValueOnce({
      data: { data: { donations: mockDonations } },
    });

    renderMyDonations();
    
    await waitFor(() => {
      expect(screen.getByText(/amount.*100\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/amount.*50\.00/i)).toBeInTheDocument();
    });
  });

  it('should display page title', async () => {
    donationsAPI.getDonations.mockResolvedValueOnce({
      data: { data: { donations: mockDonations } },
    });

    renderMyDonations();
    
    await waitFor(() => {
      expect(screen.getByText(/my donations/i)).toBeInTheDocument();
    });
  });
});
