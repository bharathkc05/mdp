import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../pages/AdminDashboard';
import { adminAPI, systemAPI } from '../api';

vi.mock('../../api', () => ({
  adminAPI: {
    getDashboardStats: vi.fn(),
    getCauses: vi.fn(),
    getUsers: vi.fn(),
  },
  systemAPI: {
    getHealth: vi.fn(),
  },
}));

vi.mock('../../utils/currencyFormatter', () => ({
  formatCurrencySync: vi.fn((amount) => `$${amount}`),
  invalidateConfigCache: vi.fn(),
}));

const mockStats = {
  users: { total: 100, donors: 80, admins: 20 },
  causes: { total: 50, active: 40, paused: 10 },
  donations: { totalAmount: 50000, totalDonors: 75, targetAmount: 100000 },
};

const mockCauses = [
  { 
    _id: '1', 
    name: 'Education', 
    status: 'active', 
    category: 'education-learning',
    targetAmount: 10000,
    currentAmount: 5000,
    percentageAchieved: 50,
    donorCount: 25,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  { 
    _id: '2', 
    name: 'Healthcare', 
    status: 'active',
    category: 'health-medical',
    targetAmount: 15000,
    currentAmount: 7500,
    percentageAchieved: 50,
    donorCount: 30,
    createdAt: '2024-01-02T00:00:00.000Z'
  },
];

const mockUsers = [
  { _id: '1', firstName: 'John', email: 'john@example.com', role: 'donor' },
  { _id: '2', firstName: 'Jane', email: 'jane@example.com', role: 'admin' },
];

describe('AdminDashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAdminDashboard = () => {
    return render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    adminAPI.getDashboardStats.mockImplementation(() => new Promise(() => {}));
    adminAPI.getCauses.mockImplementation(() => new Promise(() => {}));
    adminAPI.getUsers.mockImplementation(() => new Promise(() => {}));
    systemAPI.getHealth.mockResolvedValue({ status: 200, data: { status: 'UP' } });

    renderAdminDashboard();
    
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('should fetch and display dashboard stats', async () => {
    adminAPI.getDashboardStats.mockResolvedValueOnce({
      data: { data: mockStats },
    });
    adminAPI.getCauses.mockResolvedValueOnce({
      data: { data: mockCauses },
    });
    adminAPI.getUsers.mockResolvedValueOnce({
      data: { data: mockUsers },
    });
    systemAPI.getHealth.mockResolvedValue({ status: 200, data: { status: 'UP', database: { status: 'connected' } } });

    renderAdminDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  it('should handle fetch error', async () => {
    adminAPI.getDashboardStats.mockRejectedValueOnce(new Error('Failed to fetch'));
    adminAPI.getCauses.mockRejectedValueOnce(new Error('Failed to fetch'));
    adminAPI.getUsers.mockRejectedValueOnce(new Error('Failed to fetch'));
    systemAPI.getHealth.mockResolvedValue({ status: 200, data: { status: 'UP' } });

    renderAdminDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    });
  });

  it('should display refresh button', async () => {
    adminAPI.getDashboardStats.mockResolvedValue({
      data: { data: mockStats },
    });
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses },
    });
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers },
    });
    systemAPI.getHealth.mockResolvedValue({ status: 200, data: { status: 'UP' } });

    renderAdminDashboard();
    
    await waitFor(() => {
      expect(screen.getByLabelText(/refresh dashboard data/i)).toBeInTheDocument();
    });
  });

  it('should handle refresh button click', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    adminAPI.getDashboardStats.mockResolvedValue({
      data: { data: mockStats },
    });
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses },
    });
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers },
    });
    systemAPI.getHealth.mockResolvedValue({ status: 200, data: { status: 'UP' } });

    renderAdminDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    const refreshButton = screen.getByLabelText(/refresh dashboard data/i);
    await user.click(refreshButton);
    
    expect(adminAPI.getDashboardStats).toHaveBeenCalledTimes(2);
  });

  it('should display system health status', async () => {
    adminAPI.getDashboardStats.mockResolvedValue({
      data: { data: mockStats },
    });
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses },
    });
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers },
    });
    systemAPI.getHealth.mockResolvedValue({ 
      status: 200, 
      data: { status: 'UP', database: { status: 'connected' } } 
    });

    renderAdminDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  it('should display recent causes', async () => {
    adminAPI.getDashboardStats.mockResolvedValue({
      data: { data: mockStats },
    });
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses },
    });
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers },
    });
    systemAPI.getHealth.mockResolvedValue({ status: 200, data: { status: 'UP' } });

    renderAdminDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Education')).toBeInTheDocument();
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
    });
  });

  it('should display recent users', async () => {
    adminAPI.getDashboardStats.mockResolvedValue({
      data: { data: mockStats },
    });
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses },
    });
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers },
    });
    systemAPI.getHealth.mockResolvedValue({ status: 200, data: { status: 'UP' } });

    renderAdminDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  it('should handle config update event', async () => {
    adminAPI.getDashboardStats.mockResolvedValue({
      data: { data: mockStats },
    });
    adminAPI.getCauses.mockResolvedValue({
      data: { data: mockCauses },
    });
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers },
    });
    systemAPI.getHealth.mockResolvedValue({ status: 200, data: { status: 'UP' } });

    renderAdminDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    window.dispatchEvent(new Event('platformConfigUpdated'));
    
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should display empty state when no data', async () => {
    const emptyStats = {
      users: { total: 0, donors: 0, admins: 0 },
      causes: { total: 0, active: 0, paused: 0 },
      donations: { totalAmount: 0, totalDonors: 0, targetAmount: 0 },
    };

    adminAPI.getDashboardStats.mockResolvedValue({
      data: { data: emptyStats },
    });
    adminAPI.getCauses.mockResolvedValue({
      data: { data: [] },
    });
    adminAPI.getUsers.mockResolvedValue({
      data: { data: [] },
    });
    systemAPI.getHealth.mockResolvedValue({ status: 200, data: { status: 'UP' } });

    renderAdminDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/welcome to the micro donation platform/i)).toBeInTheDocument();
    });
  });
});
