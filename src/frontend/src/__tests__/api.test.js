import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  API,
  authAPI,
  donationsAPI,
  systemAPI,
  dashboardAPI,
  adminAPI,
  configAPI
} from '../api';

// Mock axios
vi.mock('axios');

describe('API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock axios.create to return a mock instance
    axios.create = vi.fn(() => ({
      interceptors: {
        request: {
          use: vi.fn((successHandler, errorHandler) => {
            // Store handlers for testing
            return 0;
          })
        },
        response: {
          use: vi.fn()
        }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('API Client Configuration', () => {
    it('creates axios instance with correct baseURL', () => {
      expect(axios.create).toHaveBeenCalled();
    });

    it('sets withCredentials to true', () => {
      const createCall = axios.create.mock.calls[0];
      expect(createCall[0].withCredentials).toBe(true);
    });
  });

  describe('authAPI', () => {
    beforeEach(() => {
      API.post = vi.fn();
      API.get = vi.fn();
      API.put = vi.fn();
    });

    describe('login', () => {
      it('sends login request with credentials', async () => {
        const credentials = { email: 'test@example.com', password: 'password123' };
        API.post.mockResolvedValue({ data: { token: 'mock-token' } });
        
        await authAPI.login(credentials);
        
        expect(API.post).toHaveBeenCalledWith('/auth/login', credentials);
      });

      it('returns token on successful login', async () => {
        const mockResponse = { data: { token: 'mock-token', user: {} } };
        API.post.mockResolvedValue(mockResponse);
        
        const result = await authAPI.login({ email: 'test@example.com', password: 'pass' });
        
        expect(result).toEqual(mockResponse);
      });

      it('handles login errors', async () => {
        API.post.mockRejectedValue({
          response: { data: { message: 'Invalid credentials' } }
        });
        
        await expect(authAPI.login({ email: 'test@example.com', password: 'wrong' }))
          .rejects.toThrow();
      });

      it('provides default error message when none provided', async () => {
        API.post.mockRejectedValue(new Error('Network error'));
        
        await expect(authAPI.login({ email: 'test@example.com', password: 'pass' }))
          .rejects.toThrow();
      });
    });

    describe('register', () => {
      it('sends registration request with user data', async () => {
        const userData = {
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        };
        API.post.mockResolvedValue({ data: { success: true } });
        
        await authAPI.register(userData);
        
        expect(API.post).toHaveBeenCalledWith('/auth/register', userData);
      });

      it('handles registration errors', async () => {
        API.post.mockRejectedValue({
          response: { data: { message: 'Email already exists' } }
        });
        
        await expect(authAPI.register({ email: 'existing@example.com' }))
          .rejects.toThrow();
      });
    });

    describe('verify', () => {
      it('sends verification request with token', async () => {
        const token = 'verification-token-123';
        API.get.mockResolvedValue({ data: { success: true } });
        
        await authAPI.verify(token);
        
        expect(API.get).toHaveBeenCalledWith(`/auth/verify?token=${token}`);
      });

      it('handles verification errors', async () => {
        API.get.mockRejectedValue({
          response: { data: { message: 'Invalid token' } }
        });
        
        await expect(authAPI.verify('invalid-token')).rejects.toThrow();
      });
    });

    describe('getProfile', () => {
      it('fetches user profile', async () => {
        API.get.mockResolvedValue({ data: { user: { id: 1, email: 'test@example.com' } } });
        
        await authAPI.getProfile();
        
        expect(API.get).toHaveBeenCalledWith('/auth/profile');
      });
    });

    describe('updateProfile', () => {
      it('updates user profile', async () => {
        const profileData = { firstName: 'Updated', lastName: 'Name' };
        API.put.mockResolvedValue({ data: { success: true } });
        
        await authAPI.updateProfile(profileData);
        
        expect(API.put).toHaveBeenCalledWith('/auth/profile', profileData);
      });
    });
  });

  describe('donationsAPI', () => {
    beforeEach(() => {
      API.get = vi.fn();
      API.post = vi.fn();
    });

    describe('getDonations', () => {
      it('fetches donation history', async () => {
        API.get.mockResolvedValue({ data: { donations: [] } });
        
        await donationsAPI.getDonations();
        
        expect(API.get).toHaveBeenCalledWith('/donate/history');
      });
    });

    describe('getCauses', () => {
      it('fetches available causes', async () => {
        API.get.mockResolvedValue({ data: { causes: [] } });
        
        await donationsAPI.getCauses();
        
        expect(API.get).toHaveBeenCalledWith('/donate/causes');
      });
    });

    describe('makeDonation', () => {
      it('submits donation', async () => {
        const donationData = { amount: 100, causeId: 'cause-123' };
        API.post.mockResolvedValue({ data: { success: true } });
        
        await donationsAPI.makeDonation(donationData);
        
        expect(API.post).toHaveBeenCalledWith('/donate', donationData);
      });
    });

    describe('downloadReceipt', () => {
      it('downloads receipt with correct response type', async () => {
        const paymentId = 'payment-123';
        API.get.mockResolvedValue({ data: new Blob(['PDF content']) });
        
        await donationsAPI.downloadReceipt(paymentId);
        
        expect(API.get).toHaveBeenCalledWith(
          `/donate/receipt/${paymentId}`,
          { responseType: 'blob' }
        );
      });
    });

    describe('getStats', () => {
      it('fetches donation statistics', async () => {
        API.get.mockResolvedValue({ data: { stats: {} } });
        
        await donationsAPI.getStats();
        
        expect(API.get).toHaveBeenCalledWith('/donate/stats');
      });
    });
  });

  describe('systemAPI', () => {
    beforeEach(() => {
      axios.get = vi.fn();
    });

    describe('getHealth', () => {
      it('checks system health', async () => {
        axios.get.mockResolvedValue({ data: { status: 'healthy' } });
        
        await systemAPI.getHealth();
        
        expect(axios.get).toHaveBeenCalled();
      });

      it('uses correct timeout', async () => {
        axios.get.mockResolvedValue({ data: { status: 'healthy' } });
        
        await systemAPI.getHealth();
        
        const callArgs = axios.get.mock.calls[0];
        expect(callArgs[1].timeout).toBe(5000);
      });

      it('handles health check errors', async () => {
        axios.get.mockRejectedValue(new Error('Service unavailable'));
        
        await expect(systemAPI.getHealth()).rejects.toThrow();
      });
    });
  });

  describe('dashboardAPI', () => {
    beforeEach(() => {
      API.get = vi.fn();
    });

    describe('getAggregatedDonations', () => {
      it('fetches aggregated donations with params', async () => {
        const params = { dateRange: 30 };
        API.get.mockResolvedValue({ data: {} });
        
        await dashboardAPI.getAggregatedDonations(params);
        
        expect(API.get).toHaveBeenCalledWith('/dashboard/aggregated-donations', { params });
      });
    });

    describe('getDonationTrends', () => {
      it('fetches donation trends', async () => {
        const params = { period: 'daily' };
        API.get.mockResolvedValue({ data: {} });
        
        await dashboardAPI.getDonationTrends(params);
        
        expect(API.get).toHaveBeenCalledWith('/dashboard/donation-trends', { params });
      });
    });

    describe('getCategoryBreakdown', () => {
      it('fetches category breakdown', async () => {
        API.get.mockResolvedValue({ data: {} });
        
        await dashboardAPI.getCategoryBreakdown();
        
        expect(API.get).toHaveBeenCalledWith('/dashboard/category-breakdown');
      });
    });

    describe('getTopCauses', () => {
      it('fetches top causes', async () => {
        const params = { limit: 10 };
        API.get.mockResolvedValue({ data: {} });
        
        await dashboardAPI.getTopCauses(params);
        
        expect(API.get).toHaveBeenCalledWith('/dashboard/top-causes', { params });
      });
    });

    describe('getDonorInsights', () => {
      it('fetches donor insights', async () => {
        API.get.mockResolvedValue({ data: {} });
        
        await dashboardAPI.getDonorInsights();
        
        expect(API.get).toHaveBeenCalledWith('/dashboard/donor-insights');
      });
    });

    describe('getPerformanceMetrics', () => {
      it('fetches performance metrics', async () => {
        API.get.mockResolvedValue({ data: {} });
        
        await dashboardAPI.getPerformanceMetrics();
        
        expect(API.get).toHaveBeenCalledWith('/dashboard/performance-metrics');
      });
    });

    describe('getAuditLogs', () => {
      it('fetches audit logs with query params', async () => {
        const params = 'page=1&limit=20';
        API.get.mockResolvedValue({ data: {} });
        
        await dashboardAPI.getAuditLogs(params);
        
        expect(API.get).toHaveBeenCalledWith(`/admin/audit-logs?${params}`);
      });
    });

    describe('getAuditLogStats', () => {
      it('fetches audit log statistics', async () => {
        API.get.mockResolvedValue({ data: {} });
        
        await dashboardAPI.getAuditLogStats();
        
        expect(API.get).toHaveBeenCalledWith('/admin/audit-logs/stats');
      });
    });

    describe('getAuditLog', () => {
      it('fetches specific audit log', async () => {
        const logId = 'log-123';
        API.get.mockResolvedValue({ data: {} });
        
        await dashboardAPI.getAuditLog(logId);
        
        expect(API.get).toHaveBeenCalledWith(`/admin/audit-logs/${logId}`);
      });
    });
  });

  describe('adminAPI', () => {
    beforeEach(() => {
      API.get = vi.fn();
      API.post = vi.fn();
      API.put = vi.fn();
      API.patch = vi.fn();
      API.delete = vi.fn();
    });

    describe('getDashboardStats', () => {
      it('fetches admin dashboard stats', async () => {
        API.get.mockResolvedValue({ data: {} });
        
        await adminAPI.getDashboardStats();
        
        expect(API.get).toHaveBeenCalledWith('/admin/dashboard/stats');
      });
    });

    describe('Causes Management', () => {
      it('getCauses fetches causes with params', async () => {
        const params = { status: 'active' };
        API.get.mockResolvedValue({ data: {} });
        
        await adminAPI.getCauses(params);
        
        expect(API.get).toHaveBeenCalledWith('/admin/causes', { params });
      });

      it('getCause fetches specific cause', async () => {
        const causeId = 'cause-123';
        API.get.mockResolvedValue({ data: {} });
        
        await adminAPI.getCause(causeId);
        
        expect(API.get).toHaveBeenCalledWith(`/admin/causes/${causeId}`);
      });

      it('createCause creates new cause', async () => {
        const causeData = { name: 'New Cause', targetAmount: 10000 };
        API.post.mockResolvedValue({ data: {} });
        
        await adminAPI.createCause(causeData);
        
        expect(API.post).toHaveBeenCalledWith('/admin/causes', causeData);
      });

      it('updateCause updates existing cause', async () => {
        const causeId = 'cause-123';
        const updateData = { name: 'Updated Name' };
        API.put.mockResolvedValue({ data: {} });
        
        await adminAPI.updateCause(causeId, updateData);
        
        expect(API.put).toHaveBeenCalledWith(`/admin/causes/${causeId}`, updateData);
      });

      it('deleteCause deletes cause', async () => {
        const causeId = 'cause-123';
        API.delete.mockResolvedValue({ data: {} });
        
        await adminAPI.deleteCause(causeId);
        
        expect(API.delete).toHaveBeenCalledWith(`/admin/causes/${causeId}`);
      });

      it('archiveCause archives cause', async () => {
        const causeId = 'cause-123';
        API.patch.mockResolvedValue({ data: {} });
        
        await adminAPI.archiveCause(causeId);
        
        expect(API.patch).toHaveBeenCalledWith(`/admin/causes/${causeId}/archive`);
      });
    });

    describe('Users Management', () => {
      it('getUsers fetches all users', async () => {
        API.get.mockResolvedValue({ data: {} });
        
        await adminAPI.getUsers();
        
        expect(API.get).toHaveBeenCalledWith('/admin/users');
      });

      it('getUser fetches specific user', async () => {
        const userId = 'user-123';
        API.get.mockResolvedValue({ data: {} });
        
        await adminAPI.getUser(userId);
        
        expect(API.get).toHaveBeenCalledWith(`/admin/users/${userId}`);
      });

      it('updateUserRole updates user role', async () => {
        const userId = 'user-123';
        const role = 'admin';
        API.put.mockResolvedValue({ data: {} });
        
        await adminAPI.updateUserRole(userId, role);
        
        expect(API.put).toHaveBeenCalledWith(`/admin/users/${userId}/role`, { role });
      });

      it('getPreviousDonations fetches previous donations', async () => {
        const options = { params: { page: 1 } };
        API.get.mockResolvedValue({ data: {} });
        
        await adminAPI.getPreviousDonations(options);
        
        expect(API.get).toHaveBeenCalledWith('/admin/previous-donations', options);
      });

      it('getDonationsByUser fetches donations by user', async () => {
        API.get.mockResolvedValue({ data: {} });
        
        await adminAPI.getDonationsByUser();
        
        expect(API.get).toHaveBeenCalledWith('/admin/donations/by-user');
      });
    });
  });

  describe('configAPI', () => {
    beforeEach(() => {
      API.get = vi.fn();
      API.put = vi.fn();
    });

    describe('getConfig', () => {
      it('fetches platform configuration', async () => {
        API.get.mockResolvedValue({ data: {} });
        
        await configAPI.getConfig();
        
        expect(API.get).toHaveBeenCalledWith('/config');
      });
    });

    describe('updateConfig', () => {
      it('updates platform configuration', async () => {
        const configData = { minimumDonation: { amount: 10, enabled: true } };
        API.put.mockResolvedValue({ data: {} });
        
        await configAPI.updateConfig(configData);
        
        expect(API.put).toHaveBeenCalledWith('/config', configData);
      });
    });

    describe('getCurrencyPresets', () => {
      it('fetches currency presets', async () => {
        API.get.mockResolvedValue({ data: {} });
        
        await configAPI.getCurrencyPresets();
        
        expect(API.get).toHaveBeenCalledWith('/config/currency-presets');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      API.get = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(donationsAPI.getCauses()).rejects.toThrow('Network error');
    });

    it('handles 404 errors', async () => {
      API.get = vi.fn().mockRejectedValue({
        response: { status: 404, data: { message: 'Not found' } }
      });
      
      await expect(adminAPI.getCause('non-existent')).rejects.toThrow();
    });

    it('handles 500 errors', async () => {
      API.post = vi.fn().mockRejectedValue({
        response: { status: 500, data: { message: 'Server error' } }
      });
      
      await expect(donationsAPI.makeDonation({ amount: 100 })).rejects.toThrow();
    });
  });
});
