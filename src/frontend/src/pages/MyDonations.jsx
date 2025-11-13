import { useEffect, useState } from 'react';
import { donationsAPI } from '../api';

export default function MyDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await donationsAPI.getDonations();
        setDonations(res.data.data.donations || []);
      } catch (err) {
        console.error('Failed to fetch donations', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDownload = async (paymentId) => {
    try {
      const resp = await donationsAPI.downloadReceipt(paymentId);
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download receipt', err);
      alert('Failed to download receipt');
    }
  };

  if (loading) return <div>Loading your donations...</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">My Donations</h2>

      {donations.length === 0 ? (
        <div>No donations found.</div>
      ) : (
        <ul className="space-y-4">
          {donations.map((d) => (
            <li key={d.paymentId} className="p-4 border rounded flex justify-between items-center">
              <div>
                <div className="font-semibold">{d.cause}</div>
                <div className="text-sm text-gray-600">{new Date(d.date).toLocaleString()}</div>
                <div className="text-sm">Amount: {Number(d.amount).toFixed(2)}</div>
                <div className="text-sm">Payment ID: {d.paymentId}</div>
              </div>
              <div>
                <button onClick={() => handleDownload(d.paymentId)} className="px-3 py-1 bg-blue-600 text-white rounded">Download Receipt</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
