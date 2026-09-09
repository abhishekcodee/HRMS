import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Button,
  Input,
  Badge,
  Modal,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Alert,
} from '../components/ui';
import {
  Building,
  ShieldCheck,
  Hash,
  Plus,
  Edit3,
  Save,
  Trash2,
  CheckCircle2,
  Settings,
  Sliders,
} from 'lucide-react';

export interface CompanyRecord {
  id: string;
  code: string;
  name: string;
  legalSuffix?: string;
  registeredAddress?: string;
  worksAddress?: string;
  cin?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoPath?: string;
  signaturePath?: string;
  letterheadTopMarginMm: number;
  letterheadBottomMarginMm: number;
}

export const AppointmentLetterSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'companies' | 'statutory' | 'numbering'>('companies');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Companies State
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRecord | null>(null);
  const [companyForm, setCompanyForm] = useState<Partial<CompanyRecord>>({
    code: '',
    name: '',
    legalSuffix: 'Pvt. Ltd.',
    registeredAddress: '',
    worksAddress: '',
    cin: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    website: '',
    logoPath: '',
    signaturePath: '',
    letterheadTopMarginMm: 20,
    letterheadBottomMarginMm: 20,
  });

  // Statutory Rates State
  const [statutoryRates, setStatutoryRates] = useState({
    PF_EMPLOYEE_PERCENT: '12.0',
    PF_EMPLOYER_PERCENT: '12.0',
    PF_WAGE_CEILING: '15000',
    ESIC_EMPLOYEE_PERCENT: '0.75',
    ESIC_EMPLOYER_PERCENT: '3.25',
    ESIC_WAGE_CEILING: '21000',
    GRATUITY_PERCENT: '4.81',
  });

  // Reference Numbering State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [numberingFormats, setNumberingFormats] = useState<any[]>([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [compRes, statRes] = await Promise.all([
        fetch('/api/v1/companies', { headers: getAuthHeaders() }),
        fetch('/api/v1/statutory-settings', { headers: getAuthHeaders() }),
      ]);

      const compJson = await compRes.json();
      const statJson = await statRes.json();

      if (compJson.success && compJson.data) {
        setCompanies(compJson.data);
        if (compJson.data.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(compJson.data[0].id);
          loadNumberingFormats(compJson.data[0].id);
        }
      }

      if (statJson.success && statJson.data) {
        const s = statJson.data;
        setStatutoryRates({
          PF_EMPLOYEE_PERCENT: s.PF_EMPLOYEE_PERCENT?.value || '12.0',
          PF_EMPLOYER_PERCENT: s.PF_EMPLOYER_PERCENT?.value || '12.0',
          PF_WAGE_CEILING: s.PF_WAGE_CEILING?.value || '15000',
          ESIC_EMPLOYEE_PERCENT: s.ESIC_EMPLOYEE_PERCENT?.value || '0.75',
          ESIC_EMPLOYER_PERCENT: s.ESIC_EMPLOYER_PERCENT?.value || '3.25',
          ESIC_WAGE_CEILING: s.ESIC_WAGE_CEILING?.value || '21000',
          GRATUITY_PERCENT: s.GRATUITY_PERCENT?.value || '4.81',
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNumberingFormats = async (compExpId: string) => {
    try {
      const res = await fetch(`/api/v1/letter-numbering/company/${compExpId}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setNumberingFormats(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load numbering formats:', err);
    }
  };

  const handleOpenCompanyModal = (company?: CompanyRecord) => {
    if (company) {
      setEditingCompany(company);
      setCompanyForm(company);
    } else {
      setEditingCompany(null);
      setCompanyForm({
        code: '',
        name: '',
        legalSuffix: 'Pvt. Ltd.',
        registeredAddress: '',
        worksAddress: '',
        cin: '',
        gstin: '',
        pan: '',
        phone: '',
        email: '',
        website: '',
        logoPath: '',
        signaturePath: '',
        letterheadTopMarginMm: 20,
        letterheadBottomMarginMm: 20,
      });
    }
    setCompanyModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = Boolean(editingCompany);
      const url = isEdit ? `/api/v1/companies/${editingCompany?.id}` : '/api/v1/companies';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(companyForm),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessToast(isEdit ? 'Company updated successfully!' : 'New company created successfully!');
        setCompanyModalOpen(false);
        setTimeout(() => setSuccessToast(null), 4000);
        await loadAllData();
      } else {
        setErrorToast(json.error?.message || 'Failed to save company.');
        setTimeout(() => setErrorToast(null), 4000);
      }
    } catch (err: any) {
      setErrorToast('Error saving company: ' + err.message);
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStatutoryRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/statutory-settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ settings: statutoryRates }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessToast('Statutory rates updated successfully! All salary annexures will now reflect these rates.');
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        setErrorToast(json.error?.message || 'Failed to update statutory rates.');
        setTimeout(() => setErrorToast(null), 4000);
      }
    } catch (err: any) {
      setErrorToast('Error saving statutory rates: ' + err.message);
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Settings size={26} style={{ color: 'var(--primary-500)' }} /> Appointment Letter Settings & Multi-Company Configuration
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            Manage multi-entity legal details, letterhead margins, statutory PF/ESIC rates, and reference numbering formats
          </p>
        </div>
      </div>

      {successToast && <Alert variant="success" title="Settings Saved">{successToast}</Alert>}
      {errorToast && <Alert variant="error" title="Error">{errorToast}</Alert>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn btn-sm ${activeTab === 'companies' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('companies')}
        >
          <Building size={16} /> Multi-Company Setup ({companies.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'statutory' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('statutory')}
        >
          <ShieldCheck size={16} /> Statutory Rates & Wage Ceilings
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'numbering' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('numbering')}
        >
          <Hash size={16} /> Reference Numbering Pattern
        </button>
      </div>

      {/* 1. Multi-Company Setup Tab */}
      {activeTab === 'companies' && (
        <Card>
          <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <CardTitle>Registered Companies & Letterhead Profiles</CardTitle>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Configure multiple corporate entities with distinct letterheads, addresses, CIN, GSTIN, and logos
              </p>
            </div>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => handleOpenCompanyModal()}>
              + Add Company Entity
            </Button>
          </CardHeader>

          <CardBody>
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Company Code</Th>
                    <Th>Legal Entity Name</Th>
                    <Th>Works / Registered Address</Th>
                    <Th>CIN / GSTIN</Th>
                    <Th>Letterhead Margins</Th>
                    <Th style={{ textAlign: 'right' }}>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {loading ? (
                    <Tr>
                      <Td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        Loading companies...
                      </Td>
                    </Tr>
                  ) : companies.length === 0 ? (
                    <Tr>
                      <Td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No companies configured yet. Click "+ Add Company Entity" to get started.
                      </Td>
                    </Tr>
                  ) : (
                    companies.map((comp) => (
                      <Tr key={comp.id}>
                        <Td>
                          <Badge variant="info" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                            {comp.code}
                          </Badge>
                        </Td>
                        <Td>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{comp.name}</strong> {comp.legalSuffix}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comp.email} • {comp.phone}</div>
                          </div>
                        </Td>
                        <Td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
                          {comp.worksAddress || comp.registeredAddress || '—'}
                        </Td>
                        <Td style={{ fontSize: '0.775rem', fontFamily: 'monospace' }}>
                          <div>CIN: {comp.cin || '—'}</div>
                          <div>GSTIN: {comp.gstin || '—'}</div>
                        </Td>
                        <Td style={{ fontSize: '0.8rem' }}>
                          Top: {comp.letterheadTopMarginMm}mm | Bottom: {comp.letterheadBottomMarginMm}mm
                        </Td>
                        <Td style={{ textAlign: 'right' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Edit3 size={14} />}
                            onClick={() => handleOpenCompanyModal(comp)}
                          >
                            Edit
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
      )}

      {/* 2. Statutory Rates & Wage Ceilings Tab */}
      {activeTab === 'statutory' && (
        <Card>
          <CardHeader>
            <CardTitle>Statutory Rates & Statutory Wage Ceilings (India 2026-27)</CardTitle>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              All salary annexures, PF/ESIC deductions, and CTC subtotal rows compute automatically from these rates
            </p>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSaveStatutoryRates} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <Input
                  label="Employee PF Contribution (%)"
                  type="number"
                  step="0.01"
                  value={statutoryRates.PF_EMPLOYEE_PERCENT}
                  onChange={(e) => setStatutoryRates({ ...statutoryRates, PF_EMPLOYEE_PERCENT: e.target.value })}
                />
                <Input
                  label="Employer PF Contribution (%)"
                  type="number"
                  step="0.01"
                  value={statutoryRates.PF_EMPLOYER_PERCENT}
                  onChange={(e) => setStatutoryRates({ ...statutoryRates, PF_EMPLOYER_PERCENT: e.target.value })}
                />
                <Input
                  label="Statutory PF Wage Ceiling (₹)"
                  type="number"
                  value={statutoryRates.PF_WAGE_CEILING}
                  onChange={(e) => setStatutoryRates({ ...statutoryRates, PF_WAGE_CEILING: e.target.value })}
                />

                <Input
                  label="Employee ESIC Contribution (%)"
                  type="number"
                  step="0.01"
                  value={statutoryRates.ESIC_EMPLOYEE_PERCENT}
                  onChange={(e) => setStatutoryRates({ ...statutoryRates, ESIC_EMPLOYEE_PERCENT: e.target.value })}
                />
                <Input
                  label="Employer ESIC Contribution (%)"
                  type="number"
                  step="0.01"
                  value={statutoryRates.ESIC_EMPLOYER_PERCENT}
                  onChange={(e) => setStatutoryRates({ ...statutoryRates, ESIC_EMPLOYER_PERCENT: e.target.value })}
                />
                <Input
                  label="Statutory ESIC Wage Ceiling (₹)"
                  type="number"
                  value={statutoryRates.ESIC_WAGE_CEILING}
                  onChange={(e) => setStatutoryRates({ ...statutoryRates, ESIC_WAGE_CEILING: e.target.value })}
                />

                <Input
                  label="Gratuity Provision (%)"
                  type="number"
                  step="0.01"
                  value={statutoryRates.GRATUITY_PERCENT}
                  onChange={(e) => setStatutoryRates({ ...statutoryRates, GRATUITY_PERCENT: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button variant="primary" icon={<Save size={16} />} type="submit" isLoading={saving}>
                  Save Statutory Rates
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* 3. Reference Numbering Tab */}
      {activeTab === 'numbering' && (
        <Card>
          <CardHeader>
            <CardTitle>Reference Number Format Patterns</CardTitle>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Auto-generate gapless reference numbers per company and letter type e.g. <code>{'{COMPANY_CODE}/HR/APPT/{FY}/{SEQ:0000}'}</code>
            </p>
          </CardHeader>

          <CardBody>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <select
                className="select"
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  loadNumberingFormats(e.target.value);
                }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Letter Type</Th>
                    <Th>Pattern Pattern</Th>
                    <Th>Current Sequence Counter</Th>
                    <Th>Next Sample Reference Number</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {numberingFormats.map((fmt) => (
                    <Tr key={fmt.id}>
                      <Td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{fmt.letterType}</Td>
                      <Td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-500)' }}>{fmt.formatPattern}</Td>
                      <Td>{fmt.currentCounter}</Td>
                      <Td style={{ fontFamily: 'monospace', color: 'var(--success-text)' }}>
                        {fmt.formatPattern.replace('{COMPANY_CODE}', 'AM').replace('{FY}', '2026-27').replace('{SEQ:0000}', String(fmt.currentCounter + 1).padStart(4, '0'))}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      )}

      {/* Add / Edit Company Modal */}
      <Modal
        isOpen={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        title={editingCompany ? 'Edit Company Entity' : 'Add New Company Entity'}
      >
        <form onSubmit={handleSaveCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <Input
              label="Company Code (e.g. AM)"
              value={companyForm.code || ''}
              onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value })}
              required
            />
            <Input
              label="Legal Company Name"
              value={companyForm.name || ''}
              onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              required
            />
          </div>

          <Input
            label="Legal Suffix (e.g. Pvt. Ltd.)"
            value={companyForm.legalSuffix || ''}
            onChange={(e) => setCompanyForm({ ...companyForm, legalSuffix: e.target.value })}
          />

          <Input
            label="Registered Office Address"
            value={companyForm.registeredAddress || ''}
            onChange={(e) => setCompanyForm({ ...companyForm, registeredAddress: e.target.value })}
          />

          <Input
            label="Factory / Works Address (Navi Mumbai Works)"
            value={companyForm.worksAddress || ''}
            onChange={(e) => setCompanyForm({ ...companyForm, worksAddress: e.target.value })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <Input
              label="CIN"
              value={companyForm.cin || ''}
              onChange={(e) => setCompanyForm({ ...companyForm, cin: e.target.value })}
            />
            <Input
              label="GSTIN"
              value={companyForm.gstin || ''}
              onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })}
            />
            <Input
              label="PAN"
              value={companyForm.pan || ''}
              onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <Input
              label="Company Email"
              value={companyForm.email || ''}
              onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
            />
            <Input
              label="Company Phone"
              value={companyForm.phone || ''}
              onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
            />
          </div>

          <Input
            label="Company Logo Image URL"
            value={companyForm.logoPath || ''}
            onChange={(e) => setCompanyForm({ ...companyForm, logoPath: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" type="button" onClick={() => setCompanyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saving}>
              {editingCompany ? 'Update Company' : 'Save Company'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AppointmentLetterSettingsPage;
