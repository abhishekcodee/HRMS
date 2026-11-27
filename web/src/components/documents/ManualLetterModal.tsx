import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Alert,
} from '../ui';
import {
  FileText,
  Upload,
  Printer,
  CheckCircle2,
  FilePlus,
  AlertCircle,
  Hash,
  Building,
} from 'lucide-react';
import { AppointmentLetterPreview } from './AppointmentLetterPreview';

interface ManualLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess?: () => void;
}

export const ManualLetterModal: React.FC<ManualLetterModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'manual_editor' | 'upload_pdf'>('manual_editor');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Manual Mode State
  const [manualTitle, setManualTitle] = useState('CUSTOM APPOINTMENT / OFFER LETTER');
  const [manualRefNumber, setManualRefNumber] = useState('AM/HR/APPT/2026-27/MAN-001');
  const [overrideReason, setOverrideReason] = useState('Manual letter creation requested by HR Director');
  const [manualContent, setManualContent] = useState(
    'This is a custom appointment letter issued manually with company letterhead applied.'
  );

  // Upload PDF Mode State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRefNumber, setUploadRefNumber] = useState('AM/HR/APPT/2024-25/OLD-042');
  const [uploadIssueDate, setUploadIssueDate] = useState('2024-04-01');
  const [uploadRemarks, setUploadRemarks] = useState('Scanned physical signed appointment letter archived into profile.');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    try {
      const res = await fetch('/api/v1/companies', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        setCompanies(json.data);
        setSelectedCompanyId(json.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load companies for manual modal:', err);
    }
  };

  const handleSaveManualLetter = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/appointment-letters/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          employee_id: employeeId,
          company_id: selectedCompanyId,
          source: 'manual',
          override_reason: overrideReason,
          letter_data: {
            letterTitle: manualTitle,
            referenceNumber: manualRefNumber,
            openingTemplate: manualContent,
            termsAndConditions: [],
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('Manual letter saved successfully to employee profile!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert('Error saving manual letter: ' + (json.error?.message || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadSignedPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a PDF file to upload.');
      return;
    }

    setSubmitting(true);
    try {
      // Upload the scanned letter itself, filed under this employee
      const form = new FormData();
      form.append('title', `Signed Appointment Letter (${uploadRefNumber})`);
      form.append('category', 'Appointment Letter');
      form.append('employeeId', employeeId);
      form.append('file', uploadFile);
      const { 'Content-Type': _json, ...authOnly } = getAuthHeaders() as Record<string, string>;
      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: authOnly, // the browser sets the multipart boundary itself
        body: form,
      });

      const json = await res.json();
      if (json.success) {
        alert('Signed paper appointment letter uploaded and archived into employee profile successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert('Error uploading signed letter: ' + (json.error?.message || 'Failed'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Letter Creation & Signed Paper Document Archival"
      maxWidth="1000px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <button
            className={`btn btn-sm ${mode === 'manual_editor' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('manual_editor')}
          >
            <FilePlus size={16} /> Create Manually (Blank Letterhead)
          </button>
          <button
            className={`btn btn-sm ${mode === 'upload_pdf' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('upload_pdf')}
          >
            <Upload size={16} /> Upload Signed Paper PDF
          </button>
        </div>

        {/* Company Switcher */}
        <div>
          <label className="form-label">Corporate Entity</label>
          <select
            className="select"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                🏢 {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {/* MODE A: MANUAL EDITOR */}
        {mode === 'manual_editor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Input
                label="Document Title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
              />
              <Input
                label="Manual Reference Number"
                value={manualRefNumber}
                onChange={(e) => setManualRefNumber(e.target.value)}
              />
            </div>

            <Input
              label="Override Audit Reason (Required for Manual Reference Numbering)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              required
            />

            <div>
              <label className="form-label">Letter Body Content</label>
              <textarea
                className="textarea"
                rows={8}
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="Type or paste full custom appointment letter body text..."
              />
            </div>

            <Alert variant="info" title="Manual Mode Note">
              Manual reference numbers do NOT advance the automatic sequence counter for standard generated letters.
            </Alert>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<CheckCircle2 size={16} />}
                onClick={handleSaveManualLetter}
                isLoading={submitting}
              >
                Save Custom Letter to Profile
              </Button>
            </div>
          </div>
        )}

        {/* MODE B: UPLOAD SIGNED PDF */}
        {mode === 'upload_pdf' && (
          <form onSubmit={handleUploadSignedPdf} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Input
                label="Reference Number on Physical Document"
                value={uploadRefNumber}
                onChange={(e) => setUploadRefNumber(e.target.value)}
                required
              />
              <Input
                label="Original Issue Date"
                type="date"
                value={uploadIssueDate}
                onChange={(e) => setUploadIssueDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Select Scanned Signed PDF File</label>
              <input
                type="file"
                className="input"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <Input
              label="Archival Remarks & Notes"
              value={uploadRemarks}
              onChange={(e) => setUploadRemarks(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" icon={<Upload size={16} />} isLoading={submitting}>
                Upload & Archive Document
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default ManualLetterModal;
