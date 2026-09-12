import React, { useState, useEffect } from 'react';
import { Shield, Save } from 'lucide-react';

export const StatutorySettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pf' | 'esic' | 'pt' | 'loans'>('pf');

  const [pfConfig, setPfConfig] = useState<any>({
    enabled: true,
    employeeRate: 12.0,
    employerRate: 12.0,
    epsRate: 8.33,
    epfEmployerRate: 3.67,
    wageCeiling: 15000,
    restrictToCeiling: true,
    effectiveFrom: '2026-01-01',
  });

  const [esicConfig, setEsicConfig] = useState<any>({
    enabled: true,
    eligibilityThreshold: 21000,
    employeeRate: 0.75,
    employerRate: 3.25,
    effectiveFrom: '2026-01-01',
  });

  const [ptSlabs, setPtSlabs] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);

  const token = localStorage.getItem('token');

  const fetchConfigs = async () => {
    try {
      const [pfRes, esicRes, ptRes, loanRes] = await Promise.all([
        fetch('/api/v1/payroll/statutory/pf', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/payroll/statutory/esic', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/payroll/statutory/pt', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/payroll/loans', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [pfJson, esicJson, ptJson, loanJson] = await Promise.all([
        pfRes.json(), esicRes.json(), ptRes.json(), loanRes.json()
      ]);

      if (pfJson.success && pfJson.data) setPfConfig(pfJson.data);
      if (esicJson.success && esicJson.data) setEsicConfig(esicJson.data);
      if (ptJson.success && ptJson.data) setPtSlabs(ptJson.data);
      if (loanJson.success && loanJson.data) setLoans(loanJson.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSavePf = async () => {
    try {
      const res = await fetch('/api/v1/payroll/statutory/pf', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pfConfig),
      });
      const json = await res.json();
      if (json.success) alert(json.message);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEsic = async () => {
    try {
      const res = await fetch('/api/v1/payroll/statutory/esic', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(esicConfig),
      });
      const json = await res.json();
      if (json.success) alert(json.message);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Shield size={26} color="var(--accent-color, #4f46e5)" /> Statutory & Deduction Settings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          Configure versioned EPF rules, ESIC thresholds, State Professional Tax slabs, and Loans/Advances.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('pf')}
          style={{
            padding: '12px 20px',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            color: activeTab === 'pf' ? 'var(--accent-color, #4f46e5)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'pf' ? '3px solid var(--accent-color, #4f46e5)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          EPF (Provident Fund)
        </button>
        <button
          onClick={() => setActiveTab('esic')}
          style={{
            padding: '12px 20px',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            color: activeTab === 'esic' ? 'var(--accent-color, #4f46e5)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'esic' ? '3px solid var(--accent-color, #4f46e5)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          ESIC Rules
        </button>
        <button
          onClick={() => setActiveTab('pt')}
          style={{
            padding: '12px 20px',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            color: activeTab === 'pt' ? 'var(--accent-color, #4f46e5)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'pt' ? '3px solid var(--accent-color, #4f46e5)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          Professional Tax Slabs
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          style={{
            padding: '12px 20px',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            color: activeTab === 'loans' ? 'var(--accent-color, #4f46e5)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'loans' ? '3px solid var(--accent-color, #4f46e5)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          Loans & Salary Advances
        </button>
      </div>

      {/* EPF Config */}
      {activeTab === 'pf' && (
        <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Employees Provident Fund (EPF) Rules</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Employee Contribution Rate (%)</label>
              <input
                type="number"
                value={pfConfig.employeeRate}
                onChange={(e) => setPfConfig({ ...pfConfig, employeeRate: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Employer Contribution Rate (%)</label>
              <input
                type="number"
                value={pfConfig.employerRate}
                onChange={(e) => setPfConfig({ ...pfConfig, employerRate: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>PF Wage Ceiling (₹)</label>
              <input
                type="number"
                value={pfConfig.wageCeiling}
                onChange={(e) => setPfConfig({ ...pfConfig, wageCeiling: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Effective From Date</label>
              <input
                type="date"
                value={pfConfig.effectiveFrom}
                onChange={(e) => setPfConfig({ ...pfConfig, effectiveFrom: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div style={{ paddingTop: '8px' }}>
            <button onClick={handleSavePf} style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-color, #4f46e5)', color: '#fff', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Save size={16} /> Save EPF Configuration
            </button>
          </div>
        </div>
      )}

      {/* ESIC Config */}
      {activeTab === 'esic' && (
        <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Employees State Insurance (ESIC) Rules</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Eligibility Gross Limit (₹)</label>
              <input
                type="number"
                value={esicConfig.eligibilityThreshold}
                onChange={(e) => setEsicConfig({ ...esicConfig, eligibilityThreshold: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Employee Contribution Rate (%)</label>
              <input
                type="number"
                value={esicConfig.employeeRate}
                onChange={(e) => setEsicConfig({ ...esicConfig, employeeRate: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Employer Contribution Rate (%)</label>
              <input
                type="number"
                value={esicConfig.employerRate}
                onChange={(e) => setEsicConfig({ ...esicConfig, employerRate: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Effective From Date</label>
              <input
                type="date"
                value={esicConfig.effectiveFrom}
                onChange={(e) => setEsicConfig({ ...esicConfig, effectiveFrom: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div style={{ paddingTop: '8px' }}>
            <button onClick={handleSaveEsic} style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-color, #4f46e5)', color: '#fff', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Save size={16} /> Save ESIC Configuration
            </button>
          </div>
        </div>
      )}

      {/* PT Slabs */}
      {activeTab === 'pt' && (
        <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>State-wise Professional Tax (PT) Slabs</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>
                  <th style={{ padding: '12px' }}>State</th>
                  <th style={{ padding: '12px' }}>Min Gross (₹)</th>
                  <th style={{ padding: '12px' }}>Max Gross (₹)</th>
                  <th style={{ padding: '12px' }}>Monthly Tax (₹)</th>
                  <th style={{ padding: '12px' }}>February Tax (₹)</th>
                  <th style={{ padding: '12px' }}>Effective From</th>
                </tr>
              </thead>
              <tbody>
                {ptSlabs.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{s.state}</td>
                    <td style={{ padding: '12px' }}>₹{Number(s.min_gross).toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>₹{Number(s.max_gross).toLocaleString()}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#ef4444' }}>₹{s.monthly_tax}</td>
                    <td style={{ padding: '12px' }}>₹{s.february_tax}</td>
                    <td style={{ padding: '12px' }}>{s.effective_from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loans & Advances */}
      {activeTab === 'loans' && (
        <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Active Employee Loans & Advances</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>
                  <th style={{ padding: '12px' }}>Employee</th>
                  <th style={{ padding: '12px' }}>Loan Type</th>
                  <th style={{ padding: '12px' }}>Principal Amount</th>
                  <th style={{ padding: '12px' }}>Monthly EMI</th>
                  <th style={{ padding: '12px' }}>Remaining Balance</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{l.employee_name}</td>
                    <td style={{ padding: '12px' }}>{l.loan_type}</td>
                    <td style={{ padding: '12px' }}>₹{Number(l.principal_amount).toLocaleString()}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#ef4444' }}>₹{Number(l.monthly_emi).toLocaleString()}</td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>₹{Number(l.remaining_balance).toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
