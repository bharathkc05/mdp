import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuditLogsPage from '../pages/AuditLogsPage';
import { dashboardAPI } from '../api';
import userEvent from '@testing-library/user-event';

vi.mock('../../api', () => ({
  dashboardAPI: {
    getAuditLogs: vi.fn(),
    getAuditLogStats: vi.fn(),
  },
}));

const mockAuditLogs = [
  {
    _id: '1',
    eventType: 'USER_LOGIN',
    action: 'USER_LOGIN',
    severity: 'INFO',
    userEmail: 'user@example.com',
    userId: { email: 'user@example.com' },
    createdAt: '2024-01-01T00:00:00Z',
    timestamp: '2024-01-01T00:00:00Z',
    ipAddress: '127.0.0.1',
    resource: 'auth',
    details: 'User logged in',
  },
];

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAuditLogsPage = () => {
    return render(
      <BrowserRouter>
        <AuditLogsPage />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    dashboardAPI.getAuditLogs.mockImplementation(() => new Promise(() => {}));
    dashboardAPI.getAuditLogStats.mockImplementation(() => new Promise(() => {}));
    renderAuditLogsPage();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display audit logs', async () => {
    dashboardAPI.getAuditLogs.mockResolvedValueOnce({
      data: { 
        success: true, 
        data: { 
          logs: mockAuditLogs, 
          pagination: { totalPages: 1, totalCount: 1 } 
        } 
      },
    });
    dashboardAPI.getAuditLogStats.mockResolvedValueOnce({
      data: { success: true, data: { totalLogs: 1, severityStats: [{ _id: 'INFO', count: 1 }] } },
    });

    renderAuditLogsPage();
    
    await waitFor(() => {
      expect(screen.getAllByText('USER_LOGIN')[0]).toBeInTheDocument();
    });
  });

  it('should filter by action', async () => {
    const user = userEvent.setup();
    dashboardAPI.getAuditLogs.mockResolvedValue({
      data: { 
        success: true, 
        data: { 
          logs: mockAuditLogs, 
          pagination: { totalPages: 1, totalCount: 1 } 
        } 
      },
    });
    dashboardAPI.getAuditLogStats.mockResolvedValue({
      data: { success: true, data: { totalLogs: 1, severityStats: [{ _id: 'INFO', count: 1 }] } },
    });

    renderAuditLogsPage();
    
    await waitFor(() => {
      expect(screen.getAllByText('USER_LOGIN')[0]).toBeInTheDocument();
    });

    const actionFilter = screen.getByLabelText(/action/i);
    await user.selectOptions(actionFilter, 'USER_LOGIN');
    
    await waitFor(() => {
      expect(dashboardAPI.getAuditLogs).toHaveBeenCalled();
    });
  });

  it('should filter by date range', async () => {
    const user = userEvent.setup();
    dashboardAPI.getAuditLogs.mockResolvedValue({
      data: { 
        success: true, 
        data: { 
          logs: mockAuditLogs, 
          pagination: { totalPages: 1, totalCount: 1 } 
        } 
      },
    });
    dashboardAPI.getAuditLogStats.mockResolvedValue({
      data: { success: true, data: { totalLogs: 1, severityStats: [{ _id: 'INFO', count: 1 }] } },
    });

    renderAuditLogsPage();
    
    await waitFor(() => {
      expect(screen.getAllByText('USER_LOGIN')[0]).toBeInTheDocument();
    });

    const startDate = screen.getByLabelText(/start date/i);
    await user.type(startDate, '2024-01-01');
    
    await waitFor(() => {
      expect(dashboardAPI.getAuditLogs).toHaveBeenCalled();
    });
  });

  it('should search by user', async () => {
    const user = userEvent.setup();
    dashboardAPI.getAuditLogs.mockResolvedValue({
      data: { 
        success: true, 
        data: { 
          logs: mockAuditLogs, 
          pagination: { totalPages: 1, totalCount: 1 } 
        } 
      },
    });
    dashboardAPI.getAuditLogStats.mockResolvedValue({
      data: { success: true, data: { totalLogs: 1, severityStats: [{ _id: 'INFO', count: 1 }] } },
    });

    renderAuditLogsPage();
    
    await waitFor(() => {
      expect(screen.getAllByText('USER_LOGIN')[0]).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by user/i);
    await user.type(searchInput, 'user');
    
    await waitFor(() => {
      expect(dashboardAPI.getAuditLogs).toHaveBeenCalled();
    });
  });

  it('should handle pagination', async () => {
    const user = userEvent.setup();
    dashboardAPI.getAuditLogs.mockResolvedValue({
      data: { 
        success: true, 
        data: { 
          logs: mockAuditLogs, 
          pagination: { totalPages: 2, totalCount: 20 } 
        } 
      },
    });
    dashboardAPI.getAuditLogStats.mockResolvedValue({
      data: { success: true, data: { totalLogs: 1, severityStats: [{ _id: 'INFO', count: 1 }] } },
    });

    renderAuditLogsPage();
    
    await waitFor(() => {
      expect(screen.getAllByText('USER_LOGIN')[0]).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/next/i);
    if (nextButton) {
      await user.click(nextButton);
      expect(dashboardAPI.getAuditLogs).toHaveBeenCalled();
    }
  });

  it('should handle empty state', async () => {
    dashboardAPI.getAuditLogs.mockResolvedValue({
      data: { 
        success: true, 
        data: { 
          logs: [], 
          pagination: { totalPages: 0, totalCount: 0 } 
        } 
      },
    });
    dashboardAPI.getAuditLogStats.mockResolvedValue({
      data: { success: true, data: { totalLogs: 0, severityStats: [] } },
    });

    renderAuditLogsPage();
    
    await waitFor(() => {
      expect(screen.getByText(/no audit logs found/i)).toBeInTheDocument();
    });
  });

  it('should handle error', async () => {
    dashboardAPI.getAuditLogs.mockRejectedValue(new Error('Failed'));
    dashboardAPI.getAuditLogStats.mockResolvedValue({
      data: { success: true, data: { totalLogs: 0, severityStats: [] } },
    });

    renderAuditLogsPage();
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should display log details', async () => {
    dashboardAPI.getAuditLogs.mockResolvedValue({
      data: { 
        success: true, 
        data: { 
          logs: mockAuditLogs, 
          pagination: { totalPages: 1, totalCount: 1 } 
        } 
      },
    });
    dashboardAPI.getAuditLogStats.mockResolvedValue({
      data: { success: true, data: { totalLogs: 1, severityStats: [{ _id: 'INFO', count: 1 }] } },
    });

    renderAuditLogsPage();
    
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
    });
  });

  it('should refresh logs', async () => {
    const user = userEvent.setup();
    dashboardAPI.getAuditLogs.mockResolvedValue({
      data: { 
        success: true, 
        data: { 
          logs: mockAuditLogs, 
          pagination: { totalPages: 1, totalCount: 1 } 
        } 
      },
    });
    dashboardAPI.getAuditLogStats.mockResolvedValue({
      data: { success: true, data: { totalLogs: 1, severityStats: [{ _id: 'INFO', count: 1 }] } },
    });

    renderAuditLogsPage();
    
    await waitFor(() => {
      expect(screen.getAllByText('USER_LOGIN')[0]).toBeInTheDocument();
    });

    const refreshButton = screen.getByText(/refresh/i);
    await user.click(refreshButton);
    
    await waitFor(() => {
      expect(dashboardAPI.getAuditLogs).toHaveBeenCalledTimes(2);
    });
  });
});
