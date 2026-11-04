import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, TableContainer, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, Input, Select, Modal, Alert } from '../components/ui';
import { ShieldCheck, Check, X, UserPlus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UsersRolesPage: React.FC = () => {
  const { token } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'employee',
    status: 'active',
    departmentName: 'Software Engineering',
    designation: 'Software Developer',
    companyName: 'Wokhman Inc.',
    taxId: '',
  });

  const fetchUsers = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setUsersList(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`/api/v1/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Status toggle error:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    if (!formData.employeeId || !formData.fullName || !formData.email || !formData.password) {
      setModalError('Please complete all required fields (*).');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setModalError(data.error?.message || 'Failed to create user account.');
      } else {
        setModalSuccess(data.message || 'User created successfully.');
        fetchUsers();
        setTimeout(() => {
          setShowCreateModal(false);
          setModalSuccess(null);
          setFormData({
            employeeId: '',
            fullName: '',
            email: '',
            phone: '',
            password: '',
            role: 'employee',
            status: 'active',
            departmentName: 'Software Engineering',
            designation: 'Software Developer',
            companyName: 'Wokhman Inc.',
            taxId: '',
          });
        }, 1200);
      }
    } catch (err) {
      setModalError('Network error creating user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3-Role Access Matrix (Admin, Employer, Employee)
  const permissionsMatrix = [
    { module: 'Dashboard & System Overview', admin: true, employer: true, employee: true },
    { module: 'Employee Directory & Profiles', admin: true, employer: true, employee: false },
    { module: 'Organization Hierarchy (Depts & Teams)', admin: true, employer: true, employee: false },
    { module: 'Attendance Ingestion & Work Duration Logs', admin: true, employer: true, employee: false },
    { module: 'Leave Request Approvals', admin: true, employer: true, employee: false },
    { module: 'Company Documents Vault', admin: true, employer: true, employee: false },
    { module: 'Personal Profile & My Leave', admin: true, employer: true, employee: true },
    { module: 'Admin User Creation & Account Status', admin: true, employer: false, employee: false },
    { module: 'System Security & Audit Logs', admin: true, employer: false, employee: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Users & Role Access Control</h1>
          <p className="page-subtitle">User Management • 3-Role RBAC Architecture (Admin, Employer, Employee)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" onClick={fetchUsers} isLoading={isLoading}>
            <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <UserPlus size={18} style={{ marginRight: '0.5rem' }} /> Create New User
          </Button>
        </div>
      </div>

      {/* Database Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered System Accounts ({usersList.length})</CardTitle>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>Employee ID</Th>
                  <Th>Full Name & Email</Th>
                  <Th>Role</Th>
                  <Th>Department / Designation</Th>
                  <Th>Status</Th>
                  <Th>Last Login</Th>
                  <Th style={{ textAlign: 'right' }}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {usersList.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No accounts found. Click "Refresh" or "Create New User".
                    </Td>
                  </Tr>
                ) : (
                  usersList.map((u) => (
                    <Tr key={u.id}>
                      <Td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{u.employeeId}</Td>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </Td>
                      <Td>
                        <Badge
                          variant={
                            u.role === 'admin' ? 'error' : u.role === 'employer' ? 'warning' : 'success'
                          }
                        >
                          {String(u.role || 'employee').toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>
                        <div style={{ fontSize: '0.875rem' }}>{u.designation || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {u.departmentName || 'Management'}
                        </div>
                      </Td>
                      <Td>
                        <Badge variant={u.status === 'active' ? 'success' : 'error'}>
                          {String(u.status || 'active').toUpperCase()}
                        </Badge>
                      </Td>
                      <Td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                      </Td>
                      <Td style={{ textAlign: 'right' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleStatusToggle(u.id, u.status)}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      {/* 3-Role Access Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>System Role Permission Matrix (Admin • Employer • Employee)</CardTitle>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>System Module & Feature</Th>
                  <Th style={{ textAlign: 'center' }}>Admin</Th>
                  <Th style={{ textAlign: 'center' }}>Employer</Th>
                  <Th style={{ textAlign: 'center' }}>Employee</Th>
                </Tr>
              </Thead>
              <Tbody>
                {permissionsMatrix.map((item, idx) => (
                  <Tr key={idx}>
                    <Td style={{ fontWeight: 600 }}>{item.module}</Td>
                    <Td style={{ textAlign: 'center' }}>
                      {item.admin ? <Check size={18} color="var(--success-text)" /> : <X size={18} color="var(--text-disabled)" />}
                    </Td>
                    <Td style={{ textAlign: 'center' }}>
                      {item.employer ? <Check size={18} color="var(--success-text)" /> : <X size={18} color="var(--text-disabled)" />}
                    </Td>
                    <Td style={{ textAlign: 'center' }}>
                      {item.employee ? <Check size={18} color="var(--success-text)" /> : <X size={18} color="var(--text-disabled)" />}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New System User"
      >
        <form onSubmit={handleCreateSubmit}>
          {modalError && <Alert variant="error" title="Error">{modalError}</Alert>}
          {modalSuccess && <Alert variant="success" title="Success">{modalSuccess}</Alert>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Select
              label="Assigned System Role"
              required
              options={[
                { value: 'employer', label: 'Employer' },
                { value: 'employee', label: 'Employee' },
                { value: 'admin', label: 'Admin' },
              ]}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />

            <Input
              label="Employee / Employer ID"
              required
              placeholder="e.g. EMP105"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Input
              label="Full Name"
              required
              placeholder="First Last"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="user@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              label="Initial Password"
              type="password"
              required
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {formData.role === 'employee' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <Input
                label="Department"
                placeholder="Software Engineering"
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
              />

              <Input
                label="Designation"
                placeholder="Software Developer"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save to Database
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersRolesPage;
