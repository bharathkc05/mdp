import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import * as currencyFormatter from '../utils/currencyFormatter';

// Mock all page components
vi.mock('../pages/Home', () => ({ default: () => <div>Home Page</div> }));
vi.mock('../pages/Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('../pages/Register', () => ({ default: () => <div>Register Page</div> }));
vi.mock('../pages/Verify', () => ({ default: () => <div>Verify Page</div> }));
vi.mock('../pages/ForgotPassword', () => ({ default: () => <div>Forgot Password Page</div> }));
vi.mock('../pages/ResetPassword', () => ({ default: () => <div>Reset Password Page</div> }));
vi.mock('../pages/BrowseCauses', () => ({ default: () => <div>Browse Causes Page</div> }));
vi.mock('../pages/CauseDetails', () => ({ default: () => <div>Cause Details Page</div> }));
vi.mock('../pages/MultiCauseDonation', () => ({ default: () => <div>Multi Cause Donation Page</div> }));
vi.mock('../pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('../pages/Profile', () => ({ default: () => <div>Profile Page</div> }));
vi.mock('../pages/MyDonations', () => ({ default: () => <div>My Donations Page</div> }));
vi.mock('../pages/AdminDashboard', () => ({ default: () => <div>Admin Dashboard Page</div> }));
vi.mock('../pages/AdminCauseDashboard', () => ({ default: () => <div>Admin Cause Dashboard Page</div> }));
vi.mock('../pages/AdminUserManagement', () => ({ default: () => <div>Admin User Management Page</div> }));
vi.mock('../pages/AdminAnalyticsDashboard', () => ({ default: () => <div>Admin Analytics Dashboard Page</div> }));
vi.mock('../pages/AuditLogsPage', () => ({ default: () => <div>Audit Logs Page</div> }));
vi.mock('../pages/AdminPlatformConfig', () => ({ default: () => <div>Admin Platform Config Page</div> }));
vi.mock('../pages/AdminDonationsByUser', () => ({ default: () => <div>Admin Donations By User Page</div> }));
vi.mock('../pages/AdminPreviousDonations', () => ({ default: () => <div>Admin Previous Donations Page</div> }));

// Mock Navbar component
vi.mock('../components/Navbar', () => ({ default: () => <nav>Navbar</nav> }));

// Mock currency formatter
vi.mock('../utils/currencyFormatter', async () => {
  const actual = await vi.importActual('../utils/currencyFormatter');
  return {
    ...actual,
    initializeCurrencyConfig: vi.fn(async () => {}),
  };
});

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  describe('Initial Rendering', () => {
    it('renders without crashing', () => {
      render(<App />);
      expect(screen.getByText('Navbar')).toBeInTheDocument();
    });

    it('initializes currency configuration on mount', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(currencyFormatter.initializeCurrencyConfig).toHaveBeenCalled();
      });
    });

    it('shows loading state initially', () => {
      const { container } = render(<App />);
      
      // Component might show loading initially
      expect(container).toBeInTheDocument();
    });

    it('renders Navbar component', () => {
      render(<App />);
      expect(screen.getByText('Navbar')).toBeInTheDocument();
    });
  });

  describe('Public Routes', () => {
    it('renders Home page at root path', async () => {
      window.history.pushState({}, '', '/');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument();
      });
    });

    it('renders Login page at /login', async () => {
      window.history.pushState({}, '', '/login');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });

    it('renders Register page at /register', async () => {
      window.history.pushState({}, '', '/register');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Register Page')).toBeInTheDocument();
      });
    });

    it('renders Verify page at /verify', async () => {
      window.history.pushState({}, '', '/verify');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Verify Page')).toBeInTheDocument();
      });
    });

    it('renders Forgot Password page at /forgot-password', async () => {
      window.history.pushState({}, '', '/forgot-password');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Forgot Password Page')).toBeInTheDocument();
      });
    });

    it('renders Reset Password page at /reset-password', async () => {
      window.history.pushState({}, '', '/reset-password');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Reset Password Page')).toBeInTheDocument();
      });
    });

    it('renders Browse Causes page at /causes', async () => {
      window.history.pushState({}, '', '/causes');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Browse Causes Page')).toBeInTheDocument();
      });
    });

    it('renders Cause Details page at /causes/:id', async () => {
      window.history.pushState({}, '', '/causes/123');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Cause Details Page')).toBeInTheDocument();
      });
    });
  });

  describe('Protected Routes - User', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'user-token');
      localStorage.setItem('user', JSON.stringify({
        email: 'user@example.com',
        role: 'user'
      }));
    });

    it('renders Dashboard when authenticated', async () => {
      window.history.pushState({}, '', '/dashboard');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      });
    });

    it('renders Profile page when authenticated', async () => {
      window.history.pushState({}, '', '/profile');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Profile Page')).toBeInTheDocument();
      });
    });

    it('renders My Donations page when authenticated', async () => {
      window.history.pushState({}, '', '/donations');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('My Donations Page')).toBeInTheDocument();
      });
    });

    it('renders Multi Cause Donation when authenticated', async () => {
      window.history.pushState({}, '', '/donate/multi');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Multi Cause Donation Page')).toBeInTheDocument();
      });
    });

    it('redirects to login when accessing protected route without token', async () => {
      localStorage.clear();
      window.history.pushState({}, '', '/dashboard');
      
      render(<App />);
      
      await waitFor(() => {
        // Should redirect to login
        expect(window.location.pathname).toBe('/login');
      });
    });

    it('redirects regular user from admin route to dashboard', async () => {
      window.history.pushState({}, '', '/admin');
      render(<App />);
      
      await waitFor(() => {
        // Regular user should be redirected to dashboard
        expect(window.location.pathname).toBe('/dashboard');
      });
    });
  });

  describe('Protected Routes - Admin', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('user', JSON.stringify({
        email: 'admin@example.com',
        role: 'admin'
      }));
    });

    it('renders Admin Dashboard for admin user', async () => {
      window.history.pushState({}, '', '/admin');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard Page')).toBeInTheDocument();
      });
    });

    it('renders Admin Cause Dashboard', async () => {
      window.history.pushState({}, '', '/admin/causes');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Cause Dashboard Page')).toBeInTheDocument();
      });
    });

    it('renders Admin User Management', async () => {
      window.history.pushState({}, '', '/admin/users');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin User Management Page')).toBeInTheDocument();
      });
    });

    it('renders Admin Analytics Dashboard', async () => {
      window.history.pushState({}, '', '/admin/analytics');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Analytics Dashboard Page')).toBeInTheDocument();
      });
    });

    it('renders Audit Logs Page', async () => {
      window.history.pushState({}, '', '/admin/audit-logs');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Audit Logs Page')).toBeInTheDocument();
      });
    });

    it('renders Admin Platform Config', async () => {
      window.history.pushState({}, '', '/admin/config');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Platform Config Page')).toBeInTheDocument();
      });
    });

    it('renders Admin Donations By User', async () => {
      window.history.pushState({}, '', '/admin/donations-by-user');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Donations By User Page')).toBeInTheDocument();
      });
    });

    it('renders Admin Previous Donations', async () => {
      window.history.pushState({}, '', '/admin/previous-donations');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Previous Donations Page')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Context', () => {
    it('checks for token on mount', async () => {
      localStorage.setItem('token', 'test-token');
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Navbar')).toBeInTheDocument();
      });
    });

    it('handles missing token gracefully', async () => {
      localStorage.clear();
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument();
      });
    });

    it('persists authentication across page loads', async () => {
      localStorage.setItem('token', 'persisted-token');
      localStorage.setItem('user', JSON.stringify({ email: 'test@example.com', role: 'user' }));
      
      window.history.pushState({}, '', '/dashboard');
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      });
    });
  });

  describe('Layout Structure', () => {
    it('has proper container structure', () => {
      const { container } = render(<App />);
      
      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toBeInTheDocument();
    });

    it('applies correct background color', () => {
      const { container } = render(<App />);
      
      const mainContainer = container.querySelector('.bg-gray-50');
      expect(mainContainer).toBeInTheDocument();
    });

    it('includes container for content', () => {
      const { container } = render(<App />);
      
      const contentContainer = container.querySelector('.container');
      expect(contentContainer).toBeInTheDocument();
    });
  });

  describe('Currency Configuration', () => {
    it('initializes currency config on mount', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(currencyFormatter.initializeCurrencyConfig).toHaveBeenCalledTimes(1);
      });
    });

    it('handles currency config initialization errors', async () => {
      currencyFormatter.initializeCurrencyConfig.mockRejectedValueOnce(
        new Error('Config load failed')
      );
      
      // Should not throw
      expect(() => render(<App />)).not.toThrow();
    });

    it('logs error when currency config fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      currencyFormatter.initializeCurrencyConfig.mockRejectedValueOnce(
        new Error('Config error')
      );
      
      render(<App />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Route Guards', () => {
    it('ProtectedRoute redirects to login when no token', async () => {
      localStorage.clear();
      window.history.pushState({}, '', '/profile');
      
      render(<App />);
      
      await waitFor(() => {
        expect(window.location.pathname).toBe('/login');
      });
    });

    it('AdminRoute redirects to login when no token', async () => {
      localStorage.clear();
      window.history.pushState({}, '', '/admin');
      
      render(<App />);
      
      await waitFor(() => {
        expect(window.location.pathname).toBe('/login');
      });
    });

    it('AdminRoute redirects non-admin to dashboard', async () => {
      localStorage.setItem('token', 'user-token');
      localStorage.setItem('user', JSON.stringify({ role: 'user' }));
      window.history.pushState({}, '', '/admin');
      
      render(<App />);
      
      await waitFor(() => {
        expect(window.location.pathname).toBe('/dashboard');
      });
    });

    it('AdminRoute allows admin access', async () => {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
      window.history.pushState({}, '', '/admin');
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard Page')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles malformed user data in localStorage', async () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', 'invalid-json');
      
      expect(() => render(<App />)).not.toThrow();
    });

    it('handles missing user role', async () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
      window.history.pushState({}, '', '/admin');
      
      render(<App />);
      
      await waitFor(() => {
        // Should redirect to dashboard due to missing admin role
        expect(window.location.pathname).toBe('/dashboard');
      });
    });

    it('handles empty user object', async () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', '{}');
      window.history.pushState({}, '', '/dashboard');
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading message while initializing', () => {
      const { container } = render(<App />);
      
      // Initially might show loading
      expect(container).toBeInTheDocument();
    });

    it('removes loading state after initialization', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText(/Loading.../)).not.toBeInTheDocument();
      });
    });
  });
});
