import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ResetPassword from '../pages/ResetPassword';
import userEvent from '@testing-library/user-event';
import { API } from '../api';

vi.mock('../../api', () => ({
  API: {
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('token=test-token')],
  };
});

describe('ResetPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderResetPassword = () => {
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<ResetPassword />} />
        </Routes>
      </BrowserRouter>
    );
  };

  it('should render reset password form', () => {
    renderResetPassword();
    expect(screen.getByPlaceholderText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^confirm new password/i)).toBeInTheDocument();
  });

  it('should validate empty password', async () => {
    const user = userEvent.setup();
    renderResetPassword();
    
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should validate password length', async () => {
    const user = userEvent.setup();
    renderResetPassword();
    
    await user.type(screen.getByPlaceholderText(/^new password/i), 'short');
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should validate password match', async () => {
    const user = userEvent.setup();
    renderResetPassword();
    
    await user.type(screen.getByPlaceholderText(/^new password/i), 'password123');
    await user.type(screen.getByPlaceholderText(/^confirm new password/i), 'different');
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should handle successful reset', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    API.post.mockResolvedValueOnce({
      data: { message: 'Password reset successful' },
    });

    renderResetPassword();
    
    await user.type(screen.getByPlaceholderText(/^new password/i), 'password123');
    await user.type(screen.getByPlaceholderText(/^confirm new password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
    });

    // Advance timers to trigger navigation
    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    vi.useRealTimers();
  }, 15000);

  it('should handle error', async () => {
    const user = userEvent.setup();
    API.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid or expired token' } },
    });

    renderResetPassword();
    
    await user.type(screen.getByPlaceholderText(/^new password/i), 'password123');
    await user.type(screen.getByPlaceholderText(/^confirm new password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
    });
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    renderResetPassword();
    
    const passwordInput = screen.getByPlaceholderText(/^new password/i);
    const toggleButton = screen.getAllByLabelText(/show password/i)[0];
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('should show loading state', async () => {
    const user = userEvent.setup();
    API.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderResetPassword();
    
    await user.type(screen.getByPlaceholderText(/^new password/i), 'password123');
    await user.type(screen.getByPlaceholderText(/^confirm new password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    
    expect(screen.getByRole('button', { name: /resetting/i })).toBeInTheDocument();
  });
});
