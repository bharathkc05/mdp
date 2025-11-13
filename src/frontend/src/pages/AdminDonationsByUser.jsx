import { useEffect, useState } from 'react';
import { adminAPI } from '../api';

export default function AdminDonationsByUser() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await adminAPI.getDonationsByUser();
        setRows(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch donations by user', err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleExport = () => {
    // Export aggregated data as CSV
    const headers = ['donorId','donorName','donorEmail','totalAmount','donationCount','avgDonation','lastDonationDate'];
    const rowsCsv = [headers.join(',')];
    for (const r of rows) {
      const line = headers.map(h => {
        let v = r[h];
        if (v === undefined || v === null) return '';
        if (h === 'lastDonationDate') v = new Date(v).toISOString();
        return `"${String(v).replace(/"/g,'""')}"`;
      }).join(',');
      rowsCsv.push(line);
    }
    const csv = rowsCsv.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donations_by_user_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Loading donations by user...</div>;

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Donations By User</h2>
        <button onClick={handleExport} className="px-3 py-1 bg-green-600 text-white rounded">Export CSV</button>
      </div>

      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Donor</th>
            <th className="p-2">Email</th>
            <th className="p-2">Total Amount</th>
            <th className="p-2">Donations</th>
            <th className="p-2">Avg Donation</th>
            <th className="p-2">Last Donation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.donorId} className="border-b hover:bg-gray-50">
              <td className="p-2">{r.donorName}</td>
              <td className="p-2">{r.donorEmail}</td>
              <td className="p-2">{Number(r.totalAmount || 0).toFixed(2)}</td>
              <td className="p-2">{r.donationCount || 0}</td>
              <td className="p-2">{Number(r.avgDonation || 0).toFixed(2)}</td>
              <td className="p-2">{r.lastDonationDate ? new Date(r.lastDonationDate).toLocaleString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
