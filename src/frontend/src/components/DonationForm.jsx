import { useState, useEffect, useRef } from 'react';
import { donationsAPI } from '../api';
import { getMinimumDonation, formatCurrencySync } from '../utils/currencyFormatter';

export default function DonationForm() {
  const [form, setForm] = useState({
    amount: '',
    cause: '',
  });
  const [causes, setCauses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [latestPaymentId, setLatestPaymentId] = useState('');
  const [showClickToast, setShowClickToast] = useState(false);
  const toastTimerRef = useRef(null);
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

    // Fetch available causes (so we submit causeId)
    const loadCauses = async () => {
      try {
        const res = await donationsAPI.getCauses();
        const data = res?.data?.data || [];
        setCauses(data);
      } catch (err) {
        console.error('Failed to load causes:', err);
      }
    };

    loadCauses();

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

    // Only show immediate toast for non-admin users
    let isAdmin = false;
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      isAdmin = user?.role === 'admin';
    } catch (err) {
      isAdmin = false;
    }

    if (!isAdmin) {
      setShowClickToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShowClickToast(false), 3000);
    }

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
      // Ensure we send causeId and numeric amount as backend expects
      const payload = { amount: Number(form.amount), causeId: form.cause };
      const res = await donationsAPI.makeDonation(payload);
      // Try several locations for payment id returned by backend
      const paymentId = res?.data?.data?.donation?.paymentId || res?.data?.data?.paymentId || res?.data?.paymentId || '';
      setLatestPaymentId(paymentId || '');
      // Show the receipt modal only for non-admin users
      if (!isAdmin) setShowReceiptModal(true);
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

  const closeClickToast = () => {
    setShowClickToast(false);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  const handleModalDownload = async () => {
    if (!latestPaymentId) {
      alert('Receipt not available');
      return;
    }
    try {
      const resp = await donationsAPI.downloadReceipt(latestPaymentId);
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${latestPaymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download receipt', err);
      alert('Failed to download receipt');
    }
  };

  const handleDonateMore = () => {
    setShowReceiptModal(false);
    // focus amount input if possible
    const el = document.querySelector('input[type="number"]');
    if (el) el.focus();
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
            {causes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
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

      {showClickToast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="relative bg-white border rounded shadow p-3 w-72">
            <button onClick={closeClickToast} aria-label="Close" className="absolute top-1 right-2 text-gray-500 hover:text-gray-700">✕</button>
            <div className="font-semibold">Processing donation...</div>
            <div className="text-sm text-gray-600">Your donation is being processed. You will be notified shortly.</div>
          </div>
        </div>
      )}

      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowReceiptModal(false)} />
          <div className="bg-white rounded-lg shadow-lg z-10 max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Donation Successful</h3>
            <p className="text-sm text-gray-700 mb-4">Thank you for your donation. You can download your receipt now or later from <strong>My Donations</strong>.</p>
            <div className="flex gap-2 mb-3">
              <button onClick={handleModalDownload} disabled={!latestPaymentId} className={`flex-1 px-4 py-2 text-white rounded ${latestPaymentId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                {latestPaymentId ? 'Download Receipt' : 'Receipt Not Ready'}
              </button>
              <button onClick={handleDonateMore} className="flex-1 px-4 py-2 border rounded">Donate More</button>
            </div>
            <div className="text-xs text-gray-500">You can also download this receipt later from your <a href="/donations" className="text-blue-600 underline">My Donations</a> page.</div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowReceiptModal(false)} className="px-3 py-1 text-sm text-gray-600">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}