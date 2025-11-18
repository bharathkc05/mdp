import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { authAPI } from '../api';

vi.mock('../../api', () => ({
  authAPI: {
    getProfile: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

vi.mock('../../components/DonationStats', () => ({
  default: () => <div>DonationStats Component</div>,
}));

vi.mock('../../components/TwoFactorSetup', () => ({
  default: () => <div>TwoFactorSetup Component</div>,
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    authAPI.getProfile.mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('should fetch and display user profile for donor', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: {
        email: 'donor@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'donor',
      },
    });

    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/welcome, john/i)).toBeInTheDocument();
      expect(screen.getByText('donor@example.com')).toBeInTheDocument();
    });
  });

  it('should fetch and display user profile for admin', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: {
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      },
    });

    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/welcome, admin/i)).toBeInTheDocument();
      expect(screen.getByText(/admin tools/i)).toBeInTheDocument();
    });
  });

  it('should display admin-specific content for admin users', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: {
        email: 'admin@example.com',
        firstName: 'Admin',
        role: 'admin',
      },
    });

    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/go to admin dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/TwoFactorSetup Component/i)).toBeInTheDocument();
    });
  });

  it('should display donor-specific content for donor users', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: {
        email: 'donor@example.com',
        firstName: 'John',
        role: 'donor',
      },
    });

    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/DonationStats Component/i)).toBeInTheDocument();
    });
  });

  it('should handle profile fetch error', async () => {
    authAPI.getProfile.mockRejectedValueOnce({
      response: { status: 401 },
    });

    renderDashboard();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should display role badge for admin', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: {
        email: 'admin@example.com',
        firstName: 'Admin',
        role: 'admin',
      },
    });

    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/👑 admin/i)).toBeInTheDocument();
    });
  });

  it('should display role badge for donor', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: {
        email: 'donor@example.com',
        firstName: 'John',
        role: 'donor',
      },
    });

    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/💝 donor/i)).toBeInTheDocument();
    });
  });

  it('should have link to admin dashboard for admin users', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: {
        email: 'admin@example.com',
        firstName: 'Admin',
        role: 'admin',
      },
    });

    renderDashboard();
    
    await waitFor(() => {
      const adminLink = screen.getByText(/go to admin dashboard/i);
      expect(adminLink).toBeInTheDocument();
      expect(adminLink.closest('a')).toHaveAttribute('href', '/admin');
    });
  });

  it('should not display admin tools for donor users', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: {
        email: 'donor@example.com',
        firstName: 'John',
        role: 'donor',
      },
    });

    renderDashboard();
    
    await waitFor(() => {
      expect(screen.queryByText(/admin tools/i)).not.toBeInTheDocument();
    });
  });

  it('should not display donation stats for admin users', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: {
        email: 'admin@example.com',
        firstName: 'Admin',
        role: 'admin',
      },
    });

    renderDashboard();
    
    await waitFor(() => {
      expect(screen.queryByText(/DonationStats Component/i)).not.toBeInTheDocument();
    });
  });
});
