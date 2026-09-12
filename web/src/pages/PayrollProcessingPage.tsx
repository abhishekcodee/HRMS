import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Lock,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Search,
  DollarSign,
  Users,
  Building,
} from 'lucide-react';
import { CalculationBreakdownModal } from '../components/payroll/CalculationBreakdownModal';

export const PayrollProcessingPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [policy, setPolicy] = useState<string>('CALENDAR_DAYS');
  const [search, setSearch] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [payrollRun, setPayrollRun] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [validationReport, setValidationReport] = useState<any>(null);

  const [selectedItemForBreakdown, setSelectedItemForBreakdown] = useState<any>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);

  const getToken = () => localStorage.getItem('hrms_token') || localStorage.getItem('token');

  const checkAuthStatus = (res: Response, json: any) => {
    if (res.status === 401 || json.error?.code === 'UNAUTHORIZED' || json.error?.code === 'INVALID_TOKEN') {
      localStorage.removeItem('token');
      localStorage.removeItem('hrms_token');
      localStorage.removeItem('user');
      localStorage.removeItem('hrms_user');
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return false;
    }
    return true;
  };

  const fetchReadiness = async () => {
    try {
      const res = await fetch(`/api/v1/payroll/validate-readiness?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!checkAuthStatus(res, json)) return;
      if (json.success) setValidationReport(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCurrentRun = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/payroll/runs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!checkAuthStatus(res, json)) return;
      if (json.success && json.data.length > 0) {
        const current = json.data.find(
          (r: any) => r.payrollMonth === selectedMonth && r.payrollYear === selectedYear
        );
        if (current) {
          setPayrollRun(current);
          const itemRes = await fetch(`/api/v1/payroll/runs/${current.id}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const itemJson = await itemRes.json();
          if (itemJson.success) setItems(itemJson.data.items);
        } else {
          setPayrollRun(null);
          setItems([]);
        }
      } else {
        setPayrollRun(null);
        setItems([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
    fetchCurrentRun();
  }, [selectedMonth, selectedYear]);

  const handleCalculatePayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/payroll/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          payableDaysPolicy: policy,
        }),
      });
      const json = await res.json();
      if (!checkAuthStatus(res, json)) return;
      if (json.success) {
        alert(json.message);
        fetchCurrentRun();
      } else {
        alert(json.error?.message || 'Failed to calculate payroll');
      }
    } catch (e) {
      console.error(e);
      alert('Error calculating payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!payrollRun) return;
    if (!confirm(`Are you sure you want to change payroll status to '${newStatus}'?`)) return;

    try {
      const res = await fetch(`/api/v1/payroll/runs/${payrollRun.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!checkAuthStatus(res, json)) return;
      if (json.success) {
        alert(json.message);
        fetchCurrentRun();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportSalaryRegister = async () => {
    try {
      const currentToken = getToken();
      const res = await fetch(`/api/v1/payroll/reports?reportType=salary_register&month=${selectedMonth}&year=${selectedYear}&format=csv`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.status === 401) {
        localStorage.clear();
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login';
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Salary_Register_${selectedMonth}_${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export salary register CSV');
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      item.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      (item.department && item.department.toLowerCase().includes(search.toLowerCase()))
  );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const fmt = (amt: any) => `₹${(Number(amt) || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Calculator size={26} color="var(--accent-color, #4f46e5)" /> Monthly Payroll Processing Engine
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Real-time, formula-driven, auditable monthly salary calculations with statutory compliance.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCalculatePayroll}
            disabled={loading || (payrollRun && ['APPROVED', 'PAID', 'LOCKED'].includes(payrollRun.status))}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'var(--accent-color, #4f46e5)',
              color: '#fff',
              fontWeight: '600',
              fontSize: '13px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: (payrollRun && ['APPROVED', 'PAID', 'LOCKED'].includes(payrollRun.status)) ? 0.6 : 1
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {payrollRun ? 'Recalculate Payroll' : 'Calculate Monthly Payroll'}
          </button>

          {payrollRun && (
            <>
              {payrollRun.status === 'CALCULATED' && (
                <button
                  onClick={() => handleUpdateStatus('APPROVED')}
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
                  <Lock size={16} /> Lock & Approve Payroll
                </button>
              )}
              {payrollRun.status === 'APPROVED' && (
                <button
                  onClick={() => handleUpdateStatus('PROCESSED')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: '#6366f1',
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
                  <CheckCircle size={16} /> Process For Disbursement
                </button>
              )}
            </>
          )}

          <button
            onClick={handleExportSalaryRegister}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FileSpreadsheet size={16} color="#22c55e" /> Export Salary Register
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Pay Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}
          >
            {months.map((m, idx) => (
              <option key={idx} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Pay Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Payable Days Policy</label>
          <select
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}
          >
            <option value="CALENDAR_DAYS">Actual Calendar Days (28/30/31)</option>
            <option value="FIXED_30">Fixed 30-Day Base</option>
            <option value="WORKING_DAYS">Actual Working Days (Excl. Holidays)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Payroll Status</label>
          <div style={{ padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ textTransform: 'uppercase', color: payrollRun?.status === 'APPROVED' ? '#22c55e' : 'var(--text-primary)' }}>
              {payrollRun?.status || 'NOT CALCULATED'}
            </span>
            {payrollRun?.status === 'APPROVED' && <Lock size={16} color="#22c55e" />}
          </div>
        </div>
      </div>

      {/* Readiness Check Banner */}
      {validationReport && validationReport.errorCount > 0 && (
        <div style={{ padding: '14px 18px', background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#eab308' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="#eab308" />
            <div>
              <strong>Payroll Readiness Notice:</strong> {validationReport.errorCount} out of {validationReport.totalEmployees} employees have missing CTC or bank details.
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      {payrollRun && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Users size={16} color="#3b82f6" /> Total Employees
            </span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{payrollRun.totalEmployees}</div>
          </div>

          <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <DollarSign size={16} color="#22c55e" /> Total Gross Earnings
            </span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{fmt(payrollRun.totalGross)}</div>
          </div>

          <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <DollarSign size={16} color="#ef4444" /> Total Deductions
            </span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>{fmt(payrollRun.totalDeductions)}</div>
          </div>

          <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <DollarSign size={16} color="#6366f1" /> Net Salary Payable
            </span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#22c55e' }}>{fmt(payrollRun.totalNet)}</div>
          </div>

          <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Building size={16} color="#a855f7" /> Total Employer Cost
            </span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#6366f1' }}>{fmt(payrollRun.totalEmployerCost)}</div>
          </div>
        </div>
      )}

      {/* Main Items Table */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {/* Table Search Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search employee, code, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredItems.length}</strong> calculated records
          </div>
        </div>

        {/* Table Container */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>
                <th style={{ padding: '12px' }}>Employee</th>
                <th style={{ padding: '12px' }}>Department</th>
                <th style={{ padding: '12px' }}>Pay / LOP Days</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Basic</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>HRA</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Gross Earnings</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>PF</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>ESIC</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>PT</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>TDS</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#22c55e' }}>Net Salary</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Formula Audit</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.employee_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.employee_code}</div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.department || 'General'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.payable_days}d</span>
                    {Number(item.lop_days) > 0 && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        {item.lop_days} LOP
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.basic_salary)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.hra)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: 'var(--text-primary)' }}>{fmt(item.gross_earnings)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>{fmt(item.employee_pf)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>{fmt(item.employee_esic)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>{fmt(item.professional_tax)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>{fmt(item.tds)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: '#22c55e' }}>{fmt(item.net_salary)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedItemForBreakdown(item);
                        setIsBreakdownOpen(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(79, 70, 229, 0.12)',
                        color: 'var(--accent-color, #4f46e5)',
                        border: 'none',
                        fontWeight: '600',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Eye size={14} /> Formula
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {payrollRun ? 'No employee calculated items match your filter.' : 'No payroll run executed for this month yet. Click "Calculate Monthly Payroll" above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formula Transparency Breakdown Modal */}
      <CalculationBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        item={selectedItemForBreakdown}
      />
    </div>
  );
};
