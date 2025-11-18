import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { donationsAPI } from '../api';
import { formatCurrencySync, invalidateConfigCache } from '../utils/currencyFormatter';

export default function DonationStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchStats();

    // Listen for config updates and force re-render
    const handleConfigUpdate = () => {
      invalidateConfigCache();
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('platformConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('platformConfigUpdated', handleConfigUpdate);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await donationsAPI.getStats();
      console.log('Stats response:', response.data); // Debug log
      setStats(response.data.data); // Access the nested data property
    } catch (error) {
      console.error('Stats fetch error:', error);
      setError('Failed to load donation statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading statistics...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-4">{error}</div>;
  }

  if (!stats) return null;

  // Safely access stats with default values
  const totalDonated = stats.totalDonated || 0;
  const donationCount = stats.donationCount || 0;
  const donationsByCause = stats.donationsByCause || [];
  const averageDonation = stats.averageDonation || 0;
  const mostSupportedCause = stats.mostSupportedCause;

  // Prepare data for pie chart
  const pieChartData = donationsByCause.map((cause, index) => ({
    name: cause.cause || 'Unknown Cause',
    value: cause.totalAmount || 0,
    count: cause.count || 0,
    // Use predefined colors for accessibility
    color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'][index % 6]
  }));

  // Custom tooltip for accessibility
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg" role="tooltip">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Amount: {formatCurrencySync(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Donations: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">Your Donation Impact</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Donated</p>
          <p className="text-2xl font-bold text-blue-800">
            {formatCurrencySync(totalDonated)}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Number of Donations</p>
          <p className="text-2xl font-bold text-green-800">{donationCount}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">Causes Supported</p>
          <p className="text-2xl font-bold text-purple-800">
            {donationsByCause.length}
          </p>
        </div>
      </div>

      {/* Donation Impact Visualization - Pie Chart */}
      {donationsByCause.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Donation Breakdown by Cause</h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  role="img"
                  aria-label="Pie chart showing donation breakdown by cause category"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Screen reader accessible summary */}
            <div className="sr-only">
              <h4>Donation Breakdown Summary</h4>
              <ul>
                {pieChartData.map((item, index) => (
                  <li key={index}>
                    {item.name}: {formatCurrencySync(item.value)} ({item.count} donations)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {mostSupportedCause && (
        <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-600 font-medium">Most Supported Cause</p>
          <p className="text-lg font-bold text-yellow-800">{mostSupportedCause.cause}</p>
          <p className="text-sm text-yellow-600">
            {formatCurrencySync(mostSupportedCause.totalAmount)} ({mostSupportedCause.count} donations)
          </p>
        </div>
      )}

      {donationsByCause.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Donations by Cause</h3>
          <div className="space-y-3">
            {donationsByCause.map((causeData, index) => (
              <div
                key={index}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <p className="font-medium">{causeData.cause || 'Unknown Cause'}</p>
                  <p className="text-sm text-gray-500">
                    {causeData.count} {causeData.count === 1 ? 'donation' : 'donations'}
                  </p>
                </div>
                <p className="font-semibold text-green-600">
                  {formatCurrencySync(causeData.totalAmount || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}