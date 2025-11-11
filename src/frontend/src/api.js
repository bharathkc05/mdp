import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

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
  makeDonation: (data) => API.post("/donate", data),
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
};




