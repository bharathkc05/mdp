import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, systemAPI } from '../api';
import { formatCurrencySync, invalidateConfigCache } from '../utils/currencyFormatter';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentCauses, setRecentCauses] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [systemStatus, setSystemStatus] = useState({
    backend: 'checking',
    database: 'checking',
    auth: 'checking'
  });

  useEffect(() => {
    fetchDashboardData();
    checkSystemHealth();
    // Check system health every 30 seconds
    const healthInterval = setInterval(checkSystemHealth, 30000);

    // Listen for config updates
    const handleConfigUpdate = () => {
      invalidateConfigCache();
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('platformConfigUpdated', handleConfigUpdate);
    return () => {
      clearInterval(healthInterval);
      window.removeEventListener('platformConfigUpdated', handleConfigUpdate);
    };
  }, []);

  const checkSystemHealth = async () => {
    try {
      const response = await systemAPI.getHealth();
      const isUp = response.status === 200 && response.data?.status === 'UP';
      const dbConnected = response.data?.database?.status === 'connected';
      
      setSystemStatus({
        backend: isUp ? 'operational' : 'down',
        database: dbConnected ? 'connected' : 'disconnected',
        auth: isUp ? 'active' : 'inactive'
      });
    } catch (error) {
      setSystemStatus({
        backend: 'down',
        database: 'disconnected',
        auth: 'inactive'
      });
    }
  };

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [statsRes, causesRes, usersRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getCauses({ page: 1, limit: 5 }),
        adminAPI.getUsers()
      ]);
      
      setStats(statsRes.data.data);
      setRecentCauses(causesRes.data.data);
      setRecentUsers(usersRes.data.data.slice(0, 5));
      setError('');
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load dashboard data. ';
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage += 'Backend server is not running. Please start the server with: npm run dev';
      } else if (error.response?.status === 401) {
        errorMessage += 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error. Check backend logs for details.';
      } else {
        errorMessage += 'Please check if the backend server is running and try refreshing the page.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const fundingPercentage = stats?.donations?.targetAmount > 0
    ? Math.round((stats.donations.totalAmount / stats.donations.targetAmount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-gray-600">Comprehensive platform overview and management</p>
            </div>
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              aria-label="Refresh dashboard data"
            >
              <svg 
                className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-md" role="alert">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-red-800 font-semibold">Error Loading Dashboard</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <button
                  onClick={() => fetchDashboardData(true)}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State - No Error but No Data */}
        {!error && stats && stats.users?.total === 0 && stats.causes?.total === 0 && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg shadow-md">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-blue-800 font-semibold">Welcome to the Micro Donation Platform!</p>
                <p className="text-blue-700 text-sm mt-2">
                  Your platform is ready, but there's no data yet. Get started by:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-blue-700">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Creating your first cause via <Link to="/admin/causes" className="font-semibold underline hover:text-blue-900">Manage Causes</Link>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Inviting donors to register and browse causes
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Configuring platform settings in <Link to="/admin/config" className="font-semibold underline hover:text-blue-900">Platform Config</Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border-l-4 border-blue-500 transform hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.users?.total || 0}</p>
                <div className="mt-2 flex items-center text-xs">
                  <span className="text-blue-600 font-semibold">{stats?.users?.donors || 0} Donors</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="text-purple-600 font-semibold">{stats?.users?.admins || 0} Admins</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-full p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Causes */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border-l-4 border-green-500 transform hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Causes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.causes?.total || 0}</p>
                <div className="mt-2 flex items-center text-xs">
                  <span className="text-green-600 font-semibold">{stats?.causes?.active || 0} Active</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="text-amber-600 font-semibold">{stats?.causes?.paused || 0} Paused</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-full p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Donations */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border-l-4 border-purple-500 transform hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Donations</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrencySync(stats?.donations?.totalAmount || 0)}
                </p>
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  <span className="text-purple-600">{stats?.donations?.totalDonors || 0}</span> unique donors
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-full p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Funding Progress */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border-l-4 border-orange-500 transform hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Overall Progress</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{fundingPercentage}%</p>
                <p className="text-xs text-gray-600 mt-2">
                  Target: <span className="font-semibold text-orange-600">{formatCurrencySync(stats?.donations?.targetAmount || 0)}</span>
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-full p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(fundingPercentage, 100)}%` }}
                  role="progressbar"
                  aria-valuenow={fundingPercentage}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              to="/admin/causes"
              className="group bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="flex items-center text-white">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4 group-hover:bg-opacity-30 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Manage Causes</h3>
                  <p className="text-blue-100 text-sm mt-1">Create, edit, and archive causes</p>
                </div>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              to="/admin/users"
              className="group bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="flex items-center text-white">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4 group-hover:bg-opacity-30 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Manage Users</h3>
                  <p className="text-green-100 text-sm mt-1">View and update user roles</p>
                </div>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              to="/admin/analytics"
              className="group bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="flex items-center text-white">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4 group-hover:bg-opacity-30 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Analytics Dashboard</h3>
                  <p className="text-purple-100 text-sm mt-1">View trends and insights</p>
                </div>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              to="/admin/audit-logs"
              className="group bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="flex items-center text-white">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4 group-hover:bg-opacity-30 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Audit Logs</h3>
                  <p className="text-indigo-100 text-sm mt-1">View system activity logs</p>
                </div>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              to="/admin/previous-donations"
              className="group bg-gradient-to-br from-teal-500 to-teal-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="flex items-center text-white">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4 group-hover:bg-opacity-30 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h4l3 6 4-12 3 6h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Previous Donations</h3>
                  <p className="text-teal-100 text-sm mt-1">View and export donor contributions</p>
                </div>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              to="/admin/donations-by-user"
              className="group bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="flex items-center text-white">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4 group-hover:bg-opacity-30 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h4l3 6 4-12 3 6h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Donations By User</h3>
                  <p className="text-yellow-100 text-sm mt-1">View aggregated donor totals</p>
                </div>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              to="/admin/config"
              className="group bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="flex items-center text-white">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4 group-hover:bg-opacity-30 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Platform Config</h3>
                  <p className="text-orange-100 text-sm mt-1">Minimum donation & currency</p>
                </div>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              to="/dashboard"
              className="group bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="flex items-center text-white">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4 group-hover:bg-opacity-30 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">2FA Settings</h3>
                  <p className="text-pink-100 text-sm mt-1">Two-factor authentication</p>
                </div>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Causes */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Recent Causes
              </h2>
              <Link to="/admin/causes" className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center group">
                View All 
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="space-y-3">
              {recentCauses.map((cause) => (
                <div key={cause._id} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex-1">{cause.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ml-2 ${
                      cause.status === 'active' ? 'bg-green-100 text-green-800' :
                      cause.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      cause.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {cause.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 capitalize mb-3">
                    {cause.category.replace('-', ' ')} • {cause.donorCount || 0} donors
                  </p>
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-700 font-medium mb-1">
                      <span>{formatCurrencySync(cause.currentAmount || 0)} raised</span>
                      <span>{cause.percentageAchieved || 0}% of {formatCurrencySync(cause.targetAmount || 0)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          (cause.percentageAchieved || 0) >= 100 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                          (cause.percentageAchieved || 0) >= 75 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                          'bg-gradient-to-r from-orange-400 to-orange-600'
                        }`}
                        style={{ width: `${Math.min(cause.percentageAchieved || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
              {recentCauses.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500">No causes found</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Recent Users
              </h2>
              <Link to="/admin/users" className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center group">
                View All 
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user._id} className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md ${
                    user.role === 'admin' 
                      ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
                      : 'bg-gradient-to-br from-blue-400 to-blue-600'
                  }`}>
                    {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="font-semibold text-gray-900">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {user.isTwoFactorEnabled && (
                      <div className="flex items-center mt-1">
                        <svg className="w-3 h-3 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-green-600 font-medium">2FA Enabled</span>
                      </div>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                    user.role === 'admin' 
                      ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800' 
                      : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
                  }`}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500">No users found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Backend Server Status */}
            <div className={`flex items-center p-4 rounded-lg border ${
              systemStatus.backend === 'operational' 
                ? 'bg-green-50 border-green-200' 
                : systemStatus.backend === 'checking'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`rounded-full p-2 mr-4 relative ${
                systemStatus.backend === 'operational' 
                  ? 'bg-green-500' 
                  : systemStatus.backend === 'checking'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}>
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                {systemStatus.backend === 'operational' && (
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Backend Server</p>
                <p className={`text-xs font-semibold ${
                  systemStatus.backend === 'operational' 
                    ? 'text-green-600' 
                    : systemStatus.backend === 'checking'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  ● {systemStatus.backend === 'operational' ? 'Operational' : systemStatus.backend === 'checking' ? 'Checking...' : 'Offline'}
                </p>
              </div>
            </div>
            
            {/* Database Status */}
            <div className={`flex items-center p-4 rounded-lg border ${
              systemStatus.database === 'connected' 
                ? 'bg-green-50 border-green-200' 
                : systemStatus.database === 'checking'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`rounded-full p-2 mr-4 relative ${
                systemStatus.database === 'connected' 
                  ? 'bg-green-500' 
                  : systemStatus.database === 'checking'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}>
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                {systemStatus.database === 'connected' && (
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Database</p>
                <p className={`text-xs font-semibold ${
                  systemStatus.database === 'connected' 
                    ? 'text-green-600' 
                    : systemStatus.database === 'checking'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  ● {systemStatus.database === 'connected' ? 'Connected' : systemStatus.database === 'checking' ? 'Checking...' : 'Disconnected'}
                </p>
              </div>
            </div>
            
            {/* Authentication Status */}
            <div className={`flex items-center p-4 rounded-lg border ${
              systemStatus.auth === 'active' 
                ? 'bg-green-50 border-green-200' 
                : systemStatus.auth === 'checking'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`rounded-full p-2 mr-4 relative ${
                systemStatus.auth === 'active' 
                  ? 'bg-green-500' 
                  : systemStatus.auth === 'checking'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}>
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                {systemStatus.auth === 'active' && (
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Authentication</p>
                <p className={`text-xs font-semibold ${
                  systemStatus.auth === 'active' 
                    ? 'text-green-600' 
                    : systemStatus.auth === 'checking'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  ● {systemStatus.auth === 'active' ? 'Active' : systemStatus.auth === 'checking' ? 'Checking...' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Micro Donation Platform • Admin Dashboard v1.0</p>
          <p className="mt-1">Story 3.1 (MDP-S-13): Admin Dashboard for Cause Management</p>
        </div>
      </div>
    </div>
  );
}
