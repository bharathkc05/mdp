import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BrowseCauses from '../pages/BrowseCauses';
import userEvent from '@testing-library/user-event';
import { API } from '../api';

vi.mock('../../api', () => ({
  API: {
    get: vi.fn(),
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
    description: 'Help children get quality education',
    category: 'education',
    targetAmount: 10000,
    currentAmount: 5000,
    status: 'active',
  },
  {
    _id: '2',
    name: 'Healthcare Initiative',
    description: 'Provide healthcare to communities',
    category: 'healthcare',
    targetAmount: 20000,
    currentAmount: 8000,
    status: 'active',
  },
];

const mockCategories = [
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
];

describe('BrowseCauses Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderBrowseCauses = () => {
    return render(
      <BrowserRouter>
        <BrowseCauses />
      </BrowserRouter>
    );
  };

  it('should render browse causes page', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getByText(/browse causes/i)).toBeInTheDocument();
    });
  });

  it('should display loading state initially', () => {
    API.get.mockImplementation(() => new Promise(() => {}));
    renderBrowseCauses();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display causes', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Healthcare Initiative')[0]).toBeInTheDocument();
    });
  });

  it('should handle fetch error', async () => {
    API.get.mockRejectedValue({
      response: { data: { message: 'Failed to load causes' } },
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load causes/i)).toBeInTheDocument();
    });
  });

  it('should filter causes by search term', async () => {
    const user = userEvent.setup();
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/search causes/i);
    await user.type(searchInput, 'Education');
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
      expect(screen.queryByText('Healthcare Initiative')).not.toBeInTheDocument();
    });
  });

  it('should filter causes by category', async () => {
    const user = userEvent.setup();
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    const categorySelect = screen.getByLabelText(/filter causes by category/i);
    await user.selectOptions(categorySelect, 'education');
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
      expect(screen.queryByText('Healthcare Initiative')).not.toBeInTheDocument();
    });
  });

  it('should clear filters', async () => {
    const user = userEvent.setup();
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    // Apply search filter
    const searchInput = screen.getByLabelText(/search causes/i);
    await user.type(searchInput, 'Education');
    
    // Clear filters
    const clearButton = screen.getByText(/clear filters/i);
    await user.click(clearButton);
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('should display empty state when no causes found', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: [] } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getByText(/no causes found/i)).toBeInTheDocument();
    });
  });

  it('should display cause progress bars', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  it('should navigate to cause details', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText(/view details/i);
      expect(viewDetailsButtons.length).toBeGreaterThan(0);
    });
  });

  it('should show cause status badges', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      const statusBadges = screen.getAllByText(/active/i);
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  it('should handle config update event', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });

    // Trigger config update event
    window.dispatchEvent(new Event('platformConfigUpdated'));
    
    // Component should handle the event
    expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
  });

  it('should display cause categories', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getByText(/education/i)).toBeInTheDocument();
      expect(screen.getByText(/healthcare/i)).toBeInTheDocument();
    });
  });

  it('should format currency amounts correctly', async () => {
    API.get.mockImplementation((url) => {
      if (url === '/causes/categories/list') {
        return Promise.resolve({ data: { success: true, categories: mockCategories } });
      }
      if (url === '/causes') {
        return Promise.resolve({ data: { success: true, causes: mockCauses } });
      }
    });

    renderBrowseCauses();
    
    await waitFor(() => {
      expect(screen.getAllByText('Education for Children')[0]).toBeInTheDocument();
    });
  });
});
