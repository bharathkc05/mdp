import { useState, useEffect } from 'react';
import { donationsAPI } from '../api';
import { getMinimumDonation, formatCurrencySync } from '../utils/currencyFormatter';

const causes = [
  'Education',
  'Healthcare',
  'Environment',
  'Animal Welfare',
  'Disaster Relief',
  'Poverty Alleviation'
];

export default function DonationForm() {
  const [form, setForm] = useState({
    amount: '',
    cause: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [minDonation, setMinDonation] = useState({ amount: 1, enabled: true });

  useEffect(() => {
    // Story 2.6: Fetch minimum donation configuration
    const loadConfig = () => {
      getMinimumDonation().then(config => {
        setMinDonation(config);
      }).catch(err => {
        console.error('Failed to fetch minimum donation:', err);
      });
    };

    loadConfig();

    // Listen for config updates
    const handleConfigUpdate = () => {
      loadConfig();
    };

    window.addEventListener('platformConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('platformConfigUpdated', handleConfigUpdate);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Story 2.6: Client-side validation for minimum donation
    if (minDonation.enabled && parseFloat(form.amount) < minDonation.amount) {
      setMessage({
        type: 'error',
        text: `Donation amount must be at least ${formatCurrencySync(minDonation.amount)}`
      });
      setLoading(false);
      return;
    }

    try {
      await donationsAPI.makeDonation(form);
      setMessage({
        type: 'success',
        text: 'Donation made successfully! Thank you for your contribution.'
      });
      setForm({ amount: '', cause: '' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to process donation'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">Make a Donation</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            min={minDonation.enabled ? minDonation.amount : 0.01}
            step="0.01"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder={minDonation.enabled ? `Min: ${formatCurrencySync(minDonation.amount)}` : "Enter amount"}
          />
          {minDonation.enabled && (
            <p className="mt-1 text-sm text-gray-500">
              Minimum donation: {formatCurrencySync(minDonation.amount)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Cause</label>
          <select
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={form.cause}
            onChange={(e) => setForm({ ...form, cause: e.target.value })}
          >
            <option value="">Select a cause</option>
            {causes.map((cause) => (
              <option key={cause} value={cause}>{cause}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Processing...' : 'Make Donation'}
        </button>
      </form>

      {message.text && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}