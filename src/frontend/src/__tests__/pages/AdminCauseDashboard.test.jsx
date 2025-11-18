import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminCauseDashboard from '../pages/AdminCauseDashboard';
import { adminAPI } from '../api';
import userEvent from '@testing-library/user-event';

vi.mock('../../api', () => ({
  adminAPI: {
    getCauses: vi.fn(),
    createCause: vi.fn(),
    updateCause: vi.fn(),
    deleteCause: vi.fn(),
    archiveCause: vi.fn(),
  },
}));

vi.mock('../../utils/currencyFormatter', () => ({
  formatCurrencySync: vi.fn((amount) => `$${amount}`),
  invalidateConfigCache: vi.fn(),
}));

const mockCauses = [
  {
    _id: '1',
    name: 'Education for Children',
    description: 'Help children',
    category: 'education',
    targetAmount: 10000,
    currentAmount: 5000,
    status: 'active',
  },
];

describe('AdminCauseDashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
    global.alert = vi.fn();
  });

  const renderAdminCauseDashboard = () => {
    return render(
      <BrowserRouter>
        <AdminCauseDashboard />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    adminAPI.getCauses.mockImplementation(() => new Promise(() => {}));
    renderAdminCauseDashboard();
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('should fetch and display causes', async () => {
    adminAPI.getCauses.mockResolvedValueOnce({
      data: { data: mockCauses, totalPages: 1, total: 1 },
    });

    renderAdminCauseDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    const user = userEvent.setup();
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses, totalPages: 1, total: 1 },
    });

    renderAdminCauseDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Education');
    
    await waitFor(() => {
      expect(adminAPI.getCauses).toHaveBeenCalled();
    });
  });

  it('should open create modal', async () => {
    const user = userEvent.setup();
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses, totalPages: 1, total: 1 },
    });

    renderAdminCauseDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const createButton = screen.getByText(/create new cause/i);
    await user.click(createButton);
    
    expect(screen.getByText(/create cause/i)).toBeInTheDocument();
  });

  it('should create cause', async () => {
    const user = userEvent.setup();
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses, totalPages: 1, total: 1 },
    });
    adminAPI.createCause.mockResolvedValueOnce({ data: {} });

    renderAdminCauseDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    await user.click(screen.getByText(/create new cause/i));
    
    await user.type(screen.getByLabelText(/name/i), 'New Cause');
    await user.type(screen.getByLabelText(/description/i), 'New Description');
    await user.type(screen.getByLabelText(/target amount/i), '10000');
    
    await user.click(screen.getByRole('button', { name: /create/i }));
    
    await waitFor(() => {
      expect(adminAPI.createCause).toHaveBeenCalled();
    });
  });

  it('should delete cause', async () => {
    const user = userEvent.setup();
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses, totalPages: 1, total: 1 },
    });
    adminAPI.deleteCause.mockResolvedValueOnce({ data: {} });

    renderAdminCauseDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText(/delete/i);
    await user.click(deleteButton);
    
    await waitFor(() => {
      expect(adminAPI.deleteCause).toHaveBeenCalled();
    });
  });

  it('should handle filter by category', async () => {
    const user = userEvent.setup();
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses, totalPages: 1, total: 1 },
    });

    renderAdminCauseDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'education');
    
    await waitFor(() => {
      expect(adminAPI.getCauses).toHaveBeenCalled();
    });
  });

  it('should handle pagination', async () => {
    const user = userEvent.setup();
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses, totalPages: 2, total: 20 },
    });

    renderAdminCauseDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/next/i);
    if (nextButton) {
      await user.click(nextButton);
      expect(adminAPI.getCauses).toHaveBeenCalled();
    }
  });

  it('should prevent deleting cause with donations', async () => {
    const user = userEvent.setup();
    const causeWithDonations = {
      ...mockCauses[0],
      currentAmount: 1000,
    };
    
    adminAPI.getCauses.mockResolvedValue({
      data: { data: [causeWithDonations], totalPages: 1, total: 1 },
    });

    renderAdminCauseDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Education for Children')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText(/delete/i);
    await user.click(deleteButton);
    
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('Cannot delete this cause')
    );
  });
});
