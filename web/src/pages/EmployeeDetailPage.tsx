import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { UserRole, MOCK_EMPLOYEES, MOCK_ATTENDANCE, MOCK_LEAVE_REQUESTS, MOCK_DOCUMENTS } from '@hrms/shared';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Tabs,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Breadcrumbs,
  Modal,
  Input,
  Alert
} from '../components/ui';
import { Mail, Phone, MapPin, Calendar, Building2, User, FileText, Receipt, ArrowLeft, Download, ShieldCheck, Edit3, CheckCircle2 } from 'lucide-react';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const initialEmployee = MOCK_EMPLOYEES.find(e => e.id === id) || MOCK_EMPLOYEES[0];

  const [employee, setEmployee] = useState({
    firstName: initialEmployee.firstName,
    lastName: initialEmployee.lastName,
    email: initialEmployee.email,
    phone: initialEmployee.phone,
    address: initialEmployee.address,
    emergencyContact: initialEmployee.emergencyContact,
    emergencyPhone: initialEmployee.emergencyPhone,
    gender: initialEmployee.gender,
    dob: initialEmployee.dob,
    designation: initialEmployee.designation,
    employeeId: initialEmployee.employeeId,
    departmentName: initialEmployee.departmentName,
    teamName: initialEmployee.teamName,
    status: initialEmployee.status,
    avatar: initialEmployee.avatar,
    managerName: initialEmployee.managerName,
    joiningDate: initialEmployee.joiningDate,
    role: initialEmployee.role,
  });

  const [editForm, setEditForm] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    address: employee.address,
    emergencyContact: employee.emergencyContact,
    emergencyPhone: employee.emergencyPhone,
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setEmployee(prev => ({
      ...prev,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      phone: editForm.phone,
      address: editForm.address,
      emergencyContact: editForm.emergencyContact,
      emergencyPhone: editForm.emergencyPhone,
    }));
    setEditModalOpen(false);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs items={[{ label: 'Employees', href: '/employees' }, { label: `${employee.firstName} ${employee.lastName}` }]} />

      {successToast && (
        <Alert variant="success" title="Profile Details Updated">
          Your profile contact information and personal details have been updated successfully.
        </Alert>
      )}

      {/* Profile Header Banner */}
      <Card style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Avatar name={`${employee.firstName} ${employee.lastName}`} src={employee.avatar} size="xl" status="online" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'warning'}>{employee.status}</Badge>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {employee.designation} • <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{employee.employeeId}</span>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {employee.departmentName} ({employee.teamName})
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {role !== UserRole.EMPLOYEE && (
              <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => navigate('/employees')}>
                Back to Directory
              </Button>
            )}
            <Button variant="secondary" icon={<ShieldCheck size={16} />} onClick={() => navigate('/change-password')}>
              Change Password
            </Button>
            <Button variant="primary" icon={<Edit3 size={16} />} onClick={() => setEditModalOpen(true)}>
              Edit Profile
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview & Personal' },
          { id: 'employment', label: 'Employment Details' },
          { id: 'attendance', label: 'Attendance Records' },
          { id: 'leave', label: 'Leave History' },
          { id: 'documents', label: 'Documents' },
          { id: 'compensation', label: 'Compensation & Payroll' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <Card>
            <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Gender:</span> <strong>{employee.gender}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span> <strong>{employee.dob}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{employee.email}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{employee.phone}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> <strong>{employee.address}</strong></div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Contact Person:</span> <strong>{employee.emergencyContact}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Emergency Phone:</span> <strong>{employee.emergencyPhone}</strong></div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'employment' && (
        <Card>
          <CardHeader><CardTitle>Organization & Manager Allocation</CardTitle></CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', fontSize: '0.875rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Department:</span> <div><strong>{employee.departmentName}</strong></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Team:</span> <div><strong>{employee.teamName}</strong></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Direct Manager:</span> <div><strong>{employee.managerName || 'N/A (Head of Dept)'}</strong></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Date of Joining:</span> <div><strong>{employee.joiningDate}</strong></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>System Role:</span> <div><Badge variant="info">{employee.role}</Badge></div></div>
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'documents' && (
        <TableContainer>
          <Table>
            <Thead>
              <Tr><Th>Document Title</Th><Th>Category</Th><Th>Uploaded Date</Th><Th>Status</Th><Th style={{ textAlign: 'right' }}>Download</Th></Tr>
            </Thead>
            <Tbody>
              {MOCK_DOCUMENTS.map(doc => (
                <Tr key={doc.id}>
                  <Td style={{ fontWeight: 600 }}>{doc.title}</Td>
                  <Td>{doc.category}</Td>
                  <Td>{doc.uploadedAt}</Td>
                  <Td><Badge variant="success">{doc.status}</Badge></Td>
                  <Td style={{ textAlign: 'right' }}>
                    <Button variant="outline" size="sm" icon={<Download size={14} />}>Download</Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Profile Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Profile Details">
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                First Name
              </label>
              <Input
                value={editForm.firstName}
                onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Last Name
              </label>
              <Input
                value={editForm.lastName}
                onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Email Address
            </label>
            <Input
              type="email"
              value={editForm.email}
              onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Phone Number
            </label>
            <Input
              value={editForm.phone}
              onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Residential Address
            </label>
            <Input
              value={editForm.address}
              onChange={e => setEditForm({ ...editForm, address: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Emergency Contact Name
              </label>
              <Input
                value={editForm.emergencyContact}
                onChange={e => setEditForm({ ...editForm, emergencyContact: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Emergency Phone
              </label>
              <Input
                value={editForm.emergencyPhone}
                onChange={e => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" icon={<CheckCircle2 size={16} />}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeDetailPage;
