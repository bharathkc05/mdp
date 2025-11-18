import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

const renderNavbar = () => {
  return render(
    <BrowserRouter>
      <Navbar />
    </BrowserRouter>
  );
};

describe('Navbar Component', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Unauthenticated State', () => {
    it('renders login and register buttons when not authenticated', () => {
      renderNavbar();
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Register')).toBeInTheDocument();
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('renders public navigation links', () => {
      renderNavbar();
      
      expect(screen.getByText('MDP Donor Portal')).toBeInTheDocument();
      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Browse Causes').length).toBeGreaterThan(0);
    });

    it('does not render authenticated-only links', () => {
      renderNavbar();
      
      expect(screen.queryByText('Multi-Cause Donate')).not.toBeInTheDocument();
      expect(screen.queryByText('My Donations')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State - Regular User', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
      }));
    });

    it('renders authenticated user navigation', () => {
      renderNavbar();
      
      expect(screen.getAllByText('Multi-Cause Donate').length).toBeGreaterThan(0);
      expect(screen.getAllByText('My Donations').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
    });

    it('displays user name when authenticated', () => {
      renderNavbar();
      
      expect(screen.getByText(/Welcome, Test User/)).toBeInTheDocument();
    });

    it('displays email when name is not available', () => {
      localStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        role: 'user'
      }));
      
      renderNavbar();
      
      expect(screen.getByText(/Welcome, test@example.com/)).toBeInTheDocument();
    });

    it('does not render login and register buttons', () => {
      renderNavbar();
      
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
      expect(screen.queryByText('Register')).not.toBeInTheDocument();
    });

    it('does not render admin dashboard link for regular user', () => {
      renderNavbar();
      
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    });

    it('handles logout correctly', () => {
      renderNavbar();
      
      const logoutButton = screen.getAllByText('Logout')[0];
      fireEvent.click(logoutButton);
      
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('email')).toBeNull();
      expect(localStorage.getItem('role')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Authenticated State - Admin User', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('user', JSON.stringify({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      }));
    });

    it('renders admin dashboard link', () => {
      renderNavbar();
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('does not render My Donations link for admin', () => {
      renderNavbar();
      
      expect(screen.queryByText('My Donations')).not.toBeInTheDocument();
    });

    it('renders authenticated navigation links', () => {
      renderNavbar();
      
      expect(screen.getAllByText('Multi-Cause Donate').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
    });

    it('admin dashboard link has correct styling', () => {
      renderNavbar();
      
      const adminLinks = screen.getAllByText('Admin Dashboard');
      const adminLink = adminLinks[0];
      expect(adminLink).toHaveClass('bg-purple-500');
    });
  });

  describe('Navigation Links', () => {
    it('all navigation links have correct hrefs', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        firstName: 'Test',
        role: 'user'
      }));
      
      renderNavbar();
      
      const homeLink = screen.getAllByText('Home')[0].closest('a');
      expect(homeLink).toHaveAttribute('href', '/');
      
      const causesLink = screen.getAllByText('Browse Causes')[0].closest('a');
      expect(causesLink).toHaveAttribute('href', '/causes');
      
      const profileLink = screen.getAllByText('Profile')[0].closest('a');
      expect(profileLink).toHaveAttribute('href', '/profile');
    });

    it('brand logo links to home', () => {
      renderNavbar();
      
      const brandLinks = screen.getAllByText('MDP Donor Portal');
      const brandLink = brandLinks[0].closest('a');
      expect(brandLink).toHaveAttribute('href', '/');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        role: 'user'
      }));
      
      renderNavbar();
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
      
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('Dynamic State Updates', () => {
    it('updates auth state when location changes', async () => {
      const { rerender } = renderNavbar();
      
      // Initially not authenticated
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      
      // Add token
      localStorage.setItem('token', 'new-token');
      localStorage.setItem('user', JSON.stringify({
        email: 'new@example.com',
        firstName: 'New',
        role: 'user'
      }));
      
      // Force re-render by changing location
      mockLocation.pathname = '/dashboard';
      rerender(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing user data gracefully', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', '{}');
      
      renderNavbar();
      
      expect(screen.getByText(/Welcome,/)).toBeInTheDocument();
    });

    it('handles invalid JSON in localStorage', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', 'invalid-json');
      
      expect(() => renderNavbar()).not.toThrow();
    });

    it('handles only firstName without lastName', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({
        email: 'test@example.com',
        firstName: 'Test',
        role: 'user'
      }));
      
      renderNavbar();
      
      expect(screen.getByText(/Welcome, Test$/)).toBeInTheDocument();
    });
  });
});
