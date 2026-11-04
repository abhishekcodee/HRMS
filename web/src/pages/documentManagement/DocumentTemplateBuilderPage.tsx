import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Select,
  Input,
  Badge,
} from '../../components/ui';
import {
  Save,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const AVAILABLE_VARIABLES = [
  { tag: '{{employee_name}}', label: 'Employee Name' },
  { tag: '{{employee_code}}', label: 'Employee Code' },
  { tag: '{{designation}}', label: 'Designation' },
  { tag: '{{department}}', label: 'Department' },
  { tag: '{{joining_date}}', label: 'Joining Date' },
  { tag: '{{work_location}}', label: 'Work Location' },
  { tag: '{{monthly_salary}}', label: 'Monthly Salary' },
  { tag: '{{annual_ctc}}', label: 'Annual CTC' },
  { tag: '{{company_name}}', label: 'Company Name' },
  { tag: '{{company_logo}}', label: 'Company Logo' },
  { tag: '{{document_date}}', label: 'Document Date' },
  { tag: '{{document_number}}', label: 'Reference Number' },
  { tag: '{{hr_name}}', label: 'Signatory Name' },
  { tag: '{{hr_designation}}', label: 'Signatory Designation' },
];

export const DocumentTemplateBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Editor State
  const [templateName, setTemplateName] = useState('Corporate Standard Template');
  const [templateContent, setTemplateContent] = useState(
    `<h1 style="text-align: center; color: #1E3A5F;">OFFICIAL DOCUMENT</h1>\n<p>Date: {{document_date}}<br>Ref: {{document_number}}</p>\n<p>To,<br><strong>{{employee_name}}</strong><br>Code: {{employee_code}}<br>Designation: {{designation}}</p>\n<p>Dear {{employee_name}},</p>\n<p>We are pleased to issue this official corporate document on behalf of <strong>{{company_name}}</strong>.</p>\n<p>Your joining date is <strong>{{joining_date}}</strong> and your assigned work location is {{work_location}}.</p>\n<br><br>\n<div style="display: flex; justify: space-between;">\n  <div>Authorized Signatory:<br><strong>{{hr_name}}</strong><br>{{hr_designation}}</div>\n</div>`
  );
  const [signatoryName, setSignatoryName] = useState('Rajesh Sharma');
  const [signatoryDesignation, setSignatoryDesignation] = useState('Head of HR');
  const [numberingFormat, setNumberingFormat] = useState('{COMPANY}/HR/{FY}/{SEQ:0000}');
  const [changeSummary, setChangeSummary] = useState('Updated template clauses and layout.');
  
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentVersion, setCurrentVersion] = useState(1);

  useEffect(() => {
    fetchDocTypes();
  }, []);

  const fetchDocTypes = async () => {
    try {
      const res = await fetch('/api/v1/document-management/types', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDocTypes(json.data);
        if (json.data.length > 0) {
          setSelectedTypeId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch doc types:', err);
    }
  };

  const insertVariable = (tag: string) => {
    setTemplateContent((prev) => prev + ' ' + tag);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/v1/document-management/templates', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: selectedTemplateId || undefined,
          documentTypeId: selectedTypeId,
          name: templateName,
          content: templateContent,
          signatoryName,
          signatoryDesignation,
          numberingFormat,
          changeSummary,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: json.message });
        setCurrentVersion(json.versionNumber || currentVersion + 1);
        if (json.templateId) setSelectedTemplateId(json.templateId);
      } else {
        setMsg({ type: 'error', text: json.error?.message || 'Failed to save template.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/document-management')}
            icon={<ArrowLeft style={{ width: '16px', height: '16px' }} />}
          >
            Back
          </Button>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
            WYSIWYG Document Template Builder & Version Studio
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            icon={<Save style={{ width: '16px', height: '16px' }} />}
          >
            {saving ? 'Saving Version...' : `Save Version ${currentVersion + 1}`}
          </Button>
        </div>
      </div>

      {msg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: msg.type === 'success' ? '#D1FAE5' : '#FEE2E2',
            color: msg.type === 'success' ? '#065F46' : '#991B1B',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle style={{ width: '18px', height: '18px' }} />
          {msg.text}
        </div>
      )}

      {/* Main Grid */}
      <div className="template-builder-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* Controls Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card>
            <CardHeader><CardTitle style={{ fontSize: '15px' }}>Template Configuration</CardTitle></CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Target Document Type
                </label>
                <Select
                  options={docTypes.map((dt) => ({ value: dt.id, label: `${dt.name} (${dt.categoryName || 'General'})` }))}
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Template Name
                </label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Numbering Pattern
                </label>
                <Input value={numberingFormat} onChange={(e) => setNumberingFormat(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Authorized Signatory Name
                </label>
                <Input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Signatory Designation
                </label>
                <Input value={signatoryDesignation} onChange={(e) => setSignatoryDesignation(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Version Change Summary
                </label>
                <Input value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} />
              </div>
            </CardBody>
          </Card>

          {/* Dynamic Variables Picker */}
          <Card>
            <CardHeader><CardTitle style={{ fontSize: '15px' }}>Whitelisted Dynamic Variables</CardTitle></CardHeader>
            <CardBody>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: 0 }}>Click any variable tag to insert into template:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    onClick={() => insertVariable(v.tag)}
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      color: '#1E293B',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    + {v.tag}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Live HTML Editor & Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ height: '100%' }}>
            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle style={{ fontSize: '15px' }}>HTML Template Editor & Content Canvas</CardTitle>
              <Badge variant="info">Version {currentVersion}</Badge>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                style={{
                  width: '100%',
                  height: '320px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '13px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#0F172A',
                  color: '#F8FAFC',
                  lineHeight: '1.5',
                }}
              />

              {/* Real-time Preview Pane */}
              <div style={{ marginTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                  Live Corporate Preview Pane
                </h4>
                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '32px',
                    background: '#FFFFFF',
                    minHeight: '260px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  }}
                  dangerouslySetInnerHTML={{ __html: templateContent }}
                />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentTemplateBuilderPage;
