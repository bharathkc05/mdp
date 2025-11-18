import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import DonationStats from "../components/DonationStats";
import TwoFactorSetup from "../components/TwoFactorSetup";
import { authAPI } from "../api";

/**
 * User Profile Page (Route: /dashboard)
 * 
 * IMPORTANT NAMING CONVENTION:
 * - Route name: "/dashboard" (kept for backend compatibility and convention)
 * - UI Label: "Profile" (displayed in navbar for better UX clarity)
 * 
 * This page displays role-specific content:
 * - Admin users: See admin tools navigation and 2FA setup (NO donation features)
 * - Donor users: See donation statistics and donation forms (NO admin tools)
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data } = await authAPI.getProfile();
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name || user?.firstName || 'User'}</h1>
          <p className="mt-1 text-gray-600">{user?.email}</p>
          {user?.role && (
            <span className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${
              user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {user.role === 'admin' ? '👑 Admin' : '💝 Donor'}
            </span>
          )}
        </div>
      </div>

      {/* Admin-specific section */}
      {user?.role === 'admin' && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Tools</h2>
            <p className="text-gray-600 mb-4">Access administrative features and platform management</p>
            <Link
              to="/admin"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Go to Admin Dashboard
            </Link>
          </div>
          <TwoFactorSetup />
        </div>
      )}

      {/* Donor-specific section - Donation Statistics */}
      {user?.role === 'donor' && (
        <div className="max-w-4xl">
          <DonationStats />
        </div>
      )}
    </div>
  );
}
