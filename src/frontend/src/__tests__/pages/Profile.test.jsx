import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../pages/Profile';
import userEvent from '@testing-library/user-event';
import { authAPI } from '../api';

vi.mock('../../api', () => ({
  authAPI: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = {
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  age: 30,
  gender: 'male',
  role: 'donor',
  profile: {
    phoneNumber: '1234567890',
    address: '123 Main St',
    preferredCauses: ['education'],
  },
};

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProfile = () => {
    return render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    authAPI.getProfile.mockImplementation(() => new Promise(() => {}));
    renderProfile();
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('should fetch and display user profile', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: mockUser,
    });

    renderProfile();
    
    await waitFor(() => {
      expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('should enable editing mode', async () => {
    const user = userEvent.setup();
    authAPI.getProfile.mockResolvedValueOnce({
      data: mockUser,
    });

    renderProfile();
    
    await waitFor(() => {
      expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
    });

    const editButton = screen.getByText(/edit profile/i);
    await user.click(editButton);
    
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
  });

  it('should update profile', async () => {
    const user = userEvent.setup();
    authAPI.getProfile.mockResolvedValueOnce({
      data: mockUser,
    });
    
    authAPI.updateProfile.mockResolvedValueOnce({
      data: { user: { ...mockUser, firstName: 'Jane' } },
    });

    renderProfile();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText(/edit profile/i));
    
    const firstNameInput = screen.getByDisplayValue('John');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');
    
    await user.click(screen.getByText(/save changes/i));
    
    await waitFor(() => {
      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
    });
  });

  it('should cancel editing', async () => {
    const user = userEvent.setup();
    authAPI.getProfile.mockResolvedValueOnce({
      data: mockUser,
    });

    renderProfile();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText(/edit profile/i));
    
    const firstNameInput = screen.getByDisplayValue('John');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');
    
    await user.click(screen.getByText(/cancel/i));
    
    expect(screen.queryByDisplayValue('Jane')).not.toBeInTheDocument();
  });

  it('should handle update error', async () => {
    const user = userEvent.setup();
    authAPI.getProfile.mockResolvedValueOnce({
      data: mockUser,
    });
    
    authAPI.updateProfile.mockRejectedValueOnce({
      response: { data: { message: 'Update failed' } },
    });

    renderProfile();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText(/edit profile/i));
    await user.click(screen.getByText(/save changes/i));
    
    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeInTheDocument();
    });
  });

  it('should redirect on 401 error', async () => {
    authAPI.getProfile.mockRejectedValueOnce({
      response: { status: 401 },
    });

    renderProfile();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should display role badge', async () => {
    authAPI.getProfile.mockResolvedValueOnce({
      data: mockUser,
    });

    renderProfile();
    
    await waitFor(() => {
      expect(screen.getByText(/💝 donor/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during save', async () => {
    const user = userEvent.setup();
    authAPI.getProfile.mockResolvedValueOnce({
      data: mockUser,
    });
    
    authAPI.updateProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderProfile();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText(/edit profile/i));
    await user.click(screen.getByText(/save changes/i));
    
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });
});
