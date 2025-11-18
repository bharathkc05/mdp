import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import CauseDetails from '../pages/CauseDetails';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { donationsAPI } from '../api';

vi.mock('axios');
vi.mock('../../api', () => ({
  donationsAPI: {
    makeDonation: vi.fn(),
  },
}));

vi.mock('../../utils/currencyFormatter', () => ({
  formatCurrencySync: vi.fn((amount) => `$${amount}`),
  getMinimumDonation: vi.fn(() => Promise.resolve({ amount: 1, enabled: true })),
  invalidateConfigCache: vi.fn(),
}));

const mockCause = {
  _id: '1',
  name: 'Education for Children',
  description: 'Help children get quality education',
  category: 'education',
  targetAmount: 10000,
  currentAmount: 5000,
  status: 'active',
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' }),
  };
});

describe('CauseDetails Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderCauseDetails = () => {
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<CauseDetails />} />
        </Routes>
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    axios.get.mockImplementation(() => new Promise(() => {}));
    renderCauseDetails();
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('should fetch and display cause details', async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
      expect(screen.getByText(/help children get quality education/i)).toBeInTheDocument();
    });
  });

  it('should handle fetch error', async () => {
    axios.get.mockRejectedValueOnce(new Error('Failed to load'));

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getByText(/cause not found/i)).toBeInTheDocument();
    });
  });

  it('should display progress bar', async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });
  });

  it('should display donation form', async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getByLabelText(/donation amount/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /donate now/i })).toBeInTheDocument();
    });
  });

  it('should handle donation submission when logged in', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });
    
    donationsAPI.makeDonation.mockResolvedValueOnce({
      data: { success: true },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    const amountInput = screen.getByLabelText(/donation amount/i);
    await user.type(amountInput, '100');
    await user.click(screen.getByRole('button', { name: /donate now/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/thank you for your donation/i)).toBeInTheDocument();
    });
  });

  it('should redirect to login when not authenticated', async () => {
    const user = userEvent.setup();
    
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    const amountInput = screen.getByLabelText(/donation amount/i);
    await user.type(amountInput, '100');
    await user.click(screen.getByRole('button', { name: /donate now/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please login to make a donation/i)).toBeInTheDocument();
    });
  });

  it('should validate minimum donation amount', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    const amountInput = screen.getByLabelText(/donation amount/i);
    await user.type(amountInput, '0.5');
    await user.click(screen.getByRole('button', { name: /donate now/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/donation amount must be at least/i)).toBeInTheDocument();
    });
  });

  it('should validate empty donation amount', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /donate now/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid donation amount/i)).toBeInTheDocument();
    });
  });

  it('should handle donation error', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });
    
    donationsAPI.makeDonation.mockRejectedValueOnce({
      response: { data: { message: 'Payment failed' } },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const amountInput = screen.getByLabelText(/donation amount/i);
    await user.type(amountInput, '100');
    await user.click(screen.getByRole('button', { name: /donate now/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
    });
  });

  it('should navigate back to causes page', async () => {
    const user = userEvent.setup();
    
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    const backButton = screen.getByText(/back to browse causes/i);
    await user.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/causes');
  });

  it('should display category and status badges', async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getAllByText('education')[0]).toBeInTheDocument();
      expect(screen.getAllByText('active')[0]).toBeInTheDocument();
    });
  });

  it('should show loading state during donation', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });
    
    donationsAPI.makeDonation.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const amountInput = screen.getByLabelText(/donation amount/i);
    await user.type(amountInput, '100');
    await user.click(screen.getByRole('button', { name: /donate now/i }));
    
    expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument();
  });

  it('should handle config update event', async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: mockCause },
    });

    renderCauseDetails();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    // Trigger config update event
    window.dispatchEvent(new Event('platformConfigUpdated'));
    
    // Wait for event handler to complete
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });
  });
});
