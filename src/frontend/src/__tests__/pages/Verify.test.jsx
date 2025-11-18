import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Verify from '../pages/Verify';
import { authAPI } from '../api';

vi.mock('../../api', () => ({
  authAPI: {
    verify: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('token=test-token-123')],
  };
});

describe('Verify Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderVerify = () => {
    return render(
      <BrowserRouter>
        <Verify />
      </BrowserRouter>
    );
  };

  it('should display verifying message initially', () => {
    authAPI.verify.mockImplementation(() => new Promise(() => {}));
    renderVerify();
    
    expect(screen.getByText(/verifying email/i)).toBeInTheDocument();
  });

  it('should handle successful verification', async () => {
    vi.useFakeTimers();
    authAPI.verify.mockResolvedValueOnce({
      data: { message: 'Email verified successfully!' },
    });

    renderVerify();
    
    await waitFor(() => {
      expect(screen.getByText(/email verified successfully/i)).toBeInTheDocument();
    });

    // Advance timers to trigger navigation
    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    vi.useRealTimers();
  }, 15000);

  it('should handle verification error', async () => {
    authAPI.verify.mockRejectedValueOnce({
      response: { data: { message: 'Invalid or expired token' } },
    });

    renderVerify();
    
    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
    });
  });

  it('should display error when no token provided', async () => {
    const mockUseSearchParams = vi.fn(() => [new URLSearchParams('')]);
    vi.mocked(await import('react-router-dom')).useSearchParams = mockUseSearchParams;
    
    renderVerify();
    
    await waitFor(() => {
      expect(screen.getByText(/no verification token provided/i)).toBeInTheDocument();
    });
  });

  it('should display success icon on successful verification', async () => {
    authAPI.verify.mockResolvedValueOnce({
      data: { message: 'Email verified successfully!' },
    });

    renderVerify();
    
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });

  it('should display error icon on failed verification', async () => {
    authAPI.verify.mockRejectedValueOnce({
      response: { data: { message: 'Verification failed' } },
    });

    renderVerify();
    
    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });
  });

  it('should have links to login and register on error', async () => {
    authAPI.verify.mockRejectedValueOnce({
      response: { data: { message: 'Verification failed' } },
    });

    renderVerify();
    
    await waitFor(() => {
      expect(screen.getByText(/go to login/i)).toBeInTheDocument();
      expect(screen.getByText(/register again/i)).toBeInTheDocument();
    });
  });

  it('should display token in UI', async () => {
    authAPI.verify.mockResolvedValueOnce({
      data: { message: 'Email verified successfully!' },
    });

    renderVerify();
    
    await waitFor(() => {
      expect(screen.getByText(/token:/i)).toBeInTheDocument();
    });
  });

  it('should handle network error', async () => {
    authAPI.verify.mockRejectedValueOnce(new Error('Network Error'));

    renderVerify();
    
    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });
  });
});
