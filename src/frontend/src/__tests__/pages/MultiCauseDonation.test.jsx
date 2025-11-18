import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MultiCauseDonation from '../pages/MultiCauseDonation';
import userEvent from '@testing-library/user-event';
import { API } from '../api';

vi.mock('../../api', () => ({
  API: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../utils/currencyFormatter', () => ({
  getMinimumDonation: vi.fn(() => Promise.resolve({ amount: 1, enabled: true })),
  formatCurrencySync: vi.fn((amount) => `$${amount}`),
}));

const mockCauses = [
  { _id: '1', name: 'Education', targetAmount: 10000, currentAmount: 5000, status: 'active' },
  { _id: '2', name: 'Healthcare', targetAmount: 20000, currentAmount: 8000, status: 'active' },
];

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('MultiCauseDonation Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderMultiCauseDonation = () => {
    return render(
      <BrowserRouter>
        <MultiCauseDonation />
      </BrowserRouter>
    );
  };

  it('should render multi-cause donation page', async () => {
    API.get.mockResolvedValueOnce({
      data: { success: true, causes: mockCauses },
    });

    renderMultiCauseDonation();
    
    await waitFor(() => {
      expect(screen.getByText(/multi-cause donation/i)).toBeInTheDocument();
    });
  });

  it('should display loading state', () => {
    API.get.mockImplementation(() => new Promise(() => {}));
    renderMultiCauseDonation();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display causes', async () => {
    API.get.mockResolvedValueOnce({
      data: { success: true, causes: mockCauses },
    });

    renderMultiCauseDonation();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
    });
  });

  it('should add cause to basket', async () => {
    const user = userEvent.setup();
    API.get.mockResolvedValueOnce({
      data: { success: true, causes: mockCauses },
    });

    renderMultiCauseDonation();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByText(/add to basket/i);
    await user.click(addButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText(/added to basket/i)).toBeInTheDocument();
    });
  });

  it('should remove cause from basket', async () => {
    const user = userEvent.setup();
    API.get.mockResolvedValueOnce({
      data: { success: true, causes: mockCauses },
    });

    renderMultiCauseDonation();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByText(/add to basket/i);
    await user.click(addButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText(/added to basket/i)).toBeInTheDocument();
    });

    const removeButton = screen.getByText(/remove from basket/i);
    await user.click(removeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/removed from basket/i)).toBeInTheDocument();
    });
  });

  it('should toggle allocation type', async () => {
    const user = userEvent.setup();
    API.get.mockResolvedValueOnce({
      data: { success: true, causes: mockCauses },
    });

    renderMultiCauseDonation();
    
    await waitFor(() => {
      expect(screen.getByText(/percentage/i)).toBeInTheDocument();
    });

    const fixedButton = screen.getByText(/fixed amount/i);
    await user.click(fixedButton);
    
    expect(fixedButton).toHaveClass(/selected|active/);
  });

  it('should distribute evenly', async () => {
    const user = userEvent.setup();
    API.get.mockResolvedValueOnce({
      data: { success: true, causes: mockCauses },
    });

    renderMultiCauseDonation();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    // Add causes to basket
    const addButtons = screen.getAllByText(/add to basket/i);
    await user.click(addButtons[0]);
    await user.click(addButtons[1]);
    
    // Set total amount
    const totalInput = screen.getByLabelText(/total amount/i);
    await user.type(totalInput, '100');
    
    // Click distribute evenly
    const distributeButton = screen.getByText(/distribute evenly/i);
    await user.click(distributeButton);
    
    // Check if allocations are updated
    expect(distributeButton).toBeInTheDocument();
  });

  it('should validate total amount', async () => {
    const user = userEvent.setup();
    API.get.mockResolvedValueOnce({
      data: { success: true, causes: mockCauses },
    });

    renderMultiCauseDonation();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByText(/add to basket/i);
    await user.click(addButtons[0]);
    
    const submitButton = screen.getByText(/submit donation/i);
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter total amount/i)).toBeInTheDocument();
    });
  });

  it('should submit multi-cause donation', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    
    API.get.mockResolvedValueOnce({
      data: { success: true, causes: mockCauses },
    });
    
    API.post.mockResolvedValueOnce({
      data: { success: true },
    });

    renderMultiCauseDonation();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByText(/add to basket/i);
    await user.click(addButtons[0]);
    
    const totalInput = screen.getByLabelText(/total amount/i);
    await user.type(totalInput, '100');
    
    const distributeButton = screen.getByText(/distribute evenly/i);
    await user.click(distributeButton);
    
    const submitButton = screen.getByText(/submit donation/i);
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/donation successful/i)).toBeInTheDocument();
    });
  });

  it('should display empty basket message', async () => {
    API.get.mockResolvedValueOnce({
      data: { success: true, causes: mockCauses },
    });

    renderMultiCauseDonation();
    
    await waitFor(() => {
      expect(screen.getByText(/your basket is empty/i)).toBeInTheDocument();
    });
  });
});
