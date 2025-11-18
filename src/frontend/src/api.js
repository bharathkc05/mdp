import axios from "axios";

// Use relative path in production (Vercel) or localhost in development
// Check for localhost explicitly to determine if we're in development
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const baseURL = import.meta.env.VITE_API_URL || 
  (isDevelopment ? "http://localhost:3000/api" : "/api");

// Helper to clean API paths
const cleanPath = (path) => {
  // Remove any duplicate /api/auth prefixes
  return path.replace(/\/api\/auth\/api\/auth/, '/api/auth');
};

export const API = axios.create({
  baseURL,
  withCredentials: true
});

// Add request interceptor to clean URLs
API.interceptors.request.use(
  (config) => {
    config.url = cleanPath(config.url);
    return config;
  }
);

// Request interceptor for API calls
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    Promise.reject(error);
  }
);

// Response interceptor for API calls
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Redirect to login page if unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials) => {
    try {
      return await API.post("/auth/login", credentials);
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data?.message ? error : { response: { data: { message: 'Login failed' } } };
    }
  },
  register: async (userData) => {
    try {
      return await API.post("/auth/register", userData);
    } catch (error) {
      console.error('Registration error:', error);
      throw error.response?.data?.message ? error : { response: { data: { message: 'Registration failed' } } };
    }
  },
  verify: async (token) => {
    try {
      // Make sure to use the correct path
      const response = await API.get(`/auth/verify?token=${token}`);
      console.log('Verification response:', response);
      return response;
    } catch (error) {
      console.error('Verification error:', error);
      throw error.response?.data?.message ? error : { response: { data: { message: 'Verification failed' } } };
    }
  },
  getProfile: () => API.get("/auth/profile"),
  updateProfile: (data) => API.put("/auth/profile", data),
};

// Donations API
export const donationsAPI = {
  getDonations: () => API.get("/donate/history"),
  getCauses: () => API.get("/donate/causes"),
  makeDonation: (data) => API.post("/donate", data),
  downloadReceipt: (paymentId) => API.get(`/donate/receipt/${paymentId}`, { responseType: 'blob' }),
  getStats: () => API.get("/donate/stats"),
};

// System Health API
export const systemAPI = {
  getHealth: async () => {
    try {
      const response = await axios.get(`${baseURL.replace('/api', '')}/health`, {
        timeout: 5000 // 5 second timeout
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Dashboard Analytics API (Story 4.1 & 4.2)
export const dashboardAPI = {
  getAggregatedDonations: (params) => API.get("/dashboard/aggregated-donations", { params }),
  getDonationTrends: (params) => API.get("/dashboard/donation-trends", { params }),
  getCategoryBreakdown: () => API.get("/dashboard/category-breakdown"),
  getTopCauses: (params) => API.get("/dashboard/top-causes", { params }),
  getDonorInsights: () => API.get("/dashboard/donor-insights"),
  getPerformanceMetrics: () => API.get("/dashboard/performance-metrics"),
  
  // Story 3.4: Audit Logs API
  getAuditLogs: (params) => API.get(`/admin/audit-logs?${params}`),
  getAuditLogStats: () => API.get("/admin/audit-logs/stats"),
  getAuditLog: (id) => API.get(`/admin/audit-logs/${id}`),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getDashboardStats: () => API.get("/admin/dashboard/stats"),
  
  // Causes management
  getCauses: (params) => API.get("/admin/causes", { params }),
  getCause: (id) => API.get(`/admin/causes/${id}`),
  createCause: (data) => API.post("/admin/causes", data),
  updateCause: (id, data) => API.put(`/admin/causes/${id}`, data),
  deleteCause: (id) => API.delete(`/admin/causes/${id}`),
  archiveCause: (id) => API.patch(`/admin/causes/${id}/archive`),
  
  // Users management
  getUsers: () => API.get("/admin/users"),
  getUser: (id) => API.get(`/admin/users/${id}`),
  updateUserRole: (id, role) => API.put(`/admin/users/${id}/role`, { role }),
  getPreviousDonations: (options) => API.get('/admin/previous-donations', options),
  getDonationsByUser: () => API.get('/admin/donations/by-user'),
};

// Platform Configuration API (Story 2.6)
export const configAPI = {
  getConfig: () => API.get("/config"),
  updateConfig: (data) => API.put("/config", data),
  getCurrencyPresets: () => API.get("/config/currency-presets"),
};




