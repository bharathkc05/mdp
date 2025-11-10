import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DonationForm from "../components/DonationForm";
import DonationStats from "../components/DonationStats";
import TwoFactorSetup from "../components/TwoFactorSetup";
import { authAPI } from "../api";

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
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Admin-specific section for 2FA */}
      {user?.role === 'admin' && (
        <div className="mb-8">
          <TwoFactorSetup />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <DonationStats />
        </div>
        <div>
          <DonationForm />
        </div>
      </div>
    </div>
  );
}
