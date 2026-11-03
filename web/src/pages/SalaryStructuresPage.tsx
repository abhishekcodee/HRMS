import React, { useState, useEffect } from 'react';
import { Layers, Plus, Sliders, Users } from 'lucide-react';

export const SalaryStructuresPage: React.FC = () => {
  const [components, setComponents] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Form states
  const [showCompModal, setShowCompModal] = useState<boolean>(false);
  const [compForm, setCompForm] = useState({
    name: '',
    code: '',
    type: 'earning',
    calculationType: 'percentage',
    percentageValue: '40.00',
    isTaxable: true,
    isPfApplicable: true,
    isEsicApplicable: true,
    isLopDeductible: true,
  });

  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    ctc: '600000',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  const getToken = () => localStorage.getItem('hrms_token') || localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const token = getToken();
      const [cRes, sRes, eRes] = await Promise.all([
        fetch('/api/v1/payroll/components', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/payroll/structures', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/employees', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [cJson, sJson, eJson] = await Promise.all([cRes.json(), sRes.json(), eRes.json()]);

      if (cJson.success) setComponents(cJson.data);
      if (sJson.success) setStructures(sJson.data);
      if (eJson.success) setEmployees(eJson.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const res = await fetch('/api/v1/payroll/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(compForm),
      });
      const json = await res.json();
      if (json.success) {
        alert('Salary component created successfully.');
        setShowCompModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const res = await fetch('/api/v1/payroll/assign-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(assignForm),
      });
      const json = await res.json();
      if (json.success) {
        alert('Structure assigned successfully.');
        setShowAssignModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Layers size={26} color="var(--accent-color, #4f46e5)" /> Configurable Salary Structures & Components
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Define formula-based earnings, allowances, statutory rules, and employee CTC structures.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowCompModal(true)}
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
            <Plus size={16} /> Add Component
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
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
            <Users size={16} /> Assign Structure to Employee
          </button>
        </div>
      </div>

      {/* Salary Components Table */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#3b82f6" /> Active Salary Earning & Deduction Components
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>
                <th style={{ padding: '12px' }}>Component Name</th>
                <th style={{ padding: '12px' }}>Code</th>
                <th style={{ padding: '12px' }}>Type</th>
                <th style={{ padding: '12px' }}>Calculation Basis</th>
                <th style={{ padding: '12px' }}>Taxable</th>
                <th style={{ padding: '12px' }}>PF Applicable</th>
                <th style={{ padding: '12px' }}>ESIC Applicable</th>
                <th style={{ padding: '12px' }}>LOP Deductible</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#3b82f6' }}>{c.code}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: c.type === 'earning' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: c.type === 'earning' ? '#22c55e' : '#ef4444' }}>
                      {(c.type || 'earning').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{c.calculationType === 'percentage' ? `${c.percentageValue}% of ${c.percentageBasisCode || 'CTC'}` : 'Fixed Amount'}</td>
                  <td style={{ padding: '12px' }}>{c.isTaxable ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '12px' }}>{c.isPfApplicable ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '12px' }}>{c.isEsicApplicable ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '12px' }}>{c.isLopDeductible ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Component */}
      {showCompModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90%', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Add New Salary Component</h3>
            <form onSubmit={handleCreateComponent} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Component Name</label>
                <input
                  type="text"
                  required
                  value={compForm.name}
                  onChange={(e) => setCompForm({ ...compForm, name: e.target.value, code: (e.target.value || '').toUpperCase().replace(/\s+/g, '_') })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Special Allowance"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Code</label>
                <input type="text" required value={compForm.code} onChange={(e) => setCompForm({ ...compForm, code: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Type</label>
                  <select value={compForm.type} onChange={(e) => setCompForm({ ...compForm, type: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Calculation Type</label>
                  <select value={compForm.calculationType} onChange={(e) => setCompForm({ ...compForm, calculationType: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCompModal(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 16px', borderRadius: '6px', background: 'var(--accent-color, #4f46e5)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                  Save Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assign Structure */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90%', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Assign CTC & Structure to Employee</h3>
            <form onSubmit={handleAssignStructure} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Select Employee</label>
                <select
                  required
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
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
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Annual CTC (₹)</label>
                <input
                  type="number"
                  required
                  value={assignForm.ctc}
                  onChange={(e) => setAssignForm({ ...assignForm, ctc: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Effective From Date</label>
                <input
                  type="date"
                  required
                  value={assignForm.effectiveFrom}
                  onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAssignModal(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 16px', borderRadius: '6px', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                  Assign Salary Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
