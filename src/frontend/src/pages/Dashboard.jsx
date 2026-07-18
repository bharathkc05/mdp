import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DonationStats from "../components/DonationStats";
import { authAPI } from "../api";
import { useAuth } from "../context/AuthContext";

/**
 * Donor Dashboard (Route: /dashboard)
 * Admin users are redirected to /admin immediately.
 * Donors see their donation statistics here.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Redirect admin users away immediately
  useEffect(() => {
    if (authUser?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [authUser, navigate]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data } = await authAPI.getProfile();
      const userData = data.data || data;
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.firstName || user?.name || 'Donor'}
        </h1>
        <p className="mt-1 text-gray-600">{user?.email}</p>
        <span className="inline-block mt-2 px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
          💝 Donor
        </span>
      </div>

      <div className="max-w-4xl">
        <DonationStats />
      </div>
    </div>
  );
}
