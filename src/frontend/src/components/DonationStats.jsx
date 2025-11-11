import { useState, useEffect } from 'react';
import { donationsAPI } from '../api';

export default function DonationStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await donationsAPI.getStats();
      setStats(data);
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
  const causesSupported = stats.causesSupported || [];
  const recentDonations = stats.recentDonations || [];

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">Your Donation Impact</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Donated</p>
          <p className="text-2xl font-bold text-blue-800">
            ${totalDonated.toFixed(2)}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Number of Donations</p>
          <p className="text-2xl font-bold text-green-800">{donationCount}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">Causes Supported</p>
          <p className="text-2xl font-bold text-purple-800">
            {causesSupported.length}
          </p>
        </div>
      </div>

      {recentDonations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Recent Donations</h3>
          <div className="space-y-3">
            {recentDonations.map((donation, index) => (
              <div
                key={index}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <p className="font-medium">{donation.cause || 'Unknown Cause'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(donation.date).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-semibold text-green-600">
                  ${(donation.amount || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}