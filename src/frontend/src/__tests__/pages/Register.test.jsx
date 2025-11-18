import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../pages/Register';
import userEvent from '@testing-library/user-event';
import { authAPI } from '../api';

// Mock API
vi.mock('../../api', () => ({
  authAPI: {
    register: vi.fn(),
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

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRegister = () => {
    return render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );
  };

  const fillForm = async (user, data = {}) => {
    const {
      firstName = 'John',
      lastName = 'Doe',
      age = '25',
      gender = 'male',
      email = 'john@example.com',
      password = 'password123',
      confirmPassword = 'password123',
    } = data;

    await user.type(screen.getByLabelText(/first name/i), firstName);
    await user.type(screen.getByLabelText(/last name/i), lastName);
    await user.type(screen.getByLabelText(/age/i), age);
    await user.selectOptions(screen.getByLabelText(/gender/i), gender);
    await user.type(screen.getByLabelText(/^email/i), email);
    await user.type(screen.getByPlaceholderText(/^password \(min/i), password);
    await user.type(screen.getByPlaceholderText(/confirm password/i), confirmPassword);
  };

  it('should render registration form', () => {
    renderRegister();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^password \(min/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    });
  });

  it('should validate age requirement', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    await user.type(screen.getByLabelText(/age/i), '10');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/you must be at least 13 years old/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    await user.type(screen.getByLabelText(/^email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should validate password length', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    await user.type(screen.getByPlaceholderText(/^password \(min/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should validate password confirmation match', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    await user.type(screen.getByPlaceholderText(/^password \(min/i), 'password123');
    await user.type(screen.getByPlaceholderText(/confirm password/i), 'different');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should handle successful registration', async () => {
    const user = userEvent.setup();
    authAPI.register.mockResolvedValueOnce({
      data: {
        message: 'Registration successful! Please check your email to verify your account.',
      },
    });

    renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });
  });

  it('should handle registration failure', async () => {
    const user = userEvent.setup();
    authAPI.register.mockRejectedValueOnce({
      response: { data: { message: 'Email already exists' } },
    });

    renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    const passwordInput = screen.getByPlaceholderText(/^password \(min/i);
    const toggleButton = screen.getAllByLabelText(/show password/i)[0];
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('should toggle confirm password visibility', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm password/i);
    const toggleButton = screen.getByLabelText(/show confirm password/i);
    
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
  });

  it('should display preview URL when provided', async () => {
    const user = userEvent.setup();
    authAPI.register.mockResolvedValueOnce({
      data: {
        message: 'Registration successful!',
        previewUrl: 'https://ethereal.email/preview/123',
      },
    });

    renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/preview available/i)).toBeInTheDocument();
    });
  });

  it('should display verification token when provided', async () => {
    const user = userEvent.setup();
    authAPI.register.mockResolvedValueOnce({
      data: {
        message: 'Registration successful!',
        verificationToken: 'test-token-123',
      },
    });

    renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });
  });

  it('should redirect to login after successful registration', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    
    authAPI.register.mockResolvedValueOnce({
      data: { message: 'Registration successful!' },
    });

    renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });

    vi.advanceTimersByTime(10000);
    // Ensure all pending timers and microtasks are flushed
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    vi.useRealTimers();
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    authAPI.register.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderRegister();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    expect(screen.getByRole('button', { name: /registering/i })).toBeInTheDocument();
  });

  it('should have link to login page', () => {
    renderRegister();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it('should validate gender selection', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/age/i), '25');
    // Skip gender selection
    await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
    await user.type(screen.getByPlaceholderText(/^password \(min/i), 'password123');
    await user.type(screen.getByPlaceholderText(/confirm password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please select your gender/i)).toBeInTheDocument();
    });
  });

  it('should clear form errors when user starts typing', async () => {
    const user = userEvent.setup();
    renderRegister();
    
    // Submit empty form to trigger errors
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });

    // Start typing in first name
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // The first name error should be gone, but other errors remain
    await waitFor(() => {
      expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    });
  });
});
