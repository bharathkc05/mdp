import axios from "axios";

// Use relative path in production (Vercel) or localhost in development
const isDevelopment = import.meta.env.MODE === 'development' || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';
  
const baseURL = isDevelopment ? "http://localhost:3000/api" : "/api";

export const API_BASE_URL = baseURL;

export const API = axios.create({
  baseURL,
  withCredentials: true
});

// Request interceptor for API calls (Tokens are now HttpOnly cookies, so no need to attach headers here)
API.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Redirect to login page if unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (window.location.pathname !== '/login') {
        window.location.href = "/login";
      }
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
  logout: async () => {
    try {
      return await API.post("/auth/logout");
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  resendVerification: async (email) => {
    return await API.post("/auth/resend-verification", { email });
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
  getProfile: () => API.get("/users/me"),
  updateProfile: (data) => API.put("/users/me", data),
};

// Donations API
export const donationsAPI = {
  getDonations: () => API.get("/donate/history"),
  getCauses: () => API.get("/causes"),
  makeDonation: (data) => API.post("/donate", data),
  downloadReceipt: (paymentId) => API.get(`/donate/receipt/${paymentId}`, { responseType: 'blob' }),
  getStats: () => API.get("/donate/stats"),
};

// System Health API
export const systemAPI = {
  getHealth: async () => {
    try {
      const response = await axios.get(`${baseURL}/health`, {
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
  getDashboardStats: () => API.get("/dashboard/stats"),
  
  // Causes management
  getCauses: (params) => API.get("/causes/admin", { params }),
  getCause: (id) => API.get(`/causes/admin/${id}`),
  createCause: (data) => API.post("/causes/admin", data),
  updateCause: (id, data) => API.put(`/causes/admin/${id}`, data),
  deleteCause: (id) => API.delete(`/causes/admin/${id}`),
  archiveCause: (id) => API.patch(`/causes/admin/${id}/archive`),
  
  // Users management
  getUsers: () => API.get("/users"),
  getUser: (id) => API.get(`/users/${id}`),
  updateUserRole: (id, role) => API.put(`/users/${id}/role`, { role }),
  getPreviousDonations: (options) => API.get('/donate/admin/previous-donations', options),
  getDonationsByUser: () => API.get('/donate/admin/by-user'),
};

// Platform Configuration API (Story 2.6)
export const configAPI = {
  getConfig: () => API.get("/config"),
  updateConfig: (data) => API.put("/config", data),
  getCurrencyPresets: () => API.get("/config/currency-presets"),
};




