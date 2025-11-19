import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Verify from "./pages/Verify";
import Home from "./pages/Home";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import BrowseCauses from "./pages/BrowseCauses";
import CauseDetails from "./pages/CauseDetails";
import MultiCauseDonation from "./pages/MultiCauseDonation";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCauseDashboard from "./pages/AdminCauseDashboard";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminAnalyticsDashboard from "./pages/AdminAnalyticsDashboard";
import AuditLogsPage from "./pages/AuditLogsPage";
import AdminPlatformConfig from "./pages/AdminPlatformConfig";
import AdminDonationsByUser from "./pages/AdminDonationsByUser";
import MyDonations from "./pages/MyDonations";
import AdminPreviousDonations from "./pages/AdminPreviousDonations";
import { initializeCurrencyConfig } from "./utils/currencyFormatter";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if token exists and is valid
    const token = localStorage.getItem("token");
    
    // Story 2.6: Initialize currency configuration
    initializeCurrencyConfig().catch(err => 
      console.error('Failed to load currency config:', err)
    );
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    // You can add token validation logic here if needed
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/causes" element={<BrowseCauses />} />
            <Route
              path="/causes/:id"
              element={
                <CauseDetails />
              }
            />
            <Route
              path="/donate/multi"
              element={
                <ProtectedRoute>
                  <MultiCauseDonation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  {/* Note: /dashboard is the User Profile page - shows role-specific content */}
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/donations"
              element={
                <ProtectedRoute>
                  <MyDonations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  {/* Note: /admin is the Admin Dashboard - admin-only management interface */}
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/causes"
              element={
                <AdminRoute>
                  <AdminCauseDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUserManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <AdminRoute>
                  <AdminAnalyticsDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/donations-by-user"
              element={
                <AdminRoute>
                  <AdminDonationsByUser />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <AdminRoute>
                  <AuditLogsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/previous-donations"
              element={
                <AdminRoute>
                  <AdminPreviousDonations />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/config"
              element={
                <AdminRoute>
                  <AdminPlatformConfig />
                </AdminRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
