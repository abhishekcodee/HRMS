import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw, FileSpreadsheet, Search } from 'lucide-react';

export const BankTransferPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const token = localStorage.getItem('token');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/payroll/bank-transfer', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setPayments(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const ref = prompt('Enter Bank Transaction Reference Code (e.g. UTR12345678):');
    try {
      const res = await fetch(`/api/v1/payroll/bank-transfer/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentStatus: newStatus, transactionRef: ref }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchPayments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportBankAdvice = async () => {
    try {
      const currentToken = localStorage.getItem('token');
      const res = await fetch('/api/v1/payroll/bank-transfer?export=csv', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login';
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bank_Transfer_Advice.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export bank advice CSV');
    }
  };

  const filtered = payments.filter(
    (p) =>
      p.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      p.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      p.bank_name?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (amt: any) => `₹${(Number(amt) || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Building2 size={26} color="#22c55e" /> Bank Transfer & Salary Disbursement
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Generate and export salary payment batches for corporate bank accounts.
          </p>
        </div>

        <button
          onClick={handleExportBankAdvice}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            background: '#22c55e',
            color: '#fff',
            fontWeight: '600',
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileSpreadsheet size={16} /> Export Bank Advice CSV
        </button>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search employee, account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
            />
          </div>
          <button onClick={fetchPayments} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-app)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>
                <th style={{ padding: '12px' }}>Employee</th>
                <th style={{ padding: '12px' }}>Bank Name</th>
                <th style={{ padding: '12px' }}>Account Number</th>
                <th style={{ padding: '12px' }}>IFSC Code</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Net Payable Amount</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Transaction Ref</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>
                    {p.employee_name} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>{p.employee_code}</span>
                  </td>
                  <td style={{ padding: '12px' }}>{p.bank_name || 'HDFC Bank'}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{p.account_number}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{p.ifsc}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#22c55e' }}>{fmt(p.amount)}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: p.payment_status === 'PAID' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)', color: p.payment_status === 'PAID' ? '#22c55e' : '#eab308' }}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>{p.transaction_ref || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {p.payment_status !== 'PAID' && (
                      <button
                        onClick={() => handleUpdateStatus(p.id, 'PAID')}
                        style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
