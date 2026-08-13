import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { UserRole, MOCK_DOCUMENTS } from '@hrms/shared';
import { fetchEmployeeByIdFromDb, updateEmployeeInDb, EmployeeDbRecord } from '../services/employeeApi';
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
import { ArrowLeft, ShieldCheck, Edit3, CheckCircle2 } from 'lucide-react';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeDbRecord | null>(null);

  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const loadProfileFromDb = async () => {
    setLoading(true);
    try {
      let data: EmployeeDbRecord | null = null;
      if (id) {
        data = await fetchEmployeeByIdFromDb(id);
      }
      if (data) {
        setEmployee(data);
        setEditForm({
          fullName: data.fullName || '',
          phone: data.phone || '',
          address: data.address || '',
          emergencyContact: data.emergencyContact || '',
          emergencyPhone: data.emergencyPhone || '',
        });
      }
    } catch (err) {
      console.error('Failed to load employee from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileFromDb();
  }, [id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    const res = await updateEmployeeInDb(employee.id, {
      fullName: editForm.fullName,
      phone: editForm.phone,
      address: editForm.address,
      emergencyContact: editForm.emergencyContact,
      emergencyPhone: editForm.emergencyPhone,
    });

    if (res.success) {
      setEditModalOpen(false);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      await loadProfileFromDb();
    }
  };

  if (loading) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading employee database record...</p>
      </Card>
    );
  }

  if (!employee) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Employee Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No matching record was found in the database.</p>
        <Button variant="primary" onClick={() => navigate('/employees')}>Back to Employee Directory</Button>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs items={[{ label: 'Employees', href: '/employees' }, { label: employee.fullName }]} />

      {successToast && (
        <Alert variant="success" title="Profile Details Updated in Database">
          Your profile contact information and details have been saved to MySQL successfully.
        </Alert>
      )}

      {/* Profile Header Banner */}
      <Card style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Avatar name={employee.fullName} src={employee.profilePhoto} size="xl" status="online" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {employee.fullName}
                </h1>
                <Badge variant={employee.status === 'active' ? 'success' : 'neutral'}>{employee.status ? employee.status.toUpperCase() : 'ACTIVE'}</Badge>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {employee.designation || 'Employee'} • <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{employee.employeeId}</span>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {employee.departmentName || 'General Department'} ({employee.role})
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
          { id: 'documents', label: 'Documents' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <Card>
            <CardHeader><CardTitle>Personal Details (Database)</CardTitle></CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Gender:</span> <strong>{employee.gender || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span> <strong>{employee.dob || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{employee.email}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{employee.phone || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> <strong>{employee.address || '—'}</strong></div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Contact Person:</span> <strong>{employee.emergencyContact || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Emergency Phone:</span> <strong>{employee.emergencyPhone || '—'}</strong></div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'employment' && (
        <Card>
          <CardHeader><CardTitle>Organization & Master Allocation</CardTitle></CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', fontSize: '0.875rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Department:</span> <div><strong>{employee.departmentName || 'General'}</strong></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Designation:</span> <div><strong>{employee.designation || 'Employee'}</strong></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Branch Location:</span> <div><strong>{employee.branchName || 'Corporate HQ'}</strong></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Shift:</span> <div><strong>{employee.shiftName || 'General Day Shift'}</strong></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Date of Joining:</span> <div><strong>{employee.joiningDate || '—'}</strong></div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>System Role:</span> <div><Badge variant="info">{employee.role}</Badge></div></div>
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'documents' && (
        <TableContainer>
          <Table>
            <Thead>
              <Tr><Th>Document Title</Th><Th>Category</Th><Th>Uploaded Date</Th><Th>Status</Th></Tr>
            </Thead>
            <Tbody>
              {MOCK_DOCUMENTS.map(doc => (
                <Tr key={doc.id}>
                  <Td style={{ fontWeight: 600 }}>{doc.title}</Td>
                  <Td>{doc.category}</Td>
                  <Td>{doc.uploadedAt}</Td>
                  <Td><Badge variant="success">{doc.status}</Badge></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Profile Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Profile Details in Database">
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Full Name
            </label>
            <Input
              value={editForm.fullName}
              onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
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
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Residential Address
            </label>
            <Input
              value={editForm.address}
              onChange={e => setEditForm({ ...editForm, address: e.target.value })}
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

