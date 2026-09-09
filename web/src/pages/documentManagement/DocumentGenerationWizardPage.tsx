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
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const DocumentGenerationWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  
  // Wizard Steps
  const [step, setStep] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [salaryData, setSalaryData] = useState({
    monthlySalary: 75000,
    annualCtc: 900000,
    basicSalary: 37500,
  });

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [empRes, typeRes] = await Promise.all([
        fetch('/api/v1/employees', { headers: getAuthHeaders() }),
        fetch('/api/v1/document-management/types', { headers: getAuthHeaders() }),
      ]);
      const empJson = await empRes.json();
      const typeJson = await typeRes.json();

      if (empJson.success && Array.isArray(empJson.data)) {
        setEmployees(empJson.data);
        if (empJson.data.length > 0) setSelectedEmployeeId(empJson.data[0].id || empJson.data[0].userId);
      }
      if (typeJson.success && Array.isArray(typeJson.data)) {
        setDocTypes(typeJson.data);
        if (typeJson.data.length > 0) setSelectedTypeId(typeJson.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch wizard data:', err);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/v1/document-management/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          documentTypeId: selectedTypeId,
          customTitle: customTitle || undefined,
          salaryData,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setResult(json);
        setStep(3);
      }
    } catch (err) {
      console.error('Document generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/document-management')}
          icon={<ArrowLeft style={{ width: '16px', height: '16px' }} />}
        >
          Back to Dashboard
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
          Document Generation Studio & Workflow Wizard
        </h1>
      </div>

      {/* Progress Tracker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= 1 ? '#3B82F6' : '#CBD5E1', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</div>
          <span style={{ fontWeight: 600, color: step >= 1 ? '#0F172A' : '#64748B' }}>Target Selection</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= 2 ? '#3B82F6' : '#CBD5E1', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</div>
          <span style={{ fontWeight: 600, color: step >= 2 ? '#0F172A' : '#64748B' }}>Variables & Details</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= 3 ? '#10B981' : '#CBD5E1', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</div>
          <span style={{ fontWeight: 600, color: step >= 3 ? '#059669' : '#64748B' }}>Generated & Sealed</span>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Step 1: Select Target Employee & Document Type</CardTitle></CardHeader>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Select Target Employee</label>
              <Select
                options={employees.map((e) => ({
                  value: e.id || e.userId,
                  label: `${e.fullName || e.name} (${e.employeeId || 'EMP'}) - ${e.designation || 'Staff'}`,
                }))}
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Document Type</label>
              <Select
                options={docTypes.map((dt) => ({
                  value: dt.id,
                  label: `${dt.name} (${dt.categoryName || 'General'})`,
                }))}
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Custom Document Title (Optional)</label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Leave blank to use default title pattern..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Button variant="primary" onClick={() => setStep(2)}>
                Next: Review Variables →
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Step 2: Review Dynamic Variable Data & Salary Components</CardTitle></CardHeader>
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Monthly Salary (₹)</label>
                <Input
                  type="number"
                  value={salaryData.monthlySalary}
                  onChange={(e) => setSalaryData({ ...salaryData, monthlySalary: Number(e.target.value) })}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Annual CTC (₹)</label>
                <Input
                  type="number"
                  value={salaryData.annualCtc}
                  onChange={(e) => setSalaryData({ ...salaryData, annualCtc: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1E293B' }}>Server-side Variable Whitelist Verification</h4>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                All employee attributes, company information, and salary numbers will be interpolated into the template snapshot securely.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
              <Button variant="primary" onClick={handleGenerate} disabled={generating} icon={<Sparkles style={{ width: '16px', height: '16px' }} />}>
                {generating ? 'Generating & Hashing PDF...' : 'Generate Official Document'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 3 && result && (
        <Card style={{ border: '2px solid #10B981', background: '#F0FDF4' }}>
          <CardBody style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <ShieldCheck style={{ width: '36px', height: '36px' }} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#065F46', margin: 0 }}>
              Document Generated & Cryptographically Sealed!
            </h2>
            <p style={{ color: '#047857', marginTop: '8px', fontSize: '15px' }}>
              Reference Number: <strong>{result.referenceNumber}</strong> | Status: <Badge variant="success">{result.status}</Badge>
            </p>

            <div style={{ background: '#FFFFFF', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '16px', margin: '24px auto', maxWidth: '600px', textAlign: 'left' }}>
              <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginBottom: '4px' }}>SHA-256 Cryptographic Document Hash:</div>
              <code style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', color: '#065F46' }}>{result.documentHash}</code>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <Button variant="secondary" onClick={() => window.open(`/api/v1/document-management/${result.documentId}/download`, '_blank')}>
                Preview & Print PDF
              </Button>
              <Button variant="primary" onClick={() => navigate('/document-management')} style={{ background: '#059669' }}>
                Return to Document Dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default DocumentGenerationWizardPage;
