import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { donationsAPI } from '../api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function CauseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cause, setCause] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [donating, setDonating] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationMessage, setDonationMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCauseDetails();
  }, [id]);

  const fetchCauseDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/donate/causes/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setCause(response.data.data);
    } catch (error) {
      console.error('Error fetching cause:', error);
      setError('Failed to load cause details');
    } finally {
      setLoading(false);
    }
  };

  const handleDonation = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
      setDonationMessage({ 
        type: 'error', 
        text: 'Please login to make a donation' 
      });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      setDonationMessage({ 
        type: 'error', 
        text: 'Please enter a valid donation amount' 
      });
      return;
    }

    setDonating(true);
    setDonationMessage({ type: '', text: '' });

    try {
      await donationsAPI.makeDonation({
        causeId: cause._id,
        causeName: cause.name,
        amount: parseFloat(donationAmount)
      });

      setDonationMessage({ 
        type: 'success', 
        text: `Thank you for your donation of ₹${parseFloat(donationAmount).toFixed(2)} to ${cause.name}!` 
      });
      
      setDonationAmount('');
      
      // Refresh cause details to show updated amounts
      setTimeout(() => {
        fetchCauseDetails();
      }, 1000);
      
    } catch (error) {
      console.error('Donation error:', error);
      setDonationMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to process donation. Please try again.' 
      });
    } finally {
      setDonating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !cause) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cause Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The cause you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/causes')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Browse Causes
          </button>
        </div>
      </div>
    );
  }

  const progress = cause.targetAmount > 0 
    ? Math.min((cause.currentAmount / cause.targetAmount) * 100, 100)
    : 0;

  const categoryColors = {
    education: 'bg-blue-100 text-blue-800',
    healthcare: 'bg-red-100 text-red-800',
    environment: 'bg-green-100 text-green-800',
    poverty: 'bg-yellow-100 text-yellow-800',
    disaster: 'bg-orange-100 text-orange-800',
    other: 'bg-gray-100 text-gray-800'
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/causes')}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Browse Causes
        </button>

        {/* Cause Details Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{cause.name}</h1>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[cause.category] || categoryColors.other}`}>
                    {cause.category}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[cause.status] || statusColors.active}`}>
                    {cause.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">About This Cause</h2>
              <p className="text-gray-700 leading-relaxed">{cause.description}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Funding Progress</span>
                <span className="text-sm font-medium text-gray-900">{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium mb-1">Amount Raised</p>
                <p className="text-2xl font-bold text-blue-900">₹{cause.currentAmount.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium mb-1">Target Amount</p>
                <p className="text-2xl font-bold text-purple-900">₹{cause.targetAmount.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium mb-1">Donors</p>
                <p className="text-2xl font-bold text-green-900">{cause.donorCount || 0}</p>
              </div>
            </div>

            {/* Donation Form */}
            {cause.status === 'active' && (
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Make a Donation</h3>
                
                {donationMessage.text && (
                  <div className={`mb-4 p-4 rounded-lg ${
                    donationMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {donationMessage.text}
                  </div>
                )}

                <form onSubmit={handleDonation}>
                  <div className="mb-4">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                      Donation Amount (₹)
                    </label>
                    <input
                      type="number"
                      id="amount"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      min="1"
                      step="0.01"
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      required
                    />
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2">Quick amounts:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 500, 1000, 5000].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setDonationAmount(amount.toString())}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                        >
                          ₹{amount}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={donating}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {donating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Donate Now'
                    )}
                  </button>
                </form>
              </div>
            )}

            {cause.status !== 'active' && (
              <div className="border-t pt-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-yellow-800 font-medium">
                    This cause is currently {cause.status} and not accepting donations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
