import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button, FormSection } from './ui';
import { fetchMasterDepartments, fetchMasterDesignations, MasterDepartment, MasterDesignation } from '../services/masterApi';
import { EmployeeDbRecord } from '../services/employeeApi';
import { Upload, FileText } from 'lucide-react';

export interface AddEditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: EmployeeDbRecord | null;
  onSave: (data: any) => Promise<void>;
}

export const AddEditEmployeeModal: React.FC<AddEditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave
}) => {
  const isEdit = !!employee;
  const [departments, setDepartments] = useState<MasterDepartment[]>([]);
  const [designations, setDesignations] = useState<MasterDesignation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState<any>({
    fullName: employee?.fullName || '',
    employeeId: employee?.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    email: employee?.email || '',
    password: 'Employee@123',
    phone: employee?.phone || '',
    gender: employee?.gender || 'Male',
    dob: employee?.dob || '1995-01-01',
    address: employee?.address || '',
    role: employee?.role || 'employee',
    status: employee?.status || 'active',
    departmentName: employee?.departmentName || '',
    designation: employee?.designation || '',
    joiningDate: employee?.joiningDate || new Date().toISOString().split('T')[0],
    salary: employee?.salary || 65000,
    emergencyContact: employee?.emergencyContact || '',
    emergencyPhone: employee?.emergencyPhone || ''
  });

  useEffect(() => {
    async function loadMasterData() {
      const depts = await fetchMasterDepartments();
      const desigs = await fetchMasterDesignations();
      setDepartments(depts);
      setDesignations(desigs);

      if (!employee && depts.length > 0 && !formData.departmentName) {
        setFormData((prev: any) => ({
          ...prev,
          departmentName: depts[0].name,
          designation: desigs.length > 0 ? desigs[0].name : 'Senior Software Engineer'
        }));
      }
    }
    loadMasterData();
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.fullName || !formData.fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      setErrorMessage('Official Email is required.');
      return;
    }
    if (!formData.employeeId || !formData.employeeId.trim()) {
      setErrorMessage('Employee ID is required.');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save employee in database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Database Record: ${employee?.fullName}` : 'Add New Employee (Database First)'}
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {errorMessage && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem' }}>
            {errorMessage}
          </div>
        )}

        {/* Section 1: Personal Information */}
        <FormSection title="1. Personal Details (Saved to Database)" description="Basic user credentials & identification">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Full Name"
              required
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            />
            <Input
              label="Employee ID (Unique Key)"
              required
              disabled={isEdit}
              value={formData.employeeId}
              onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Official Email"
              type="email"
              required
              disabled={isEdit}
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            {!isEdit ? (
              <Input
                label="Initial Password"
                type="password"
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            ) : (
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Gender"
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' }
              ]}
              value={formData.gender}
              onChange={e => setFormData({ ...formData, gender: e.target.value })}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dob}
              onChange={e => setFormData({ ...formData, dob: e.target.value })}
            />
          </div>
          <Input
            label="Residential Address"
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
          />
        </FormSection>

        {/* Section 2: Employment Hierarchy (Master Data Driven) */}
        <FormSection title="2. Employment & Master Allocation" description="Dynamic Master Department & Designation dropdowns">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Department (From master_departments)"
              required
              options={departments.length > 0 ? departments.map(d => ({ value: d.name, label: d.name })) : [{ value: 'Information Technology', label: 'Information Technology' }]}
              value={formData.departmentName}
              onChange={e => setFormData({ ...formData, departmentName: e.target.value })}
            />
            <Select
              label="Designation (From master_designations)"
              required
              options={designations.length > 0 ? designations.map(d => ({ value: d.name, label: d.name })) : [{ value: 'Senior Software Engineer', label: 'Senior Software Engineer' }]}
              value={formData.designation}
              onChange={e => setFormData({ ...formData, designation: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Date of Joining"
              type="date"
              required
              value={formData.joiningDate}
              onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
            />
            <Input
              label="Monthly Compensation (Salary)"
              type="number"
              value={formData.salary}
              onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Account Role"
              options={[
                { value: 'employee', label: 'Employee' },
                { value: 'employer', label: 'Employer / HR' },
                { value: 'admin', label: 'System Admin' }
              ]}
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            />
            <Select
              label="Account Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' }
              ]}
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            />
          </div>
        </FormSection>

        {/* Section 3: Contact / Emergency */}
        <FormSection title="3. Emergency Contacts" description="Persisted directly into MySQL employee_profiles">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Emergency Contact Person"
              value={formData.emergencyContact}
              onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
            />
            <Input
              label="Emergency Phone"
              value={formData.emergencyPhone}
              onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
            />
          </div>
        </FormSection>

        {errorMessage && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving to Database...' : isEdit ? 'Update MySQL Record' : '+ Insert into Database'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

