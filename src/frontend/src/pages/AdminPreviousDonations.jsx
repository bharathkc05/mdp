import { useEffect, useState } from 'react';
import { adminAPI, donationsAPI } from '../api';

export default function AdminPreviousDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    donorName: '',
    paymentMethod: '',
    cause: '',
    status: ''
  });
  const [filterVisible, setFilterVisible] = useState(false);

  const fetchDonations = async (options = {}) => {
    setLoading(true);
    try {
      // Merge filters and options, then remove empty values so backend doesn't receive empty strings
      const merged = { ...filters, ...options };
      const params = Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      );
      const res = await adminAPI.getPreviousDonations({ params });
      setDonations(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch previous donations', err);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
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

  const handleExportCSV = async () => {
    try {
      const query = new URLSearchParams({ ...filters, export: 'csv' }).toString();
      const url = `/api/admin/previous-donations?${query}`;
      const resp = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const a = document.createElement('a');
      const urlObj = window.URL.createObjectURL(blob);
      a.href = urlObj;
      a.download = `previous_donations_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlObj);
    } catch (err) {
      console.error('Failed to export CSV', err);
      alert('Failed to export CSV');
    }
  };

  if (loading) return <div>Loading previous donations...</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">Previous Donations</h2>

      <div className="mb-4 flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <button onClick={() => setFilterVisible(v => !v)} className="px-3 py-1 border rounded">{filterVisible ? 'Hide Filters' : 'Filter'}</button>
          <button onClick={handleExportCSV} className="px-3 py-1 bg-green-600 text-white rounded">Export CSV</button>
        </div>
      </div>

      {filterVisible && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="p-2 border rounded" placeholder="Start date" />
          <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="p-2 border rounded" placeholder="End date" />
          <input type="text" value={filters.donorName} onChange={e => setFilters(f => ({ ...f, donorName: e.target.value }))} className="p-2 border rounded" placeholder="Donor name or email" />
          <input type="number" value={filters.minAmount} onChange={e => setFilters(f => ({ ...f, minAmount: e.target.value }))} className="p-2 border rounded" placeholder="Min amount" />
          <input type="number" value={filters.maxAmount} onChange={e => setFilters(f => ({ ...f, maxAmount: e.target.value }))} className="p-2 border rounded" placeholder="Max amount" />
          <input type="text" value={filters.paymentMethod} onChange={e => setFilters(f => ({ ...f, paymentMethod: e.target.value }))} className="p-2 border rounded" placeholder="Payment method" />
          <input type="text" value={filters.cause} onChange={e => setFilters(f => ({ ...f, cause: e.target.value }))} className="p-2 border rounded" placeholder="Cause" />
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="p-2 border rounded">
            <option value="">Any status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchDonations({ page: 1 })} className="px-3 py-1 bg-blue-600 text-white rounded">Apply Filters</button>
            <button onClick={() => { setFilters({ startDate:'', endDate:'', minAmount:'', maxAmount:'', donorName:'', paymentMethod:'', cause:'', status:'' }); fetchDonations({ page: 1 }); }} className="px-3 py-1 border rounded">Reset</button>
          </div>
        </div>
      )}

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
                <div className="text-sm">Donor: {d.donorName} &lt;{d.donorEmail}&gt;</div>
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
