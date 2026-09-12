import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Gift, 
  History, 
  Plus, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  UserCheck, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface Reimbursement {
  id: string;
  employee_id: string;
  employeeName?: string;
  employeeCode?: string;
  category: string;
  amount: number;
  claim_date: string;
  description?: string;
  receipt_url?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  created_at: string;
}

interface FbpDeclaration {
  id: string;
  employee_id: string;
  employeeName?: string;
  employeeCode?: string;
  financial_year: string;
  lta_amount: number;
  fuel_allowance_amount: number;
  telephone_allowance_amount: number;
  food_coupons_amount: number;
  total_fbp_selected: number;
  created_at: string;
}

interface SalaryArrear {
  id: string;
  employee_id: string;
  employeeName?: string;
  employeeCode?: string;
  effective_from_month: number;
  effective_from_year: number;
  effective_to_month: number;
  effective_to_year: number;
  basic_difference_total: number;
  gross_difference_total: number;
  status: 'PENDING' | 'PROCESSED';
  created_at: string;
}

interface Employee {
  id: string;
  full_name: string;
  employee_id?: string;
}

export function UpcomingPayrollPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'reimbursements' | 'fbp' | 'arrears'>('reimbursements');
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Data states
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [fbpList, setFbpList] = useState<FbpDeclaration[]>([]);
  const [arrearsList, setArrearsList] = useState<SalaryArrear[]>([]);

  // Modals / Form states
  const [showReimbursementModal, setShowReimbursementModal] = useState(false);
  const [showFbpModal, setShowFbpModal] = useState(false);
  const [showArrearModal, setShowArrearModal] = useState(false);

  // Form inputs
  const [reimForm, setReimForm] = useState({
    employeeId: '',
    category: 'Travel / Conveyance',
    amount: '',
    claimDate: new Date().toISOString().split('T')[0],
    description: '',
    receiptUrl: ''
  });

  const [fbpForm, setFbpForm] = useState({
    employeeId: '',
    financialYear: '2025-2026',
    ltaAmount: '50000',
    fuelAllowanceAmount: '36000',
    telephoneAllowanceAmount: '24000',
    foodCouponsAmount: '26400'
  });

  const [arrearForm, setArrearForm] = useState({
    employeeId: '',
    effectiveFromMonth: '1',
    effectiveFromYear: '2025',
    effectiveToMonth: '3',
    effectiveToYear: '2025',
    basicDifferenceTotal: '15000',
    grossDifferenceTotal: '35000'
  });

  const getToken = () => localStorage.getItem('hrms_token') || localStorage.getItem('token');

  useEffect(() => {
    fetchEmployees();
    fetchReimbursements();
    fetchFbpDeclarations();
    fetchSalaryArrears();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/v1/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  };

  const fetchReimbursements = async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      const res = await fetch('/api/v1/payroll/reimbursements', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReimbursements(data.data || []);
      }
    } catch (err) {
      showToast('Failed to load reimbursements', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFbpDeclarations = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/v1/payroll/fbp', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFbpList(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSalaryArrears = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/v1/payroll/arrears', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setArrearsList(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Handlers
  const handleCreateReimbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const res = await fetch('/api/v1/payroll/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(reimForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setShowReimbursementModal(false);
        fetchReimbursements();
      } else {
        showToast(data.error?.message || 'Submission failed', 'error');
      }
    } catch (err) {
      showToast('Server error while submitting reimbursement', 'error');
    }
  };

  const handleApproveReimbursement = async (id: string) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/payroll/reimbursements/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        fetchReimbursements();
      }
    } catch (err) {
      showToast('Approval failed', 'error');
    }
  };

  const handleSaveFbp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const res = await fetch('/api/v1/payroll/fbp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(fbpForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setShowFbpModal(false);
        fetchFbpDeclarations();
      } else {
        showToast(data.error?.message || 'Save failed', 'error');
      }
    } catch (err) {
      showToast('Failed to save FBP declaration', 'error');
    }
  };

  const handleCreateArrear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const res = await fetch('/api/v1/payroll/arrears', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(arrearForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setShowArrearModal(false);
        fetchSalaryArrears();
      } else {
        showToast(data.error?.message || 'Creation failed', 'error');
      }
    } catch (err) {
      showToast('Failed to create salary arrear', 'error');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Upcoming Payroll & Employee Claims Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Manage Expense Reimbursements, Flexible Benefit Plan (FBP) Declarations, and Retrospective Salary Arrears.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'reimbursements' && (
            <button
              onClick={() => setShowReimbursementModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'var(--accent-color, #4f46e5)',
                color: '#fff',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={18} /> New Expense Claim
            </button>
          )}
          {activeTab === 'fbp' && (
            <button
              onClick={() => setShowFbpModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'var(--accent-color, #4f46e5)',
                color: '#fff',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={18} /> Declare FBP Components
            </button>
          )}
          {activeTab === 'arrears' && (
            <button
              onClick={() => setShowArrearModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'var(--accent-color, #4f46e5)',
                color: '#fff',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={18} /> Create Salary Arrear
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('reimbursements')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            color: activeTab === 'reimbursements' ? 'var(--accent-color, #4f46e5)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'reimbursements' ? '3px solid var(--accent-color, #4f46e5)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <Receipt size={18} /> Expense Reimbursements
        </button>
        <button
          onClick={() => setActiveTab('fbp')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            color: activeTab === 'fbp' ? 'var(--accent-color, #4f46e5)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'fbp' ? '3px solid var(--accent-color, #4f46e5)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <Gift size={18} /> Flexible Benefit Plan (FBP)
        </button>
        <button
          onClick={() => setActiveTab('arrears')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            color: activeTab === 'arrears' ? 'var(--accent-color, #4f46e5)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'arrears' ? '3px solid var(--accent-color, #4f46e5)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <History size={18} /> Salary Arrears Adjustments
        </button>
      </div>

      {/* Tab Content 1: Reimbursements */}
      {activeTab === 'reimbursements' && (
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Expense Reimbursement Claims Log
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Approved claims are automatically included in the upcoming payroll calculation.
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>Employee</th>
                <th style={{ padding: '12px' }}>Category</th>
                <th style={{ padding: '12px' }}>Amount (₹)</th>
                <th style={{ padding: '12px' }}>Claim Date</th>
                <th style={{ padding: '12px' }}>Description</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reimbursements.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No expense reimbursement claims submitted yet.
                  </td>
                </tr>
              ) : (
                reimbursements.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {r.employeeName || 'Employee'} ({r.employeeCode || 'EMP'})
                    </td>
                    <td style={{ padding: '12px' }}>{r.category}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: 'var(--accent-color, #4f46e5)' }}>
                      ₹{Number(r.amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px' }}>{r.claim_date}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{r.description || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background:
                            r.status === 'APPROVED'
                              ? 'rgba(34, 197, 94, 0.15)'
                              : r.status === 'PENDING'
                              ? 'rgba(234, 179, 8, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            r.status === 'APPROVED'
                              ? '#22c55e'
                              : r.status === 'PENDING'
                              ? '#eab308'
                              : '#ef4444'
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {r.status === 'PENDING' && (
                        <button
                          onClick={() => handleApproveReimbursement(r.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Approve Claim
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content 2: Flexible Benefit Plan (FBP) */}
      {activeTab === 'fbp' && (
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Flexible Benefit Plan (FBP) Declarations (FY 2025-2026)
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Restructure salary components for maximum tax optimization & non-taxable allowances.
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>Employee</th>
                <th style={{ padding: '12px' }}>Financial Year</th>
                <th style={{ padding: '12px' }}>LTA (₹)</th>
                <th style={{ padding: '12px' }}>Fuel Allowance (₹)</th>
                <th style={{ padding: '12px' }}>Telephone Allowance (₹)</th>
                <th style={{ padding: '12px' }}>Food Coupons (₹)</th>
                <th style={{ padding: '12px' }}>Total FBP Selected (₹)</th>
              </tr>
            </thead>
            <tbody>
              {fbpList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No FBP declarations submitted for the selected financial year.
                  </td>
                </tr>
              ) : (
                fbpList.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {f.employeeName || 'Employee'} ({f.employeeCode || 'EMP'})
                    </td>
                    <td style={{ padding: '12px' }}>{f.financial_year}</td>
                    <td style={{ padding: '12px' }}>₹{Number(f.lta_amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px' }}>₹{Number(f.fuel_allowance_amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px' }}>₹{Number(f.telephone_allowance_amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px' }}>₹{Number(f.food_coupons_amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#22c55e' }}>
                      ₹{Number(f.total_fbp_selected).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content 3: Salary Arrears */}
      {activeTab === 'arrears' && (
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Salary Arrears & Retrospective Pay Adjustments
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Calculates back-dated pay revisions and adds gross differences into the current payroll run.
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>Employee</th>
                <th style={{ padding: '12px' }}>Effective Period</th>
                <th style={{ padding: '12px' }}>Basic Difference Total (₹)</th>
                <th style={{ padding: '12px' }}>Gross Difference Total (₹)</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {arrearsList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No salary arrear records created.
                  </td>
                </tr>
              ) : (
                arrearsList.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {a.employeeName || 'Employee'} ({a.employeeCode || 'EMP'})
                    </td>
                    <td style={{ padding: '12px' }}>
                      {a.effective_from_month}/{a.effective_from_year} - {a.effective_to_month}/{a.effective_to_year}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '600' }}>
                      ₹{Number(a.basic_difference_total).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#4f46e5' }}>
                      ₹{Number(a.gross_difference_total).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: a.status === 'PROCESSED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: a.status === 'PROCESSED' ? '#22c55e' : '#eab308'
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal 1: New Expense Claim */}
      {showReimbursementModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Submit Expense Claim</h3>
            <form onSubmit={handleCreateReimbursement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Select Employee</label>
                <select
                  value={reimForm.employeeId}
                  onChange={(e) => setReimForm({ ...reimForm, employeeId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id || 'EMP'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Category</label>
                <select
                  value={reimForm.category}
                  onChange={(e) => setReimForm({ ...reimForm, category: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                >
                  <option value="Travel / Conveyance">Travel / Conveyance</option>
                  <option value="Client Entertainment / Food">Client Entertainment / Food</option>
                  <option value="Internet / Mobile Bill">Internet / Mobile Bill</option>
                  <option value="Medical / Healthcare">Medical / Healthcare</option>
                  <option value="Office Supplies & Miscellaneous">Office Supplies & Miscellaneous</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Amount (₹)</label>
                  <input
                    type="number"
                    value={reimForm.amount}
                    onChange={(e) => setReimForm({ ...reimForm, amount: e.target.value })}
                    placeholder="e.g. 4500"
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Claim Date</label>
                  <input
                    type="date"
                    value={reimForm.claimDate}
                    onChange={(e) => setReimForm({ ...reimForm, claimDate: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Description</label>
                <textarea
                  value={reimForm.description}
                  onChange={(e) => setReimForm({ ...reimForm, description: e.target.value })}
                  placeholder="Details about the expense..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowReimbursementModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 16px', borderRadius: '6px', background: 'var(--accent-color, #4f46e5)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: FBP Declaration */}
      {showFbpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '24px', width: '520px', maxWidth: '90%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>FBP Component Selection</h3>
            <form onSubmit={handleSaveFbp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Select Employee</label>
                <select
                  value={fbpForm.employeeId}
                  onChange={(e) => setFbpForm({ ...fbpForm, employeeId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id || 'EMP'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>LTA Amount (₹)</label>
                  <input
                    type="number"
                    value={fbpForm.ltaAmount}
                    onChange={(e) => setFbpForm({ ...fbpForm, ltaAmount: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Fuel Allowance (₹)</label>
                  <input
                    type="number"
                    value={fbpForm.fuelAllowanceAmount}
                    onChange={(e) => setFbpForm({ ...fbpForm, fuelAllowanceAmount: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Telephone Allowance (₹)</label>
                  <input
                    type="number"
                    value={fbpForm.telephoneAllowanceAmount}
                    onChange={(e) => setFbpForm({ ...fbpForm, telephoneAllowanceAmount: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Food Coupons (₹)</label>
                  <input
                    type="number"
                    value={fbpForm.foodCouponsAmount}
                    onChange={(e) => setFbpForm({ ...fbpForm, foodCouponsAmount: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowFbpModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 16px', borderRadius: '6px', background: 'var(--accent-color, #4f46e5)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                  Save Declaration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Salary Arrear */}
      {showArrearModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '90%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Create Retrospective Salary Arrear</h3>
            <form onSubmit={handleCreateArrear} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Select Employee</label>
                <select
                  value={arrearForm.employeeId}
                  onChange={(e) => setArrearForm({ ...arrearForm, employeeId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id || 'EMP'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>From Month / Year</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="number"
                      placeholder="M"
                      value={arrearForm.effectiveFromMonth}
                      onChange={(e) => setArrearForm({ ...arrearForm, effectiveFromMonth: e.target.value })}
                      style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                    />
                    <input
                      type="number"
                      placeholder="YYYY"
                      value={arrearForm.effectiveFromYear}
                      onChange={(e) => setArrearForm({ ...arrearForm, effectiveFromYear: e.target.value })}
                      style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>To Month / Year</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="number"
                      placeholder="M"
                      value={arrearForm.effectiveToMonth}
                      onChange={(e) => setArrearForm({ ...arrearForm, effectiveToMonth: e.target.value })}
                      style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                    />
                    <input
                      type="number"
                      placeholder="YYYY"
                      value={arrearForm.effectiveToYear}
                      onChange={(e) => setArrearForm({ ...arrearForm, effectiveToYear: e.target.value })}
                      style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Basic Difference Total (₹)</label>
                  <input
                    type="number"
                    value={arrearForm.basicDifferenceTotal}
                    onChange={(e) => setArrearForm({ ...arrearForm, basicDifferenceTotal: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Gross Difference Total (₹)</label>
                  <input
                    type="number"
                    value={arrearForm.grossDifferenceTotal}
                    onChange={(e) => setArrearForm({ ...arrearForm, grossDifferenceTotal: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowArrearModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 16px', borderRadius: '6px', background: 'var(--accent-color, #4f46e5)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                  Create Arrear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
