import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonationForm from '../components/DonationForm';
import { donationsAPI } from '../api';
import * as currencyFormatter from '../utils/currencyFormatter';

// Mock the API
vi.mock('../../api', () => ({
  donationsAPI: {
    getCauses: vi.fn(),
    makeDonation: vi.fn(),
    downloadReceipt: vi.fn(),
  },
}));

// Mock currency formatter
vi.mock('../../utils/currencyFormatter', async () => {
  const actual = await vi.importActual('../../utils/currencyFormatter');
  return {
    ...actual,
    getMinimumDonation: vi.fn(),
    formatCurrencySync: vi.fn((amount) => `$${amount}`),
  };
});

describe('DonationForm Component', () => {
  const mockCauses = [
    { _id: '1', name: 'Education Fund', category: 'education' },
    { _id: '2', name: 'Healthcare Support', category: 'healthcare' },
    { _id: '3', name: 'Environmental Conservation', category: 'environment' },
  ];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    localStorage.clear();
    
    // Setup default mock responses
    donationsAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses },
    });
    
    currencyFormatter.getMinimumDonation.mockResolvedValue({
      amount: 1,
      enabled: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('renders donation form with all fields', async () => {
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByText('Make a Donation')).toBeInTheDocument();
      });
      
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cause/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /make donation/i })).toBeInTheDocument();
    });

    it('loads and displays causes in dropdown', async () => {
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(donationsAPI.getCauses).toHaveBeenCalled();
      });
      
      const causeSelect = screen.getByLabelText(/cause/i);
      expect(causeSelect).toBeInTheDocument();
      
      // Check if causes are in the dropdown
      mockCauses.forEach(cause => {
        expect(screen.getByText(cause.name)).toBeInTheDocument();
      });
    });

    it('displays minimum donation information', async () => {
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByText(/Minimum donation:/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('requires amount field', async () => {
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      const amountInput = screen.getByLabelText(/amount/i);
      expect(amountInput).toBeRequired();
    });

    it('requires cause selection', async () => {
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/cause/i)).toBeInTheDocument();
      });
      
      const causeSelect = screen.getByLabelText(/cause/i);
      expect(causeSelect).toBeRequired();
    });

    it('validates minimum donation amount', async () => {
      currencyFormatter.getMinimumDonation.mockResolvedValue({
        amount: 5,
        enabled: true,
      });
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      const amountInput = screen.getByLabelText(/amount/i);
      const submitButton = screen.getByRole('button', { name: /make donation/i });
      
      await userEvent.type(amountInput, '3');
      await userEvent.selectOptions(screen.getByLabelText(/cause/i), '1');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Donation amount must be at least/)).toBeInTheDocument();
      });
    });

    it('accepts amount equal to minimum', async () => {
      currencyFormatter.getMinimumDonation.mockResolvedValue({
        amount: 5,
        enabled: true,
      });
      
      donationsAPI.makeDonation.mockResolvedValue({
        data: {
          data: {
            donation: { paymentId: 'payment-123' }
          }
        }
      });
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      const amountInput = screen.getByLabelText(/amount/i);
      await userEvent.type(amountInput, '5');
      await userEvent.selectOptions(screen.getByLabelText(/cause/i), '1');
      
      const submitButton = screen.getByRole('button', { name: /make donation/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(donationsAPI.makeDonation).toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits donation successfully for regular user', async () => {
      donationsAPI.makeDonation.mockResolvedValue({
        data: {
          data: {
            donation: { paymentId: 'payment-123' }
          }
        }
      });
      
      localStorage.setItem('user', JSON.stringify({ role: 'user' }));
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      const amountInput = screen.getByLabelText(/amount/i);
      const causeSelect = screen.getByLabelText(/cause/i);
      
      await userEvent.type(amountInput, '50');
      await userEvent.selectOptions(causeSelect, '1');
      
      const submitButton = screen.getByRole('button', { name: /make donation/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(donationsAPI.makeDonation).toHaveBeenCalledWith({
          amount: 50,
          causeId: '1'
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Donation made successfully/)).toBeInTheDocument();
      });
    });

    it('clears form after successful submission', async () => {
      donationsAPI.makeDonation.mockResolvedValue({
        data: {
          data: {
            donation: { paymentId: 'payment-123' }
          }
        }
      });
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      const amountInput = screen.getByLabelText(/amount/i);
      const causeSelect = screen.getByLabelText(/cause/i);
      
      await userEvent.type(amountInput, '50');
      await userEvent.selectOptions(causeSelect, '1');
      
      const submitButton = screen.getByRole('button', { name: /make donation/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(amountInput.value).toBe('');
        expect(causeSelect.value).toBe('');
      });
    });

    it('displays error message on submission failure', async () => {
      donationsAPI.makeDonation.mockRejectedValue({
        response: {
          data: {
            message: 'Insufficient funds'
          }
        }
      });
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/amount/i), '50');
      await userEvent.selectOptions(screen.getByLabelText(/cause/i), '1');
      
      const submitButton = screen.getByRole('button', { name: /make donation/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Insufficient funds/)).toBeInTheDocument();
      });
    });

    it('shows loading state during submission', async () => {
      donationsAPI.makeDonation.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { data: { donation: { paymentId: 'payment-123' } } }
        }), 100))
      );
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/amount/i), '50');
      await userEvent.selectOptions(screen.getByLabelText(/cause/i), '1');
      
      const submitButton = screen.getByRole('button', { name: /make donation/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Processing.../)).toBeInTheDocument();
      });
    });

    it('disables submit button during submission', async () => {
      donationsAPI.makeDonation.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { data: { donation: { paymentId: 'payment-123' } } }
        }), 100))
      );
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/amount/i), '50');
      await userEvent.selectOptions(screen.getByLabelText(/cause/i), '1');
      
      const submitButton = screen.getByRole('button', { name: /make donation/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Receipt Modal', () => {
    it('shows receipt modal after successful donation for regular user', async () => {
      donationsAPI.makeDonation.mockResolvedValue({
        data: {
          data: {
            donation: { paymentId: 'payment-123' }
          }
        }
      });
      
      localStorage.setItem('user', JSON.stringify({ role: 'user' }));
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/amount/i), '50');
      await userEvent.selectOptions(screen.getByLabelText(/cause/i), '1');
      
      const submitButton = screen.getByRole('button', { name: /make donation/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Donation Successful/)).toBeInTheDocument();
      });
    });

    it('does not show receipt modal for admin user', async () => {
      donationsAPI.makeDonation.mockResolvedValue({
        data: {
          data: {
            donation: { paymentId: 'payment-123' }
          }
        }
      });
      
      localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/amount/i), '50');
      await userEvent.selectOptions(screen.getByLabelText(/cause/i), '1');
      
      const submitButton = screen.getByRole('button', { name: /make donation/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Donation made successfully/)).toBeInTheDocument();
      });
      
      expect(screen.queryByText(/Donation Successful/)).not.toBeInTheDocument();
    });

    it('allows downloading receipt from modal', async () => {
      donationsAPI.makeDonation.mockResolvedValue({
        data: {
          data: {
            donation: { paymentId: 'payment-123' }
          }
        }
      });
      
      donationsAPI.downloadReceipt.mockResolvedValue({
        data: new Blob(['PDF content'], { type: 'application/pdf' })
      });
      
      localStorage.setItem('user', JSON.stringify({ role: 'user' }));
      
      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/amount/i), '50');
      await userEvent.selectOptions(screen.getByLabelText(/cause/i), '1');
      
      fireEvent.click(screen.getByRole('button', { name: /make donation/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Download Receipt/)).toBeInTheDocument();
      });
      
      const downloadButton = screen.getByText(/Download Receipt/);
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(donationsAPI.downloadReceipt).toHaveBeenCalledWith('payment-123');
      });
    });

    it('closes modal when clicking close button', async () => {
      donationsAPI.makeDonation.mockResolvedValue({
        data: {
          data: {
            donation: { paymentId: 'payment-123' }
          }
        }
      });
      
      localStorage.setItem('user', JSON.stringify({ role: 'user' }));
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/amount/i), '50');
      await userEvent.selectOptions(screen.getByLabelText(/cause/i), '1');
      
      fireEvent.click(screen.getByRole('button', { name: /make donation/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Donation Successful/)).toBeInTheDocument();
      });
      
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/Donation Successful/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Currency Configuration', () => {
    it('listens to platform config updates', async () => {
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      });
      
      // Trigger config update event
      const event = new CustomEvent('platformConfigUpdated');
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(currencyFormatter.getMinimumDonation).toHaveBeenCalled();
      });
    });

    it('handles disabled minimum donation', async () => {
      currencyFormatter.getMinimumDonation.mockResolvedValue({
        amount: 5,
        enabled: false,
      });
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.queryByText(/Minimum donation:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles causes loading failure gracefully', async () => {
      donationsAPI.getCauses.mockRejectedValue(new Error('Network error'));
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/cause/i)).toBeInTheDocument();
      });
      
      // Form should still render, just with no causes
      expect(screen.getByText('Select a cause')).toBeInTheDocument();
    });

    it('handles config loading failure gracefully', async () => {
      currencyFormatter.getMinimumDonation.mockRejectedValue(new Error('Config error'));
      
      render(<DonationForm />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/cause/i)).toBeInTheDocument();
      });
    });
  });
});
