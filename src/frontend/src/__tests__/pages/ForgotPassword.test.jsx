import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from '../pages/ForgotPassword';
import userEvent from '@testing-library/user-event';
import { API } from '../api';

vi.mock('../../api', () => ({
  API: {
    post: vi.fn(),
  },
}));

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForgotPassword = () => {
    return render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );
  };

  it('should render forgot password form', () => {
    renderForgotPassword();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument();
  });

  it('should validate empty email', async () => {
    const user = userEvent.setup();
    renderForgotPassword();
    
    await user.click(screen.getByRole('button', { name: /send reset instructions/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    renderForgotPassword();
    
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /send reset instructions/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should handle successful submission', async () => {
    const user = userEvent.setup();
    API.post.mockResolvedValueOnce({
      data: { message: 'Reset instructions sent to your email' },
    });

    renderForgotPassword();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset instructions/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/reset instructions sent/i)).toBeInTheDocument();
    });
  });

  it('should handle error', async () => {
    const user = userEvent.setup();
    API.post.mockRejectedValueOnce({
      response: { data: { message: 'Email not found' } },
    });

    renderForgotPassword();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset instructions/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email not found/i)).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    const user = userEvent.setup();
    API.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderForgotPassword();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset instructions/i }));
    
    expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
  });

  it('should display preview URL when provided', async () => {
    const user = userEvent.setup();
    API.post.mockResolvedValueOnce({
      data: {
        message: 'Reset instructions sent',
        previewUrl: 'https://ethereal.email/preview/123',
      },
    });

    renderForgotPassword();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset instructions/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/open email preview/i)).toBeInTheDocument();
    });
  });

  it('should have link to login page', () => {
    renderForgotPassword();
    expect(screen.getByText(/remember your password/i)).toBeInTheDocument();
    expect(screen.getByText(/login here/i)).toBeInTheDocument();
  });
});
