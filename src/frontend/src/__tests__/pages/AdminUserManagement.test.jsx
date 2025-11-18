import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminUserManagement from '../pages/AdminUserManagement';
import { adminAPI } from '../api';
import userEvent from '@testing-library/user-event';

vi.mock('../../api', () => ({
  adminAPI: {
    getUsers: vi.fn(),
    updateUserRole: vi.fn(),
  },
}));

const mockUsers = [
  {
    _id: '1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'donor',
    verified: true,
  },
];

describe('AdminUserManagement Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
  });

  const renderAdminUserManagement = () => {
    return render(
      <BrowserRouter>
        <AdminUserManagement />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    adminAPI.getUsers.mockImplementation(() => new Promise(() => {}));
    renderAdminUserManagement();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display users', async () => {
    adminAPI.getUsers.mockResolvedValueOnce({
      data: { data: mockUsers, totalPages: 1, total: 1 },
    });

    renderAdminUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    const user = userEvent.setup();
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers, totalPages: 1, total: 1 },
    });

    renderAdminUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'test');
    
    await waitFor(() => {
      expect(adminAPI.getUsers).toHaveBeenCalled();
    });
  });

  it('should update user role', async () => {
    const user = userEvent.setup();
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers, totalPages: 1, total: 1 },
    });
    adminAPI.updateUserRole.mockResolvedValueOnce({ data: {} });

    renderAdminUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    const roleSelect = screen.getByRole('combobox');
    await user.selectOptions(roleSelect, 'admin');
    
    await waitFor(() => {
      expect(adminAPI.updateUserRole).toHaveBeenCalled();
    });
  });

  it('should filter by role', async () => {
    const user = userEvent.setup();
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers, totalPages: 1, total: 1 },
    });

    renderAdminUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    const roleFilter = screen.getByLabelText(/filter by role/i);
    await user.selectOptions(roleFilter, 'donor');
    
    await waitFor(() => {
      expect(adminAPI.getUsers).toHaveBeenCalled();
    });
  });

  it('should handle pagination', async () => {
    const user = userEvent.setup();
    adminAPI.getUsers.mockResolvedValue({
      data: { data: mockUsers, totalPages: 2, total: 20 },
    });

    renderAdminUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/next/i);
    if (nextButton) {
      await user.click(nextButton);
      expect(adminAPI.getUsers).toHaveBeenCalled();
    }
  });

  it('should handle empty state', async () => {
    adminAPI.getUsers.mockResolvedValue({
      data: { data: [], totalPages: 0, total: 0 },
    });

    renderAdminUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });

  it('should handle error', async () => {
    adminAPI.getUsers.mockRejectedValue(new Error('Failed'));

    renderAdminUserManagement();
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
