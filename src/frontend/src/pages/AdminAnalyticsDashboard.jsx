/**
 * Story 4.2: Admin Analytics Dashboard UI
 * 
 * Interactive analytics dashboard with charts for donation trends and impact visualization
 * Implements WCAG 2.1 Level AA accessibility standards
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { dashboardAPI } from '../api';
import {
  formatAnalyticsForExport,
  exportCausesSummary,
  exportDonationTrends,
  exportCategoryBreakdown,
  exportTopCauses
} from '../utils/csvExport';

// WCAG 2.1 Level AA compliant color palette with sufficient contrast
const CHART_COLORS = {
  primary: ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#059669', '#0891b2', '#6366f1'],
  category: {
    'health': '#ef4444',
    'education': '#3b82f6',
    'environment': '#10b981',
    'poverty': '#f59e0b',
    'disaster-relief': '#8b5cf6',
    'animals': '#ec4899',
    'community': '#06b6d4',
    'other': '#6b7280'
  }
};

export default function AdminAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [aggregatedData, setAggregatedData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topCauses, setTopCauses] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  
  // Filter states
  const [dateRange, setDateRange] = useState('30'); // days
  const [trendPeriod, setTrendPeriod] = useState('daily');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('currentAmount');
  
  // Export states (Story 4.3)
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAllAnalytics();
  }, [dateRange, trendPeriod, selectedCategory, sortBy]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.relative')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  const fetchAllAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
    try {
      const [aggregated, trends, categories, top, metrics] = await Promise.all([
        dashboardAPI.getAggregatedDonations({
          category: selectedCategory,
          sortBy: sortBy,
          order: 'desc'
        }),
        dashboardAPI.getDonationTrends({
          period: trendPeriod,
          limit: dateRange === '7' ? 7 : dateRange === '30' ? 30 : 90
        }),
        dashboardAPI.getCategoryBreakdown(),
        dashboardAPI.getTopCauses({ metric: 'currentAmount', limit: 10 }),
        dashboardAPI.getPerformanceMetrics()
      ]);

      setAggregatedData(aggregated.data.data);
      setTrendData(trends.data.data.trends);
      setCategoryData(categories.data.data);
      setTopCauses(top.data.data.topCauses);
      setPerformanceMetrics(metrics.data.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Story 4.3: Export handlers
  const handleExport = (exportType) => {
    setExporting(true);
    setShowExportMenu(false);
    
    try {
      const analyticsData = {
        aggregatedData,
        trendData,
        categoryData,
        topCauses,
        performanceMetrics
      };
      
      const formattedData = formatAnalyticsForExport(analyticsData, dateRange);
      
      switch (exportType) {
        case 'summary':
          exportCausesSummary(formattedData.causesSummary, dateRange);
          break;
        case 'trends':
          exportDonationTrends(formattedData.donationTrends, dateRange, trendPeriod);
          break;
        case 'categories':
          exportCategoryBreakdown(formattedData.categories, dateRange);
          break;
        case 'top':
          exportTopCauses(formattedData.topPerformers, dateRange);
          break;
        case 'all':
          // Export all as separate files
          exportCausesSummary(formattedData.causesSummary, dateRange);
          setTimeout(() => exportDonationTrends(formattedData.donationTrends, dateRange, trendPeriod), 100);
          setTimeout(() => exportCategoryBreakdown(formattedData.categories, dateRange), 200);
          setTimeout(() => exportTopCauses(formattedData.topPerformers, dateRange), 300);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  // Custom tooltip for better accessibility
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="bg-white p-4 rounded-lg shadow-lg border border-gray-200"
          role="tooltip"
          aria-live="polite"
        >
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              {typeof entry.value === 'number' && entry.name.toLowerCase().includes('amount')
                ? `$${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"
            role="status"
            aria-label="Loading analytics data"
          ></div>
          <p className="mt-4 text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="mt-2 text-gray-600">Comprehensive donation trends and impact visualization</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                aria-label="Back to admin dashboard"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Link>
              {/* Story 4.3: Export to CSV Button with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting || loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  aria-label="Export analytics data to CSV"
                  aria-haspopup="true"
                  aria-expanded={showExportMenu}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>

                {/* Export Dropdown Menu */}
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-700">Export Options</p>
                        <p className="text-xs text-gray-500 mt-1">Date range: Last {dateRange} days</p>
                      </div>
                      <button
                        onClick={() => handleExport('summary')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-gray-700">Causes Summary</span>
                      </button>
                      <button
                        onClick={() => handleExport('trends')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        <span className="text-sm text-gray-700">Donation Trends</span>
                      </button>
                      <button
                        onClick={() => handleExport('categories')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        </svg>
                        <span className="text-sm text-gray-700">Category Breakdown</span>
                      </button>
                      <button
                        onClick={() => handleExport('top')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-sm text-gray-700">Top Causes</span>
                      </button>
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={() => handleExport('all')}
                          className="w-full text-left px-4 py-2 hover:bg-green-50 transition-colors flex items-center"
                        >
                          <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span className="text-sm font-semibold text-green-700">Export All Reports</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => fetchAllAnalytics(true)}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                aria-label="Refresh analytics data"
              >
                <svg 
                  className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg" role="alert">
            <div className="flex">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Filters Section - AC3: Interactive filtering by date range */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range Filter */}
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                id="dateRange"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select date range for analytics"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>

            {/* Trend Period Filter */}
            <div>
              <label htmlFor="trendPeriod" className="block text-sm font-medium text-gray-700 mb-2">
                Trend Period
              </label>
              <select
                id="trendPeriod"
                value={trendPeriod}
                onChange={(e) => setTrendPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select trend period for time series"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Filter causes by category"
              >
                <option value="all">All Categories</option>
                <option value="health">Health</option>
                <option value="education">Education</option>
                <option value="environment">Environment</option>
                <option value="poverty">Poverty</option>
                <option value="disaster-relief">Disaster Relief</option>
                <option value="animals">Animals</option>
                <option value="community">Community</option>
              </select>
            </div>

            {/* Sort By Filter */}
            <div>
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Sort causes by metric"
              >
                <option value="currentAmount">Amount Raised</option>
                <option value="donorCount">Donor Count</option>
                <option value="percentageAchieved">Progress %</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Performance Metrics */}
        {performanceMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Raised</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${(performanceMetrics.donations?.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                From {performanceMetrics.donations?.totalDonations || 0} donations
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Active Causes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {performanceMetrics.causes?.activeCauses || 0}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {performanceMetrics.causes?.completedCauses || 0} completed
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Average Donation</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${(performanceMetrics.donations?.averageDonation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-600 mt-2">Per transaction</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {performanceMetrics.causes?.completionRate || 0}%
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Of total causes
              </p>
            </div>
          </div>
        )}

        {/* AC2: Time-Series Chart - Donation Trends Over Time */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Donation Trends Over Time
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {/* AC4: Text alternative for data visualizations */}
              {trendData.length > 0 && (
                <span role="img" aria-label={`Showing ${trendData.length} data points. Total amount: $${trendData.reduce((sum, d) => sum + (d.totalAmount || 0), 0).toLocaleString()}`}>
                  Displaying {trendPeriod} donation trends for the last {dateRange} days
                </span>
              )}
            </p>
          </div>
          
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart 
                data={trendData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  aria-label="Time period"
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  aria-label="Donation amount"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Area
                  type="monotone"
                  dataKey="totalAmount"
                  name="Total Amount ($)"
                  stroke="#2563eb"
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="donationCount"
                  name="Donation Count"
                  stroke="#7c3aed"
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No trend data available for the selected period</p>
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* AC2: Pie Chart - Category Breakdown */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                Donations by Category
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {/* AC4: Text alternative */}
                {categoryData.length > 0 && (
                  <span role="img" aria-label={`${categoryData.length} categories. Top category: ${categoryData[0]?.category || 'N/A'} with $${categoryData[0]?.totalDonations?.toLocaleString() || 0}`}>
                    Distribution of donations across {categoryData.length} categories
                  </span>
                )}
              </p>
            </div>

            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryData.map(cat => ({
                      name: cat.category.replace('-', ' ').toUpperCase(),
                      value: cat.totalDonations,
                      count: cat.totalCauses
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS.category[entry.category] || CHART_COLORS.primary[index % CHART_COLORS.primary.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No category data available</p>
              </div>
            )}
          </div>

          {/* AC2: Bar Chart - Top Performing Causes */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Top Performing Causes
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {/* AC4: Text alternative */}
                {topCauses.length > 0 && (
                  <span role="img" aria-label={`Top ${topCauses.length} causes. Highest: ${topCauses[0]?.name || 'N/A'} with $${topCauses[0]?.currentAmount?.toLocaleString() || 0}`}>
                    Causes ranked by total amount raised
                  </span>
                )}
              </p>
            </div>

            {topCauses.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={topCauses.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    aria-label="Amount raised"
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150}
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    aria-label="Cause name"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="rect" />
                  <Bar 
                    dataKey="currentAmount" 
                    name="Amount Raised ($)"
                    fill="#7c3aed"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No causes data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Performance Table */}
        {categoryData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Category Performance Details
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Category performance data">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
                    <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-900">Total Raised</th>
                    <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-900">Causes</th>
                    <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-900">Donors</th>
                    <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-900">Avg Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((cat, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: CHART_COLORS.category[cat.category] || CHART_COLORS.primary[0] }}
                            aria-hidden="true"
                          ></div>
                          <span className="font-medium text-gray-900 capitalize">
                            {cat.category.replace('-', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900">
                        ${cat.totalDonations.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">
                        {cat.totalCauses} ({cat.activeCauses} active)
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">
                        {cat.totalDonors.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-semibold ${
                          cat.averageCompletion >= 75 ? 'text-green-600' :
                          cat.averageCompletion >= 50 ? 'text-blue-600' :
                          cat.averageCompletion >= 25 ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {cat.averageCompletion}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Micro Donation Platform • Analytics Dashboard</p>
          <p className="mt-1">Story 4.2: Admin Analytics Dashboard UI with Interactive Charts</p>
        </div>
      </div>
    </div>
  );
}
