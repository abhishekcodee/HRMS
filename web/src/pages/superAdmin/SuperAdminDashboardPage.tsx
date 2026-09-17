import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { API_BASE_URL } from '../../config/api';
import './SuperAdminDashboardPage.css';

interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  totalEmployees: number;
  totalUsers: number;
  totalPlans: number;
  recentCompanies: any[];
}

interface Company {
  id: string;
  name: string;
  code: string;
  email: string;
  phone?: string;
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
  plan_name?: string;
  custom_domain?: string;
  brand_color?: string;
  total_employees: number;
  total_users: number;
}

interface Plan {
  id: string;
  name: string;
  code: string;
  max_employees: number;
  monthly_price: number;
  annual_price: number;
}

export const SuperAdminDashboardPage: React.FC = () => {
  const { token, user } = useAuth();
  const { setActiveTenantId, reloadBranding } = useTenant();

  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'plans'>('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Onboarding Modal state
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    zipCode: '',
    taxId: '',
    logoUrl: '',
    brandColor: '#1e293b',
    secondaryBrandColor: '#0f172a',
    customDomain: '',
    subscriptionPlanId: '',
    maxEmployees: 100,
    adminEmail: '',
    adminFullName: '',
    adminPassword: '',
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/companies?search=${encodeURIComponent(search)}&status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data);
      }
    } catch (err) {
      console.error('Fetch companies error:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (err) {
      console.error('Fetch plans error:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchCompanies(), fetchPlans()]);
      setLoading(false);
    };
    loadAll();
  }, [token]);

  useEffect(() => {
    fetchCompanies();
  }, [search, statusFilter]);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(onboardForm),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message || 'Company onboarded successfully!' });
        setShowOnboardModal(false);
        fetchStats();
        fetchCompanies();
        if (data.data?.id) {
          setActiveTenantId(data.data.id);
          await reloadBranding();
        }
        // Reset form
        setOnboardForm({
          name: '',
          code: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          country: 'India',
          zipCode: '',
          taxId: '',
          logoUrl: '',
          brandColor: '#1e293b',
          secondaryBrandColor: '#0f172a',
          customDomain: '',
          subscriptionPlanId: '',
          maxEmployees: 100,
          adminEmail: '',
          adminFullName: '',
          adminPassword: '',
        });
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Onboarding failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Server connection error.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (company: Company) => {
    const newStatus = company.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to change status of '${company.name}' to ${newStatus.toUpperCase()}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/companies/${company.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Company status updated to ${newStatus.toUpperCase()}.` });
        fetchCompanies();
        fetchStats();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update status.' });
    }
  };

  const handleImpersonateTenant = async (companyId: string, companyName: string) => {
    setActiveTenantId(companyId);
    await reloadBranding();
    setFeedback({ type: 'success', message: `Active tenant switched to '${companyName}'. Portal theme & branding reloaded.` });
  };

  return (
    <div className="superadmin-container">
      <div className="superadmin-header">
        <div>
          <h1>SaaS Platform Control Center</h1>
          <p className="superadmin-subtitle">Multi-Tenant Corporate Administration & White-Label Management</p>
        </div>
        <button className="btn-primary" onClick={() => setShowOnboardModal(true)}>
          + Onboard New Company
        </button>
      </div>

      {feedback && (
        <div className={`alert-banner alert-${feedback.type}`}>
          {feedback.message}
          <button className="close-btn" onClick={() => setFeedback(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="superadmin-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Platform Overview
        </button>
        <button className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`} onClick={() => setActiveTab('companies')}>
          Tenant Companies ({companies.length})
        </button>
        <button className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>
          Subscription Plans ({plans.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading Platform Telemetry...</div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && stats && (
            <div className="tab-content">
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">🏢</div>
                  <div className="metric-details">
                    <span className="metric-label">Total Onboarded Tenants</span>
                    <span className="metric-value">{stats.totalCompanies}</span>
                    <span className="metric-sub">{stats.activeCompanies} Active Accounts</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">👥</div>
                  <div className="metric-details">
                    <span className="metric-label">Total Managed Employees</span>
                    <span className="metric-value">{stats.totalEmployees}</span>
                    <span className="metric-sub">Across All Companies</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">🔐</div>
                  <div className="metric-details">
                    <span className="metric-label">Registered User Accounts</span>
                    <span className="metric-value">{stats.totalUsers}</span>
                    <span className="metric-sub">Admins & Employees</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">💳</div>
                  <div className="metric-details">
                    <span className="metric-label">Active Subscription Plans</span>
                    <span className="metric-value">{stats.totalPlans}</span>
                    <span className="metric-sub">Starter, Growth, Enterprise</span>
                  </div>
                </div>
              </div>

              <div className="section-card">
                <h3>Recently Onboarded Companies</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th>Code</th>
                      <th>Admin Email</th>
                      <th>Plan</th>
                      <th>Employees</th>
                      <th>Status</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentCompanies.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.name}</strong>
                        </td>
                        <td><code>{c.code}</code></td>
                        <td>{c.email}</td>
                        <td><span className="badge badge-info">{c.plan_name || 'Standard Plan'}</span></td>
                        <td>{c.employee_count || 0}</td>
                        <td>
                          <span className={`badge badge-${c.status === 'active' ? 'success' : 'danger'}`}>
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td>{new Date(c.created_at).toLocaleDateString()}</td>
                        <td>
                          <button className="btn-sm" onClick={() => handleImpersonateTenant(c.id, c.name)}>
                            View Tenant
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMPANIES TAB */}
          {activeTab === 'companies' && (
            <div className="tab-content">
              <div className="filter-bar">
                <input
                  type="text"
                  placeholder="Search by company name, code or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-filter">
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="section-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Code</th>
                      <th>Contact Email</th>
                      <th>Custom Domain</th>
                      <th>Plan</th>
                      <th>Users / Emps</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="company-cell">
                            {c.brand_color && (
                              <span className="color-indicator" style={{ backgroundColor: c.brand_color }} />
                            )}
                            <div>
                              <strong>{c.name}</strong>
                              <br />
                              <small className="text-muted">ID: {c.id}</small>
                            </div>
                          </div>
                        </td>
                        <td><code>{c.code}</code></td>
                        <td>{c.email}</td>
                        <td>{c.custom_domain || <em className="text-muted">Default domain</em>}</td>
                        <td><span className="badge badge-info">{c.plan_name || 'Standard'}</span></td>
                        <td>{c.total_users || 0} / {c.total_employees || 0}</td>
                        <td>
                          <span className={`badge badge-${c.status === 'active' ? 'success' : 'danger'}`}>
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-sm btn-outline" onClick={() => handleImpersonateTenant(c.id, c.name)}>
                              Inspect Context
                            </button>
                            <button
                              className={`btn-sm ${c.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => handleToggleStatus(c)}
                            >
                              {c.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {companies.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center">No tenant companies match your filter query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PLANS TAB */}
          {activeTab === 'plans' && (
            <div className="tab-content">
              <div className="plans-grid">
                {plans.map((p) => (
                  <div key={p.id} className="plan-card">
                    <div className="plan-header">
                      <h3>{p.name}</h3>
                      <span className="plan-price">₹{p.monthly_price} / month</span>
                    </div>
                    <div className="plan-body">
                      <p><strong>Max Employees:</strong> {p.max_employees} Staff Members</p>
                      <p><strong>Annual Option:</strong> ₹{p.annual_price} / year</p>
                      <ul className="plan-features">
                        <li>✓ Multi-tenant isolated DB & storage</li>
                        <li>✓ Full Payroll & Tax Formula Engine</li>
                        <li>✓ Dynamic White-Labeling & Branding</li>
                        <li>✓ Audit Logs & RBAC Security</li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ONBOARDING MODAL */}
      {showOnboardModal && (
        <div className="modal-backdrop">
          <div className="modal-container modal-lg">
            <div className="modal-header">
              <h2>Onboard New Tenant Company</h2>
              <button className="close-btn" onClick={() => setShowOnboardModal(false)}>×</button>
            </div>
            <form onSubmit={handleOnboardSubmit} className="modal-body">
              <div className="form-section">
                <h4>Company Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Company Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                      value={onboardForm.name}
                      onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Code (3-6 chars) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACME"
                      value={onboardForm.code}
                      onChange={(e) => setOnboardForm({ ...onboardForm, code: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Primary Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="info@acmetech.com"
                      value={onboardForm.email}
                      onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={onboardForm.phone}
                      onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Subscription & Branding</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Subscription Plan</label>
                    <select
                      value={onboardForm.subscriptionPlanId}
                      onChange={(e) => setOnboardForm({ ...onboardForm, subscriptionPlanId: e.target.value })}
                    >
                      <option value="">Default Plan</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Max {p.max_employees} emps)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Custom Subdomain / Host</label>
                    <input
                      type="text"
                      placeholder="acme.hrms.com"
                      value={onboardForm.customDomain}
                      onChange={(e) => setOnboardForm({ ...onboardForm, customDomain: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Primary Brand Color</label>
                    <input
                      type="color"
                      value={onboardForm.brandColor}
                      onChange={(e) => setOnboardForm({ ...onboardForm, brandColor: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Secondary Color</label>
                    <input
                      type="color"
                      value={onboardForm.secondaryBrandColor}
                      onChange={(e) => setOnboardForm({ ...onboardForm, secondaryBrandColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Initial Company Admin Credentials</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Admin Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={onboardForm.adminFullName}
                      onChange={(e) => setOnboardForm({ ...onboardForm, adminFullName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Admin Login Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@acmetech.com"
                      value={onboardForm.adminEmail}
                      onChange={(e) => setOnboardForm({ ...onboardForm, adminEmail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Admin Initial Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Min 8 chars"
                      value={onboardForm.adminPassword}
                      onChange={(e) => setOnboardForm({ ...onboardForm, adminPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowOnboardModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Provisioning Tenant...' : 'Onboard Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
