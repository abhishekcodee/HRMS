import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { API_BASE_URL } from '../../config/api';
import {
  Building2,
  Users,
  ShieldCheck,
  Key,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Copy,
  Check,
  Search,
  AlertTriangle,
  Lock,
  Activity,
  PlusCircle,
  ExternalLink,
  CheckCircle2,
  X,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import './SuperAdminDashboardPage.css';

interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  inactiveCompanies: number;
  totalCompanyAdmins: number;
  totalEmployees: number;
  totalUsers: number;
  totalPlans: number;
  recentCompanies: any[];
  recentActivity: any[];
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
  monthly_price?: number;
  max_employees?: number;
  active_employees?: number;
  custom_domain?: string;
  brand_color?: string;
  total_employees: number;
  total_users: number;
  admin_id?: string;
  admin_name?: string;
  admin_email?: string;
  admin_status?: string;
  admin_last_login?: string;
}

interface CompanyAdmin {
  id: string;
  company_id: string;
  company_name: string;
  company_code: string;
  company_status: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login_at?: string;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  code: string;
  max_employees: number;
  monthly_price: number;
  annual_price: number;
}

interface AuditLog {
  id: string;
  company_id?: string;
  company_name?: string;
  company_code?: string;
  user_email?: string;
  role?: string;
  action: string;
  details: string;
  ip_address?: string;
  created_at: string;
}

export const SuperAdminDashboardPage: React.FC = () => {
  const { token, user } = useAuth();
  const { setActiveTenantId, reloadBranding } = useTenant();

  const [activeTab, setActiveTab] = useState<'companies' | 'admins' | 'overview' | 'logs' | 'plans'>('companies');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [admins, setAdmins] = useState<CompanyAdmin[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [adminSearch, setAdminSearch] = useState<string>('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('');
  const [logActionFilter, setLogActionFilter] = useState<string>('');

  // Modals state
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState<boolean>(false);
  const [showAssignAdminModal, setShowAssignAdminModal] = useState<boolean>(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);

  // Active items for modals
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<{ id: string; email: string; name: string; companyName?: string } | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    companyName: string;
    companyCode: string;
    companyId: string;
    adminName: string;
    adminEmail: string;
    password: string;
  } | null>(null);

  // Onboarding Form
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

  // Edit Company Form
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    customDomain: '',
    maxEmployees: 100,
    status: 'active',
  });

  // Assign Admin Form
  const [assignAdminForm, setAssignAdminForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  // Reset Password Form
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Helper to generate secure random password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

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
      const res = await fetch(
        `${API_BASE_URL}/super-admin/companies?search=${encodeURIComponent(search)}&status=${statusFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data);
      }
    } catch (err) {
      console.error('Fetch companies error:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/super-admin/admins?search=${encodeURIComponent(adminSearch)}&status=${adminStatusFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setAdmins(data.data);
      }
    } catch (err) {
      console.error('Fetch admins error:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/super-admin/audit-logs?action=${logActionFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Fetch audit logs error:', err);
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

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchCompanies(), fetchAdmins(), fetchLogs(), fetchPlans()]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchCompanies(), fetchAdmins(), fetchLogs()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, [token]);

  useEffect(() => {
    fetchCompanies();
  }, [search, statusFilter]);

  useEffect(() => {
    if (activeTab === 'admins') {
      fetchAdmins();
    }
  }, [adminSearch, adminStatusFilter, activeTab]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [logActionFilter, activeTab]);

  // Handle Onboard Company Submit
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
        setFeedback({ type: 'success', message: data.message || `Company '${onboardForm.name}' onboarded successfully!` });
        setShowOnboardModal(false);

        // Store credentials to show Super Admin
        setGeneratedCredentials({
          companyName: onboardForm.name,
          companyCode: onboardForm.code.toUpperCase(),
          companyId: data.data?.companyId || '',
          adminName: onboardForm.adminFullName,
          adminEmail: onboardForm.adminEmail,
          password: onboardForm.adminPassword,
        });
        setShowCredentialsModal(true);

        fetchStats();
        fetchCompanies();
        fetchAdmins();

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

  // Open Edit Company Modal
  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setEditForm({
      name: company.name,
      phone: company.phone || '',
      email: company.email,
      address: '',
      city: '',
      state: '',
      customDomain: company.custom_domain || '',
      maxEmployees: company.max_employees || 100,
      status: company.status,
    });
    setShowEditCompanyModal(true);
  };

  // Handle Edit Company Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/companies/${selectedCompany.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Company '${selectedCompany.name}' updated successfully.` });
        setShowEditCompanyModal(false);
        fetchCompanies();
        fetchStats();
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Update failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update company.' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle Company Status (Activate / Suspend)
  const handleToggleCompanyStatus = async (company: Company) => {
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
        setFeedback({ type: 'success', message: `Company '${company.name}' status set to ${newStatus.toUpperCase()}.` });
        fetchCompanies();
        fetchStats();
        fetchAdmins();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update status.' });
    }
  };

  // Open Assign Admin Modal
  const openAssignAdminModal = (company: Company) => {
    setSelectedCompany(company);
    setAssignAdminForm({
      fullName: '',
      email: '',
      password: generateStrongPassword(),
    });
    setShowAssignAdminModal(true);
  };

  // Handle Assign Admin Submit
  const handleAssignAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/companies/${selectedCompany.id}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assignAdminForm),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setShowAssignAdminModal(false);

        // Show credentials card
        setGeneratedCredentials({
          companyName: selectedCompany.name,
          companyCode: selectedCompany.code,
          companyId: selectedCompany.id,
          adminName: assignAdminForm.fullName,
          adminEmail: assignAdminForm.email,
          password: assignAdminForm.password,
        });
        setShowCredentialsModal(true);

        fetchCompanies();
        fetchAdmins();
        fetchStats();
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Assignment failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to assign administrator.' });
    } finally {
      setSaving(false);
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (admin: { id: string; email: string; name: string; companyName?: string }) => {
    setSelectedAdmin(admin);
    setNewPasswordInput(generateStrongPassword());
    setShowResetPasswordModal(true);
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/admins/${selectedAdmin.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Password reset successfully for ${selectedAdmin.email}.` });
        setShowResetPasswordModal(false);

        // Show credentials card
        setGeneratedCredentials({
          companyName: selectedAdmin.companyName || 'Assigned Company',
          companyCode: '',
          companyId: '',
          adminName: selectedAdmin.name,
          adminEmail: selectedAdmin.email,
          password: newPasswordInput,
        });
        setShowCredentialsModal(true);

        fetchLogs();
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Password reset failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to reset password.' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle Admin Status
  const handleToggleAdminStatus = async (admin: CompanyAdmin) => {
    const nextStatus = admin.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/admins/${admin.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Admin account '${admin.email}' is now ${nextStatus.toUpperCase()}.` });
        fetchAdmins();
        fetchCompanies();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update admin status.' });
    }
  };

  // Open Delete Modal
  const openDeleteModal = (company: Company) => {
    setSelectedCompany(company);
    setDeleteConfirmInput('');
    setShowDeleteModal(true);
  };

  // Handle Delete / Suspend
  const handleDeleteCompany = async (permanent: boolean) => {
    if (!selectedCompany) return;
    if (permanent && deleteConfirmInput.trim().toUpperCase() !== (selectedCompany.code || '').toUpperCase()) {
      alert(`Please type the exact company code '${selectedCompany.code}' to confirm permanent deletion.`);
      return;
    }

    setSaving(true);
    try {
      const url = `${API_BASE_URL}/super-admin/companies/${selectedCompany.id}${permanent ? '?hard=true' : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setShowDeleteModal(false);
        fetchCompanies();
        fetchStats();
        fetchAdmins();
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Action failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to delete or suspend company.' });
    } finally {
      setSaving(false);
    }
  };

  // Impersonate / Switch Tenant View
  const handleImpersonateTenant = async (companyId: string, companyName: string) => {
    setActiveTenantId(companyId);
    await reloadBranding();
    setFeedback({
      type: 'success',
      message: `Active tenant scope set to '${companyName}'. Portal theme & company data reloaded.`,
    });
  };

  return (
    <div className="superadmin-container">
      {/* Top Banner Header */}
      <div className="superadmin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-glow, rgba(124, 58, 237, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-500, #7C3AED)',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <h1>Super Admin Dashboard</h1>
            <span className="badge badge-purple" style={{ fontSize: '11px' }}>
              PLATFORM OWNER
            </span>
          </div>
          <p className="superadmin-subtitle">
            Centralized Multi-Company Management, Admin Provisioning & Data Isolation Control
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setOnboardForm({
                ...onboardForm,
                adminPassword: generateStrongPassword(),
              });
              setShowOnboardModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={16} />
            Add New Company
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`alert-banner alert-${feedback.type}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button className="close-btn" onClick={() => setFeedback(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Analytics KPI Metric Cards */}
      {stats && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon" style={{ color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' }}>
              <Building2 size={24} />
            </div>
            <div className="metric-details">
              <span className="metric-label">Total Registered Companies</span>
              <span className="metric-value">{stats.totalCompanies}</span>
              <span className="metric-sub" style={{ color: '#10B981' }}>
                {stats.activeCompanies} Active | {stats.suspendedCompanies} Suspended
              </span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ color: '#8B5CF6', background: 'rgba(139, 92, 246, 0.1)' }}>
              <Users size={24} />
            </div>
            <div className="metric-details">
              <span className="metric-label">Company Administrators</span>
              <span className="metric-value">{stats.totalCompanyAdmins}</span>
              <span className="metric-sub">Dedicated Tenant Admins</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)' }}>
              <Users size={24} />
            </div>
            <div className="metric-details">
              <span className="metric-label">Total Employees Enrolled</span>
              <span className="metric-value">{stats.totalEmployees}</span>
              <span className="metric-sub">Across All Companies</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}>
              <ShieldCheck size={24} />
            </div>
            <div className="metric-details">
              <span className="metric-label">Data Isolation Status</span>
              <span className="metric-value" style={{ fontSize: '18px', color: '#10B981' }}>
                100% STRICT RBAC
              </span>
              <span className="metric-sub">Tenant Boundaries Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="superadmin-tabs">
        <button
          className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`}
          onClick={() => setActiveTab('companies')}
        >
          <Building2 size={16} /> Manage Companies ({companies.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          <Key size={16} /> Company Administrators ({admins.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Activity size={16} /> Audit & Activity Logs
        </button>
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Platform Analytics
        </button>
        <button
          className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Subscription Plans ({plans.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading Platform Telemetry...</div>
      ) : (
        <>
          {/* TAB 1: MANAGE COMPANIES */}
          {activeTab === 'companies' && (
            <div className="tab-content">
              <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={16}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search by company name, code, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="select-filter"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active Companies</option>
                  <option value="suspended">Suspended Companies</option>
                  <option value="inactive">Inactive Companies</option>
                </select>
              </div>

              <div className="section-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Unique Code</th>
                      <th>Dedicated Admin</th>
                      <th>Staff Count</th>
                      <th>Subscription</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
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
                              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{c.name}</strong>
                              <br />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <small className="text-muted" style={{ fontFamily: 'monospace' }}>
                                  ID: {c.id}
                                </small>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(c.id, c.id)}
                                  title="Copy Company ID"
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                                >
                                  {copiedKey === c.id ? <Check size={12} color="#10B981" /> : <Copy size={12} color="var(--text-muted)" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code style={{ background: 'var(--bg-app)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            {c.code}
                          </code>
                        </td>
                        <td>
                          {c.admin_email ? (
                            <div>
                              <strong style={{ fontSize: '13px' }}>{c.admin_name || 'Admin'}</strong>
                              <br />
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.admin_email}</span>
                              {c.admin_status === 'inactive' && (
                                <span className="badge badge-warning" style={{ marginLeft: '6px' }}>
                                  INACTIVE
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn-sm btn-outline"
                              onClick={() => openAssignAdminModal(c)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <UserPlus size={12} /> Assign Admin
                            </button>
                          )}
                        </td>
                        <td>
                          {(() => {
                            const activeCount = c.active_employees !== undefined ? c.active_employees : c.total_employees;
                            const limit = c.max_employees || 100;
                            const isAtCapacity = activeCount >= limit;
                            return (
                              <div>
                                <strong style={{ color: isAtCapacity ? 'var(--error-text, #ef4444)' : 'var(--primary-500)' }}>
                                  {activeCount}
                                </strong>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {' '} / {limit}
                                </span>
                                {isAtCapacity && (
                                  <span style={{ display: 'block', fontSize: '10px', color: '#ef4444', fontWeight: 700, marginTop: '2px' }}>
                                    LIMIT REACHED
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <span className="badge badge-info">{c.plan_name || 'Standard Plan'}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${c.status === 'active' ? 'success' : 'danger'}`}>
                            {(c.status || 'active').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn-sm btn-outline"
                              onClick={() => handleImpersonateTenant(c.id, c.name)}
                              title="Switch active tenant scope to inspect this company"
                            >
                              Inspect Scope
                            </button>
                            <button
                              type="button"
                              className="btn-sm btn-outline"
                              onClick={() => openEditModal(c)}
                              title="Edit company profile"
                            >
                              <Edit size={13} />
                            </button>
                            {c.admin_id && (
                              <button
                                type="button"
                                className="btn-sm btn-outline"
                                onClick={() =>
                                  openResetPasswordModal({
                                    id: c.admin_id!,
                                    email: c.admin_email || '',
                                    name: c.admin_name || 'Admin',
                                    companyName: c.name,
                                  })
                                }
                                title="Reset Company Admin Password"
                              >
                                <Key size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className={`btn-sm ${c.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => handleToggleCompanyStatus(c)}
                              title={c.status === 'active' ? 'Suspend Company' : 'Activate Company'}
                            >
                              {c.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              className="btn-sm btn-danger"
                              onClick={() => openDeleteModal(c)}
                              title="Delete or Purge Company"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {companies.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center" style={{ padding: '32px' }}>
                          No companies found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANY ADMINISTRATORS */}
          {activeTab === 'admins' && (
            <div className="tab-content">
              <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={16}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search administrators by name, email, or company..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="search-input"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
                <select
                  value={adminStatusFilter}
                  onChange={(e) => setAdminStatusFilter(e.target.value)}
                  className="select-filter"
                >
                  <option value="">All Admin Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div className="section-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Administrator</th>
                      <th>Assigned Company</th>
                      <th>Account Status</th>
                      <th>Last Login</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((adm) => (
                      <tr key={adm.id}>
                        <td>
                          <div>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{adm.full_name}</strong>
                            <br />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{adm.email}</span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{adm.company_name}</strong>
                            <br />
                            <code style={{ fontSize: '11px', background: 'var(--bg-app)', padding: '2px 6px', borderRadius: '4px' }}>
                              {adm.company_code}
                            </code>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${adm.status === 'active' ? 'success' : 'danger'}`}>
                            {(adm.status || 'active').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {adm.last_login_at ? (
                            new Date(adm.last_login_at).toLocaleString()
                          ) : (
                            <em className="text-muted">Never Logged In</em>
                          )}
                        </td>
                        <td>{new Date(adm.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn-sm btn-outline"
                              onClick={() =>
                                openResetPasswordModal({
                                  id: adm.id,
                                  email: adm.email,
                                  name: adm.full_name,
                                  companyName: adm.company_name,
                                })
                              }
                              title="Reset Password"
                            >
                              <Key size={13} /> Reset Password
                            </button>
                            <button
                              type="button"
                              className={`btn-sm ${adm.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => handleToggleAdminStatus(adm)}
                            >
                              {adm.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {admins.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center" style={{ padding: '32px' }}>
                          No company administrators found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT & ACTIVITY LOGS */}
          {activeTab === 'logs' && (
            <div className="tab-content">
              <div className="filter-bar">
                <select
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                  className="select-filter"
                  style={{ width: '260px' }}
                >
                  <option value="">All System Actions</option>
                  <option value="TENANT_ONBOARDED">Company Onboarding</option>
                  <option value="ADMIN_CREATED">Admin Account Created</option>
                  <option value="ADMIN_PASSWORD_RESET">Password Reset</option>
                  <option value="ADMIN_STATUS_CHANGED">Admin Status Changed</option>
                  <option value="COMPANY_UPDATED">Company Settings Updated</option>
                  <option value="COMPANY_SUSPENDED">Company Suspended</option>
                </select>
              </div>

              <div className="section-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Company</th>
                      <th>Actor</th>
                      <th>Details</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((lg) => (
                      <tr key={lg.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {new Date(lg.created_at).toLocaleString()}
                        </td>
                        <td>
                          <span className="badge badge-purple" style={{ fontFamily: 'monospace' }}>
                            {lg.action}
                          </span>
                        </td>
                        <td>
                          {lg.company_name ? (
                            <strong>{lg.company_name}</strong>
                          ) : (
                            <em className="text-muted">Platform Root</em>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '12px' }}>{lg.user_email || 'System'}</span>
                        </td>
                        <td style={{ fontSize: '12px', maxWidth: '350px' }}>{lg.details}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{lg.ip_address || '-'}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center" style={{ padding: '32px' }}>
                          No audit logs found for the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PLATFORM ANALYTICS */}
          {activeTab === 'overview' && stats && (
            <div className="tab-content">
              <div className="section-card" style={{ marginBottom: '24px' }}>
                <h3>Recent Company Registrations</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th>Code</th>
                      <th>Assigned Admin</th>
                      <th>Plan</th>
                      <th>Staff Count</th>
                      <th>Status</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentCompanies.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.name}</strong>
                        </td>
                        <td>
                          <code>{c.code}</code>
                        </td>
                        <td>{c.admin_email || c.email}</td>
                        <td>
                          <span className="badge badge-info">{c.plan_name || 'Standard'}</span>
                        </td>
                        <td>{c.employee_count || 0}</td>
                        <td>
                          <span className={`badge badge-${c.status === 'active' ? 'success' : 'danger'}`}>
                            {(c.status || 'active').toUpperCase()}
                          </span>
                        </td>
                        <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="section-card">
                <h3>Latest Platform Audit Trail</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>Target Company</th>
                      <th>Actor</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recentActivity || []).map((a: any) => (
                      <tr key={a.id}>
                        <td style={{ fontSize: '12px' }}>{new Date(a.created_at).toLocaleTimeString()}</td>
                        <td>
                          <span className="badge badge-purple">{a.action}</span>
                        </td>
                        <td>{a.company_name || 'System'}</td>
                        <td>{a.user_email}</td>
                        <td style={{ fontSize: '12px' }}>{a.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PLANS TAB */}
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
                      <p>
                        <strong>Capacity Limit:</strong> Up to {p.max_employees} Staff Members
                      </p>
                      <p>
                        <strong>Annual Billing:</strong> ₹{p.annual_price} / year
                      </p>
                      <ul className="plan-features">
                        <li>✓ 100% Dedicated Multi-Tenant Database Isolation</li>
                        <li>✓ Independent Company Admin & Role Hierarchy</li>
                        <li>✓ Custom Letterhead & White-Label Document Studio</li>
                        <li>✓ Automated Payroll, PF, ESIC & Statutory Engine</li>
                        <li>✓ Biometric Device Integration & Attendance Hub</li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: ONBOARD NEW COMPANY & ADMIN */}
      {showOnboardModal && (
        <div className="modal-backdrop">
          <div className="modal-container modal-lg">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} color="var(--primary-500)" />
                <h2>Onboard New Tenant Company & Admin</h2>
              </div>
              <button className="close-btn" onClick={() => setShowOnboardModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleOnboardSubmit} className="modal-body">
              <div className="form-section">
                <h4>1. Company Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Company Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Innovations Pvt Ltd"
                      value={onboardForm.name}
                      onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Unique Company Code (3-6 chars) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACME"
                      value={onboardForm.code}
                      onChange={(e) => setOnboardForm({ ...onboardForm, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Official Company Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="contact@acme.com"
                      value={onboardForm.email}
                      onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone</label>
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
                <h4>2. Subscription & Brand Settings</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Subscription Tier</label>
                    <select
                      value={onboardForm.subscriptionPlanId}
                      onChange={(e) => setOnboardForm({ ...onboardForm, subscriptionPlanId: e.target.value })}
                    >
                      <option value="">Standard Growth Plan</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Max {p.max_employees} Staff)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Max Employees Limit</label>
                    <input
                      type="number"
                      value={onboardForm.maxEmployees}
                      onChange={(e) => setOnboardForm({ ...onboardForm, maxEmployees: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Custom Subdomain (Optional)</label>
                    <input
                      type="text"
                      placeholder="acme.wokh-hrms.com"
                      value={onboardForm.customDomain}
                      onChange={(e) => setOnboardForm({ ...onboardForm, customDomain: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Brand Theme Color</label>
                    <input
                      type="color"
                      value={onboardForm.brandColor}
                      onChange={(e) => setOnboardForm({ ...onboardForm, brandColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>3. Dedicated Company Admin Credentials</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                  This user will have full administrative rights over their company's isolated HRMS portal.
                </p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Admin Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={onboardForm.adminFullName}
                      onChange={(e) => setOnboardForm({ ...onboardForm, adminFullName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Admin Login Email / Username *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@acme.com"
                      value={onboardForm.adminEmail}
                      onChange={(e) => setOnboardForm({ ...onboardForm, adminEmail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>Admin Password *</label>
                      <button
                        type="button"
                        onClick={() => setOnboardForm({ ...onboardForm, adminPassword: generateStrongPassword() })}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-500)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        ⚡ Generate Strong
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Enter or generate password"
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
                  {saving ? 'Creating Company & Admin...' : 'Create Company & Assign Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREDENTIALS GENERATED CARD */}
      {showCredentialsModal && generatedCredentials && (
        <div className="modal-backdrop">
          <div className="modal-container modal-md">
            <div className="modal-header" style={{ background: 'var(--success-bg, rgba(16, 185, 129, 0.1))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} color="#10B981" />
                <h2 style={{ color: '#047857' }}>Admin Credentials Generated</h2>
              </div>
              <button className="close-btn" onClick={() => setShowCredentialsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                The dedicated Company Admin has been provisioned. Please copy these credentials and share them with the Company Admin.
              </p>

              <div className="credentials-card">
                <div className="cred-row">
                  <span className="cred-label">Company Name:</span>
                  <strong>{generatedCredentials.companyName}</strong>
                </div>
                {generatedCredentials.companyCode && (
                  <div className="cred-row">
                    <span className="cred-label">Company Code:</span>
                    <code>{generatedCredentials.companyCode}</code>
                  </div>
                )}
                <div className="cred-row">
                  <span className="cred-label">Admin Name:</span>
                  <span>{generatedCredentials.adminName}</span>
                </div>
                <div className="cred-row">
                  <span className="cred-label">Login Username / Email:</span>
                  <code style={{ color: '#3B82F6', fontWeight: 700 }}>{generatedCredentials.adminEmail}</code>
                </div>
                <div className="cred-row">
                  <span className="cred-label">Login Password:</span>
                  <code style={{ color: '#10B981', fontWeight: 700 }}>{generatedCredentials.password}</code>
                </div>
                <div className="cred-row">
                  <span className="cred-label">Portal Login URL:</span>
                  <span>{window.location.origin}/login</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                onClick={() => {
                  const text = `Wokhman HRMS Login Credentials:
Company: ${generatedCredentials.companyName}
Username/Email: ${generatedCredentials.adminEmail}
Password: ${generatedCredentials.password}
Portal URL: ${window.location.origin}/login`;
                  copyToClipboard(text, 'all-creds');
                }}
              >
                {copiedKey === 'all-creds' ? <Check size={16} /> : <Copy size={16} />}
                {copiedKey === 'all-creds' ? 'Credentials Copied to Clipboard!' : 'Copy All Credentials'}
              </button>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowCredentialsModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT COMPANY */}
      {showEditCompanyModal && selectedCompany && (
        <div className="modal-backdrop">
          <div className="modal-container modal-md">
            <div className="modal-header">
              <h2>Edit Company: {selectedCompany.name}</h2>
              <button className="close-btn" onClick={() => setShowEditCompanyModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Contact Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Max Employees Allowed</label>
                <input
                  type="number"
                  value={editForm.maxEmployees}
                  onChange={(e) => setEditForm({ ...editForm, maxEmployees: Number(e.target.value) })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Custom Domain</label>
                <input
                  type="text"
                  value={editForm.customDomain}
                  onChange={(e) => setEditForm({ ...editForm, customDomain: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Account Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditCompanyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving Changes...' : 'Save Company Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ASSIGN COMPANY ADMIN */}
      {showAssignAdminModal && selectedCompany && (
        <div className="modal-backdrop">
          <div className="modal-container modal-md">
            <div className="modal-header">
              <h2>Assign Dedicated Admin: {selectedCompany.name}</h2>
              <button className="close-btn" onClick={() => setShowAssignAdminModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleAssignAdminSubmit} className="modal-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Admin Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Patel"
                  value={assignAdminForm.fullName}
                  onChange={(e) => setAssignAdminForm({ ...assignAdminForm, fullName: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Admin Email / Username *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@company.com"
                  value={assignAdminForm.email}
                  onChange={(e) => setAssignAdminForm({ ...assignAdminForm, email: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Initial Password *</label>
                  <button
                    type="button"
                    onClick={() => setAssignAdminForm({ ...assignAdminForm, password: generateStrongPassword() })}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-500)', fontSize: '11px', cursor: 'pointer' }}
                  >
                    ⚡ Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={assignAdminForm.password}
                  onChange={(e) => setAssignAdminForm({ ...assignAdminForm, password: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignAdminModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Assigning...' : 'Assign Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: RESET ADMIN PASSWORD */}
      {showResetPasswordModal && selectedAdmin && (
        <div className="modal-backdrop">
          <div className="modal-container modal-md">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--primary-500)" />
                <h2>Reset Admin Password</h2>
              </div>
              <button className="close-btn" onClick={() => setShowResetPasswordModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Resetting password for <strong>{selectedAdmin.name}</strong> (<code>{selectedAdmin.email}</code>)
              </p>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>New Password *</label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(generateStrongPassword())}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-500)', fontSize: '11px', cursor: 'pointer' }}
                  >
                    ⚡ Generate Strong
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowResetPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Updating Password...' : 'Save & Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: DELETE / SUSPEND COMPANY */}
      {showDeleteModal && selectedCompany && (
        <div className="modal-backdrop">
          <div className="modal-container modal-md">
            <div className="modal-header" style={{ background: 'var(--error-bg, rgba(239, 68, 68, 0.1))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#EF4444" />
                <h2 style={{ color: '#DC2626' }}>Delete / Suspend: {selectedCompany.name}</h2>
              </div>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Please choose the desired action for company <strong>{selectedCompany.name}</strong> (<code>{selectedCompany.code}</code>):
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '16px 0' }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface-hover)',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '14px', color: '#F59E0B' }}>
                    Option A: Suspend Tenant (Recommended)
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Instantly revokes access for all company administrators and employees. Database records and audit trails remain preserved.
                  </span>
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn-sm btn-outline"
                      onClick={() => handleDeleteCompany(false)}
                      disabled={saving}
                    >
                      Suspend Company Access
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--error-border, rgba(239, 68, 68, 0.3))',
                    background: 'var(--error-bg, rgba(239, 68, 68, 0.05))',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '14px', color: '#DC2626' }}>
                    Option B: Permanent Purge (Irreversible)
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Permanently purges all employee profiles, payroll records, leave records, and company administrator accounts.
                  </span>
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                      Type <strong>{selectedCompany.code}</strong> to confirm:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder={selectedCompany.code}
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                      <button
                        type="button"
                        className="btn-sm btn-danger"
                        disabled={deleteConfirmInput.trim().toUpperCase() !== (selectedCompany.code || '').toUpperCase() || saving}
                        onClick={() => handleDeleteCompany(true)}
                      >
                        Permanently Purge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
