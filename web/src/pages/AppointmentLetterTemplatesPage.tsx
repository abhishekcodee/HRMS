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
  FileText,
  Plus,
  Copy,
  Archive,
  Star,
  Clock,
  Building,
  Edit3,
  Trash2,
  CheckCircle2,
  Settings,
  Layers,
} from 'lucide-react';

export interface TemplateRecord {
  id: string;
  companyId: string;
  name: string;
  letterType: string;
  subjectLine?: string;
  versionNumber: number;
  isDefault: boolean;
  isArchived: boolean;
  updatedAt: string;
}

export const AppointmentLetterTemplatesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null);
  const [form, setForm] = useState({
    name: 'Executive Appointment Letter Template',
    letterType: 'appointment',
    subjectLine: 'Offer of Appointment',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const compRes = await fetch('/api/v1/companies', { headers: getAuthHeaders() });
      const compJson = await compRes.json();
      if (compJson.success && compJson.data?.length > 0) {
        setCompanies(compJson.data);
        const compId = compJson.data[0].id;
        setSelectedCompanyId(compId);
        loadTemplatesForCompany(compId);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplatesForCompany = async (compId: string) => {
    try {
      const res = await fetch(`/api/v1/appointment-letters/templates?company_id=${compId}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && json.data) {
        setTemplates(json.data);
      } else {
        // Fallback default templates for demonstration
        setTemplates([
          {
            id: 't-1',
            companyId: compId,
            name: 'Standard Manufacturing Staff Appointment Letter',
            letterType: 'appointment',
            subjectLine: 'Letter of Appointment',
            versionNumber: 2,
            isDefault: true,
            isArchived: false,
            updatedAt: new Date().toISOString(),
          },
          {
            id: 't-2',
            companyId: compId,
            name: 'Shopfloor Operator Appointment Letter (ESIC Eligible)',
            letterType: 'appointment',
            subjectLine: 'Appointment Order',
            versionNumber: 1,
            isDefault: false,
            isArchived: false,
            updatedAt: new Date().toISOString(),
          },
          {
            id: 't-3',
            companyId: compId,
            name: 'Executive Confirmation Letter Template',
            letterType: 'confirmation',
            subjectLine: 'Confirmation of Employment Services',
            versionNumber: 1,
            isDefault: true,
            isArchived: false,
            updatedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleCreateNewTemplate = () => {
    setEditingTemplate(null);
    setForm({
      name: 'New Custom Template',
      letterType: 'appointment',
      subjectLine: 'Letter of Appointment',
    });
    setModalOpen(true);
  };

  const handleDuplicate = (tpl: TemplateRecord) => {
    const newTpl: TemplateRecord = {
      ...tpl,
      id: `t-${Date.now()}`,
      name: `${tpl.name} (Copy)`,
      isDefault: false,
      versionNumber: 1,
      updatedAt: new Date().toISOString(),
    };
    setTemplates([newTpl, ...templates]);
    setSuccessToast(`Template "${tpl.name}" duplicated successfully!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleSetDefault = (id: string) => {
    setTemplates(
      templates.map((t) => ({
        ...t,
        isDefault: t.id === id,
      }))
    );
    setSuccessToast('Default template updated successfully!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      setTemplates(templates.map((t) => (t.id === editingTemplate.id ? { ...t, ...form } : t)));
    } else {
      const newTpl: TemplateRecord = {
        id: `t-${Date.now()}`,
        companyId: selectedCompanyId,
        name: form.name,
        letterType: form.letterType,
        subjectLine: form.subjectLine,
        versionNumber: 1,
        isDefault: false,
        isArchived: false,
        updatedAt: new Date().toISOString(),
      };
      setTemplates([newTpl, ...templates]);
    }
    setModalOpen(false);
    setSuccessToast('Template saved successfully!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileText size={26} style={{ color: 'var(--primary-500)' }} /> Appointment & Offer Letter Templates Library
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            Manage versioned letter templates, default rules, and clauses across multi-entity corporate profiles
          </p>
        </div>

        <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreateNewTemplate}>
          + Create New Template
        </Button>
      </div>

      {successToast && <Alert variant="success" title="Success">{successToast}</Alert>}
      {errorToast && <Alert variant="error" title="Error">{errorToast}</Alert>}

      {/* Filter Header */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <select
          className="select"
          style={{ minWidth: '300px' }}
          value={selectedCompanyId}
          onChange={(e) => {
            setSelectedCompanyId(e.target.value);
            loadTemplatesForCompany(e.target.value);
          }}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              🏢 {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Template Library ({templates.length})</CardTitle>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>Template Name</Th>
                  <Th>Letter Type</Th>
                  <Th>Version</Th>
                  <Th>Status / Default</Th>
                  <Th>Last Updated</Th>
                  <Th style={{ textAlign: 'right' }}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Loading template library...
                    </Td>
                  </Tr>
                ) : (
                  templates.map((tpl) => (
                    <Tr key={tpl.id}>
                      <Td>
                        <strong style={{ color: 'var(--text-primary)' }}>{tpl.name}</strong>
                        {tpl.subjectLine && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subject: {tpl.subjectLine}</div>}
                      </Td>
                      <Td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{tpl.letterType}</Td>
                      <Td>
                        <Badge variant="info">v{tpl.versionNumber}.0</Badge>
                      </Td>
                      <Td>
                        {tpl.isDefault ? (
                          <Badge variant="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Star size={11} /> Default
                          </Badge>
                        ) : (
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => handleSetDefault(tpl.id)}
                            style={{ fontSize: '0.75rem' }}
                          >
                            Set as Default
                          </button>
                        )}
                      </Td>
                      <Td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(tpl.updatedAt).toLocaleDateString('en-GB')}
                      </Td>
                      <Td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <Button variant="outline" size="sm" icon={<Copy size={13} />} onClick={() => handleDuplicate(tpl)}>
                            Duplicate
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      {/* Add / Edit Template Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Template Setup">
        <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Template Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div>
            <label className="form-label">Letter Type</label>
            <select
              className="select"
              value={form.letterType}
              onChange={(e) => setForm({ ...form, letterType: e.target.value })}
            >
              <option value="appointment">Appointment Letter</option>
              <option value="offer">Offer Letter</option>
              <option value="confirmation">Confirmation Letter</option>
              <option value="increment">Salary Increment Letter</option>
              <option value="warning">Warning / Show Cause Letter</option>
              <option value="relieving">Relieving Letter</option>
              <option value="experience">Experience Certificate</option>
            </select>
          </div>

          <Input
            label="Subject Line"
            value={form.subjectLine}
            onChange={(e) => setForm({ ...form, subjectLine: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AppointmentLetterTemplatesPage;
