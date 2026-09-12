import React, { useState, useEffect } from 'react';
import { Plus, UserX } from 'lucide-react';

export const FullAndFinalPage: React.FC = () => {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);

  const [form, setForm] = useState({
    employeeId: '',
    lastWorkingDate: new Date().toISOString().split('T')[0],
    pendingSalaryDays: '15',
    leaveEncashmentDays: '10',
    gratuityYears: '5.5',
    bonusAmount: '0',
    noticePeriodRecoveryAmount: '0',
    loanBalanceRecoveryAmount: '0',
    otherRecoveriesAmount: '0',
  });

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const [sRes, eRes] = await Promise.all([
        fetch('/api/v1/payroll/ff-settlement', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/employees', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [sJson, eJson] = await Promise.all([sRes.json(), eRes.json()]);

      if (sJson.success) setSettlements(sJson.data);
      if (eJson.success) setEmployees(eJson.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCalculateFf = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/payroll/ff-settlement/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this Full & Final Settlement? This will mark the employee as separated.')) return;
    try {
      const res = await fetch(`/api/v1/payroll/ff-settlement/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fmt = (amt: any) => `₹${(Number(amt) || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <UserX size={26} color="#ef4444" /> Full & Final (F&F) Settlement Engine
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Calculate pending salary, leave encashment, gratuity, notice period recoveries, and exit settlements.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            background: 'var(--accent-color, #4f46e5)',
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
          <Plus size={16} /> Create F&F Settlement
        </button>
      </div>

      {/* Settlements Table */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>
                <th style={{ padding: '12px' }}>Employee</th>
                <th style={{ padding: '12px' }}>Last Working Date</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Gratuity (₹)</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Leave Encashment (₹)</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Total Earnings (₹)</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#ef4444' }}>Total Recoveries (₹)</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#22c55e', fontWeight: '700' }}>Net F&F Payable</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>
                    {s.employee_name} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>{s.employee_code}</span>
                  </td>
                  <td style={{ padding: '12px' }}>{s.last_working_date}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(s.gratuity_amount)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(s.leave_encashment_amount)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>{fmt(s.total_earnings)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>{fmt(s.total_recoveries)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#22c55e' }}>{fmt(s.net_settlement_amount)}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: s.settlement_status === 'APPROVED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)', color: s.settlement_status === 'APPROVED' ? '#22c55e' : '#eab308' }}>
                      {s.settlement_status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {s.settlement_status === 'DRAFT' && (
                      <button
                        onClick={() => handleApprove(s.id)}
                        style={{ padding: '4px 10px', borderRadius: '4px', background: '#22c55e', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Approve F&F
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add F&F */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '24px', width: '520px', maxWidth: '90%', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Calculate F&F Settlement</h3>
            <form onSubmit={handleCalculateFf} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Select Resigned Employee</label>
                <select
                  required
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                >
                  <option value="">Choose Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName || emp.full_name} ({emp.employeeId || emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Last Working Date</label>
                  <input
                    type="date"
                    required
                    value={form.lastWorkingDate}
                    onChange={(e) => setForm({ ...form, lastWorkingDate: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Pending Salary Days</label>
                  <input
                    type="number"
                    value={form.pendingSalaryDays}
                    onChange={(e) => setForm({ ...form, pendingSalaryDays: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Leave Encashment Days</label>
                  <input
                    type="number"
                    value={form.leaveEncashmentDays}
                    onChange={(e) => setForm({ ...form, leaveEncashmentDays: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Gratuity Tenure (Years)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.gratuityYears}
                    onChange={(e) => setForm({ ...form, gratuityYears: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Notice Recovery (₹)</label>
                  <input
                    type="number"
                    value={form.noticePeriodRecoveryAmount}
                    onChange={(e) => setForm({ ...form, noticePeriodRecoveryAmount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Loan Recovery (₹)</label>
                  <input
                    type="number"
                    value={form.loanBalanceRecoveryAmount}
                    onChange={(e) => setForm({ ...form, loanBalanceRecoveryAmount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 16px', borderRadius: '6px', background: 'var(--accent-color, #4f46e5)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                  Calculate Net F&F
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
