import React, { useState } from 'react';
import { Modal, Input, Select, Button, FormSection } from './ui';
import { MOCK_DEPARTMENTS, MOCK_TEAMS, EmployeeMock } from '@hrms/shared';
import { Upload, FileText } from 'lucide-react';

export interface AddEditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: EmployeeMock | null;
  onSave: (data: Partial<EmployeeMock>) => void;
}

export const AddEditEmployeeModal: React.FC<AddEditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave
}) => {
  const isEdit = !!employee;
  const [formData, setFormData] = useState<Partial<EmployeeMock>>(
    employee || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'Male',
      dob: '1995-01-01',
      address: '',
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      departmentId: MOCK_DEPARTMENTS[0].id,
      departmentName: MOCK_DEPARTMENTS[0].name,
      teamId: MOCK_TEAMS[0].id,
      teamName: MOCK_TEAMS[0].name,
      designation: 'Software Developer',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      emergencyContact: '',
      emergencyPhone: ''
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Profile: ${employee?.firstName} ${employee?.lastName}` : 'Add New Employee Profile'}
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Section 1: Personal Information */}
        <FormSection title="1. Personal Information" description="Basic personal details & identification">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="First Name"
              required
              value={formData.firstName || ''}
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={formData.lastName || ''}
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Gender"
              required
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' }
              ]}
              value={formData.gender || 'Male'}
              onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
            />
            <Input
              label="Date of Birth"
              type="date"
              required
              value={formData.dob || ''}
              onChange={e => setFormData({ ...formData, dob: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Official Email"
              type="email"
              required
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              required
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <Input
            label="Residential Address"
            value={formData.address || ''}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
          />
        </FormSection>

        {/* Section 2: Employment Information */}
        <FormSection title="2. Employment Information" description="Organization hierarchy & role allocation">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Employee ID"
              required
              disabled={isEdit}
              value={formData.employeeId || ''}
              onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
            />
            <Input
              label="Designation"
              required
              value={formData.designation || ''}
              onChange={e => setFormData({ ...formData, designation: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Department"
              required
              options={MOCK_DEPARTMENTS.map(d => ({ value: d.id, label: d.name }))}
              value={formData.departmentId || MOCK_DEPARTMENTS[0].id}
              onChange={e => {
                const dept = MOCK_DEPARTMENTS.find(d => d.id === e.target.value);
                setFormData({ ...formData, departmentId: e.target.value, departmentName: dept?.name || '' });
              }}
            />
            <Select
              label="Team"
              required
              options={MOCK_TEAMS.map(t => ({ value: t.id, label: t.name }))}
              value={formData.teamId || MOCK_TEAMS[0].id}
              onChange={e => {
                const tm = MOCK_TEAMS.find(t => t.id === e.target.value);
                setFormData({ ...formData, teamId: e.target.value, teamName: tm?.name || '' });
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Date of Joining"
              type="date"
              required
              value={formData.joiningDate || ''}
              onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
            />
            <Select
              label="Employment Status"
              required
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'PROBATION', label: 'Probation' },
                { value: 'NOTICE_PERIOD', label: 'Notice Period' },
                { value: 'INACTIVE', label: 'Inactive' }
              ]}
              value={formData.status || 'ACTIVE'}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
            />
          </div>
        </FormSection>

        {/* Section 3: Contact / Emergency */}
        <FormSection title="3. Contact & Emergency Details" description="Emergency contacts for workplace safety">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Emergency Contact Person"
              placeholder="e.g. Ramesh Patel (Spouse)"
              value={formData.emergencyContact || ''}
              onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
            />
            <Input
              label="Emergency Phone"
              placeholder="+91 98000 00000"
              value={formData.emergencyPhone || ''}
              onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
            />
          </div>
        </FormSection>

        {/* Section 4: Document Upload Placeholders */}
        <FormSection title="4. Identity & Compliance Documents" description="Upload Aadhaar, PAN, and Employment Contract">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div
              style={{
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface-hover)'
              }}
            >
              <FileText size={24} color="var(--primary-500)" style={{ marginBottom: '0.35rem' }} />
              <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>Upload Identity Proof (Aadhaar/PAN)</div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>PDF, PNG, JPG (Max 5MB)</span>
              <div style={{ marginTop: '0.5rem' }}>
                <Button type="button" variant="outline" size="sm" icon={<Upload size={14} />}>
                  Browse File
                </Button>
              </div>
            </div>
            <div
              style={{
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface-hover)'
              }}
            >
              <FileText size={24} color="var(--primary-500)" style={{ marginBottom: '0.35rem' }} />
              <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>Upload Offer / Contract Letter</div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>PDF (Max 10MB)</span>
              <div style={{ marginTop: '0.5rem' }}>
                <Button type="button" variant="outline" size="sm" icon={<Upload size={14} />}>
                  Browse File
                </Button>
              </div>
            </div>
          </div>
        </FormSection>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isEdit ? 'Save Employee Profile' : '+ Create Employee Profile'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
