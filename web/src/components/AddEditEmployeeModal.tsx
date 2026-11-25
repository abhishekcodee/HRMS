import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button, FormSection } from './ui';
import { fetchMasterDepartments, fetchMasterDesignations, createMasterDepartment, createMasterDesignation, MasterDepartment, MasterDesignation } from '../services/masterApi';
import { EmployeeDbRecord, fetchNextEmployeeId } from '../services/employeeApi';
import { Upload, FileText, RefreshCw } from 'lucide-react';

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

  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptName, setCustomDeptName] = useState('');
  const [isCustomDesig, setIsCustomDesig] = useState(false);
  const [customDesigName, setCustomDesigName] = useState('');

  const [formData, setFormData] = useState<any>({
    fullName: employee?.fullName || '',
    employeeId: employee?.employeeId || 'AMPL-00001',
    email: employee?.email || '',
    password: '',
    phone: employee?.phone || '',
    gender: employee?.gender || 'Male',
    dob: employee?.dob || '',
    address: employee?.address || '',
    residentialAddress: employee?.residentialAddress || employee?.address || '',
    residentialCity: employee?.residentialCity || '',
    residentialState: employee?.residentialState || '',
    residentialPincode: employee?.residentialPincode || '',
    permanentAddressSame: employee?.permanentAddressSame === 1 || employee?.permanentAddressSame === true || false,
    permanentAddress: employee?.permanentAddress || '',
    permanentCity: employee?.permanentCity || '',
    permanentState: employee?.permanentState || '',
    permanentPincode: employee?.permanentPincode || '',
    role: employee?.role || 'employee',
    status: employee?.status || 'active',
    departmentName: employee?.departmentName || '',
    designation: employee?.designation || '',
    joiningDate: employee?.joiningDate || new Date().toISOString().split('T')[0],
    experienceYears: employee?.experienceYears !== undefined && employee?.experienceYears !== null ? employee.experienceYears : 0,
    salary: employee?.salary || '',
    emergencyContact: employee?.emergencyContact || '',
    emergencyPhone: employee?.emergencyPhone || ''
  });

  const handleGenerateId = async () => {
    const nextId = await fetchNextEmployeeId();
    setFormData((prev: any) => ({ ...prev, employeeId: nextId }));
  };

  const handleResidentialChange = (field: string, value: string) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      if (updated.permanentAddressSame) {
        if (field === 'residentialAddress') {
          updated.permanentAddress = value;
          updated.address = value;
        } else if (field === 'residentialCity') {
          updated.permanentCity = value;
        } else if (field === 'residentialState') {
          updated.permanentState = value;
        } else if (field === 'residentialPincode') {
          updated.permanentPincode = value;
        }
      } else if (field === 'residentialAddress') {
        updated.address = value;
      }
      return updated;
    });
  };

  const handleSameAddressToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData((prev: any) => {
      if (checked) {
        return {
          ...prev,
          permanentAddressSame: true,
          permanentAddress: prev.residentialAddress,
          permanentCity: prev.residentialCity,
          permanentState: prev.residentialState,
          permanentPincode: prev.residentialPincode,
        };
      } else {
        return {
          ...prev,
          permanentAddressSame: false,
        };
      }
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    if (employee) {
      const isSame = employee.permanentAddressSame === 1 || employee.permanentAddressSame === true;
      const resAddr = employee.residentialAddress || employee.address || '';
      const resCity = employee.residentialCity || '';
      const resState = employee.residentialState || '';
      const resPin = employee.residentialPincode || '';

      setFormData({
        fullName: employee.fullName || '',
        employeeId: employee.employeeId || '',
        email: employee.email || '',
        password: '',
        phone: employee.phone || '',
        gender: employee.gender || 'Male',
        dob: employee.dob || '',
        address: resAddr,
        residentialAddress: resAddr,
        residentialCity: resCity,
        residentialState: resState,
        residentialPincode: resPin,
        permanentAddressSame: isSame,
        permanentAddress: isSame ? resAddr : (employee.permanentAddress || ''),
        permanentCity: isSame ? resCity : (employee.permanentCity || ''),
        permanentState: isSame ? resState : (employee.permanentState || ''),
        permanentPincode: isSame ? resPin : (employee.permanentPincode || ''),
        role: employee.role || 'employee',
        status: employee.status || 'active',
        departmentName: employee.departmentName || '',
        designation: employee.designation || '',
        joiningDate: employee.joiningDate || new Date().toISOString().split('T')[0],
        experienceYears: employee.experienceYears !== undefined && employee.experienceYears !== null ? employee.experienceYears : 0,
        salary: employee.salary || '',
        emergencyContact: employee.emergencyContact || '',
        emergencyPhone: employee.emergencyPhone || ''
      });
    } else {
      handleGenerateId();
    }

    setIsCustomDept(false);
    setCustomDeptName('');
    setIsCustomDesig(false);
    setCustomDesigName('');

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
  }, [isOpen, employee]);

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

    if (!isEdit && formData.password && formData.password.length < 8) {
      setErrorMessage('An initial password must be at least 8 characters, or leave it blank to e-mail a set-password link.');
      return;
    }
    if (formData.salary === '' || formData.salary === null || isNaN(Number(formData.salary)) || Number(formData.salary) <= 0) {
      setErrorMessage('Enter the monthly gross salary.');
      return;
    }

    const expVal = parseFloat(formData.experienceYears);
    if (formData.experienceYears === undefined || formData.experienceYears === null || formData.experienceYears === '' || isNaN(expVal) || expVal < 0) {
      setErrorMessage('Total Experience is required and must be a valid non-negative number (e.g. 0, 3.5, 4, 5).');
      return;
    }

    const finalDept = isCustomDept ? customDeptName.trim() : formData.departmentName;
    const finalDesig = isCustomDesig ? customDesigName.trim() : formData.designation;

    if (!finalDept) {
      setErrorMessage('Department is required. Please select or enter a custom department.');
      return;
    }
    if (!finalDesig) {
      setErrorMessage('Designation is required. Please select or enter a custom designation.');
      return;
    }

    const payload = {
      ...formData,
      departmentName: finalDept,
      designation: finalDesig,
    };

    setLoading(true);
    try {
      if (isCustomDept && customDeptName.trim()) {
        const code = (customDeptName || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15);
        await createMasterDepartment(customDeptName.trim(), code || 'DEPT_CUSTOM');
      }
      if (isCustomDesig && customDesigName.trim()) {
        await createMasterDesignation(customDesigName.trim(), finalDept);
      }

      await onSave(payload);
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
      title={isEdit ? `Edit employee: ${employee?.fullName}` : 'Add employee'}
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {errorMessage && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem' }}>
            {errorMessage}
          </div>
        )}

        {/* Section 1: Personal Information */}
        <FormSection title="1. Personal details" description="Name, login and contact">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Full Name"
              required
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            />
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Employee ID (Unique Key) *
                </label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={handleGenerateId}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-500)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <RefreshCw size={12} /> Auto-Generate
                  </button>
                )}
              </div>
              <Input
                placeholder="e.g. AMPL-00001"
                required
                disabled={isEdit}
                value={formData.employeeId}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
              />
            </div>
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
                label="Initial password (optional)"
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to e-mail a set-password link"
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
          {/* Residential Address Header & Fields */}
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              A. Residential Address
            </div>
            <Input
              label="Residential Address"
              placeholder="House/Flat No., Building, Street, Area"
              value={formData.residentialAddress}
              onChange={e => handleResidentialChange('residentialAddress', e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Residential City"
                placeholder="e.g. Mumbai"
                value={formData.residentialCity}
                onChange={e => handleResidentialChange('residentialCity', e.target.value)}
              />
              <Input
                label="Residential State"
                placeholder="e.g. Maharashtra"
                value={formData.residentialState}
                onChange={e => handleResidentialChange('residentialState', e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Residential Pincode"
                placeholder="e.g. 400001"
                value={formData.residentialPincode}
                onChange={e => handleResidentialChange('residentialPincode', e.target.value)}
              />
              <div />
            </div>
          </div>

          {/* Same Address Checkbox */}
          <div style={{
            margin: '0.5rem 0',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-md, 8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <input
              type="checkbox"
              id="permanentAddressSame"
              checked={Boolean(formData.permanentAddressSame)}
              onChange={handleSameAddressToggle}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#3b82f6',
                cursor: 'pointer'
              }}
            />
            <label
              htmlFor="permanentAddressSame"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              Permanent Address is same as Residential Address
            </label>
          </div>

          {/* Permanent Address Header & Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              B. Permanent Address
            </div>
            <Input
              label="Permanent Address"
              placeholder="House/Flat No., Building, Street, Area"
              disabled={Boolean(formData.permanentAddressSame)}
              value={formData.permanentAddress}
              onChange={e => setFormData({ ...formData, permanentAddress: e.target.value })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Permanent City"
                placeholder="e.g. Mumbai"
                disabled={Boolean(formData.permanentAddressSame)}
                value={formData.permanentCity}
                onChange={e => setFormData({ ...formData, permanentCity: e.target.value })}
              />
              <Input
                label="Permanent State"
                placeholder="e.g. Maharashtra"
                disabled={Boolean(formData.permanentAddressSame)}
                value={formData.permanentState}
                onChange={e => setFormData({ ...formData, permanentState: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Permanent Pincode"
                placeholder="e.g. 400001"
                disabled={Boolean(formData.permanentAddressSame)}
                value={formData.permanentPincode}
                onChange={e => setFormData({ ...formData, permanentPincode: e.target.value })}
              />
              <div />
            </div>
          </div>
        </FormSection>

        {/* Section 2: Employment Hierarchy (Master Data Driven) */}
        <FormSection title="2. Employment & Master Allocation" description="Dynamic Master Department & Designation dropdowns">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Department *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDept(!isCustomDept);
                    if (!isCustomDept) setCustomDeptName('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isCustomDept ? '← Select List' : '+ Add Custom'}
                </button>
              </div>
              {!isCustomDept ? (
                <Select
                  options={[
                    ...(departments.length > 0 ? departments.map(d => ({ value: d.name, label: d.name })) : [{ value: 'Information Technology', label: 'Information Technology' }]),
                    { value: '__CUSTOM__', label: '+ Add Custom Department...' }
                  ]}
                  value={formData.departmentName}
                  onChange={e => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomDept(true);
                      setCustomDeptName('');
                    } else {
                      setFormData({ ...formData, departmentName: e.target.value });
                    }
                  }}
                />
              ) : (
                <Input
                  placeholder="Enter New Custom Department Name"
                  required
                  value={customDeptName}
                  onChange={e => setCustomDeptName(e.target.value)}
                />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Designation *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDesig(!isCustomDesig);
                    if (!isCustomDesig) setCustomDesigName('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isCustomDesig ? '← Select List' : '+ Add Custom'}
                </button>
              </div>
              {!isCustomDesig ? (
                <Select
                  options={[
                    ...(designations.length > 0 ? designations.map(d => ({ value: d.name, label: d.name })) : [{ value: 'Senior Software Engineer', label: 'Senior Software Engineer' }]),
                    { value: '__CUSTOM__', label: '+ Add Custom Designation...' }
                  ]}
                  value={formData.designation}
                  onChange={e => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomDesig(true);
                      setCustomDesigName('');
                    } else {
                      setFormData({ ...formData, designation: e.target.value });
                    }
                  }}
                />
              ) : (
                <Input
                  placeholder="Enter New Custom Designation Name"
                  required
                  value={customDesigName}
                  onChange={e => setCustomDesigName(e.target.value)}
                />
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Date of Joining"
              type="date"
              required
              value={formData.joiningDate}
              onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
            />
            <div>
              <Input
                label="Total Experience (Years) *"
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 0, 3.5, 4, 5"
                required
                value={formData.experienceYears}
                onChange={e => setFormData({ ...formData, experienceYears: e.target.value })}
              />
              {(() => {
                const exp = parseFloat(formData.experienceYears);
                const probMonths = !isNaN(exp) && exp >= 4 ? 6 : 8;
                return (
                  <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: !isNaN(exp) && exp >= 4 ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Auto Probation:</span> {probMonths} Months ({!isNaN(exp) && exp >= 4 ? 'Experience ≥ 4 Yrs' : 'Experience < 4 Yrs'})
                  </div>
                );
              })()}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <Input
              label="Monthly Compensation (Gross Salary)"
              type="number"
              value={formData.salary}
              onChange={e => setFormData({ ...formData, salary: e.target.value === '' ? '' : parseFloat(e.target.value) })}
            />
            <Select
              label="Account Role"
              options={[
                { value: 'employee', label: 'Employee' },
                { value: 'employer', label: 'Employer / HR' }
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
        <FormSection title="3. Emergency Contacts" description="Who to call in an emergency">
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
            {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Add employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

