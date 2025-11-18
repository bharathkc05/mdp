import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import userEvent from '@testing-library/user-event';
import { API } from '../api';

// Mock API
vi.mock('../../api', () => ({
  API: {
    post: vi.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  it('should render login form', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should display validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderLogin();
    
    const submitButton = screen.getByRole('button', { name: /login/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    renderLogin();
    
    const emailInput = screen.getByPlaceholderText(/email/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    API.post.mockResolvedValueOnce({
      data: {
        token: 'test-token',
        role: 'donor',
        firstName: 'John',
        lastName: 'Doe',
      },
    });

    renderLogin();
    
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('email', 'test@example.com');
    });
  });

  it('should handle login failure', async () => {
    const user = userEvent.setup();
    API.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });

    renderLogin();
    
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    renderLogin();
    
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const toggleButton = screen.getByLabelText(/show password/i);
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should display resend verification option', () => {
    renderLogin();
    expect(screen.getByText(/resend verification email/i)).toBeInTheDocument();
  });

  it('should handle resend verification email', async () => {
    const user = userEvent.setup();
    API.post.mockResolvedValueOnce({
      data: { message: 'Verification email sent' },
    });

    renderLogin();
    
    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
    await user.click(screen.getByText(/resend verification email/i));
    
    await waitFor(() => {
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
    });
  });

  it('should handle 2FA requirement', async () => {
    const user = userEvent.setup();
    API.post.mockResolvedValueOnce({
      data: {
        requiresTwoFactor: true,
        message: 'Please enter your 2FA code',
      },
    });

    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please enter your 2fa code/i)).toBeInTheDocument();
    });
  });

  it('should submit 2FA code', async () => {
    const user = userEvent.setup();
    
    // First login shows 2FA requirement
    API.post.mockResolvedValueOnce({
      data: {
        requiresTwoFactor: true,
        message: 'Please enter your 2FA code',
      },
    });

    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please enter your 2fa code/i)).toBeInTheDocument();
    });

    // Second submission with 2FA code
    API.post.mockResolvedValueOnce({
      data: {
        token: 'test-token',
        role: 'admin',
      },
    });

    const twoFactorInput = screen.getByLabelText(/2fa code/i);
    await user.type(twoFactorInput, '123456');
    await user.click(screen.getByRole('button', { name: /verify and login/i }));
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    });
  });

  it('should toggle between 2FA code and backup code', async () => {
    const user = userEvent.setup();
    API.post.mockResolvedValueOnce({
      data: {
        requiresTwoFactor: true,
        message: 'Please enter your 2FA code',
      },
    });

    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/use backup code/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/use backup code/i));
    expect(screen.getByText(/use 2fa code instead/i)).toBeInTheDocument();
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    API.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    expect(screen.getByRole('button', { name: /logging in/i })).toBeInTheDocument();
  });

  it('should have link to forgot password page', () => {
    renderLogin();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('should have link to register page', () => {
    renderLogin();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/register here/i)).toBeInTheDocument();
  });

  it('should display preview URL when provided', async () => {
    const user = userEvent.setup();
    API.post.mockResolvedValueOnce({
      data: {
        message: 'Verification email sent',
        previewUrl: 'https://ethereal.email/preview/123',
      },
    });

    renderLogin();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByText(/resend verification email/i));
    
    await waitFor(() => {
      expect(screen.getByText(/open email preview/i)).toBeInTheDocument();
    });
  });
});
