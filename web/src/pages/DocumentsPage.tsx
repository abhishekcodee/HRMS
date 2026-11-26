import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Card,
  SearchInput,
  Select,
  Badge,
  Modal,
  Input,
  Alert,
} from '../components/ui';
import {
  FileText,
  Download,
  Upload,
  Trash2,
  HardDrive,
  FolderCheck,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DocumentRecord {
  id: string;
  title: string;
  employeeName: string;
  employeeCode?: string;
  userId?: string;
  category: string;
  fileSize: string;
  uploadedAt: string;
  /** false for old records saved before files were stored on the server */
  hasFile?: boolean;
}

interface EmployeeOption {
  id: string;
  fullName: string;
  employeeId?: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.txt'];

function getAuthHeaders(json = true): Record<string, string> {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  const activeTenantId = localStorage.getItem('hrms_active_tenant_id');
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeTenantId ? { 'x-tenant-id': activeTenantId } : {}),
  };
}

/** Converts "850 KB" / "1.4 MB" to megabytes. */
const sizeInMb = (size?: string) => {
  const n = parseFloat(size || '');
  if (!Number.isFinite(n)) return 0;
  return /kb/i.test(size || '') ? n / 1024 : n;
};

const fileNameFromDisposition = (header: string | null, fallback: string) => {
  const star = header?.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try { return decodeURIComponent(star[1]); } catch { /* fall through */ }
  }
  return header?.match(/filename="([^"]+)"/i)?.[1] || fallback;
};

async function readError(res: Response, fallback: string) {
  try {
    const json = await res.json();
    return json?.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);

  // Modals & States
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentRecord | null>(null);

  // Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Identity Proof');
  const [uploadEmployeeId, setUploadEmployeeId] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [preview, setPreview] = useState<{ docId: string; url?: string; type?: string; error?: string; loading?: boolean } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/documents', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDocuments(json.data);
        if (json.data.length > 0 && !selectedDoc) {
          setSelectedDoc(json.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/v1/employees?status=active', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEmployees(
          json.data
            .map((e: any) => ({ id: e.id, fullName: e.fullName, employeeId: e.employeeId }))
            .sort((a: EmployeeOption, b: EmployeeOption) => String(a.fullName).localeCompare(String(b.fullName)))
        );
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadEmployees();
    const handleTenantChange = () => {
      loadDocuments();
      loadEmployees();
    };
    window.addEventListener('tenant-changed', handleTenantChange);
    return () => window.removeEventListener('tenant-changed', handleTenantChange);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        showToast('error', 'Only PDF, Word, Excel, PNG, JPG and TXT files can be uploaded.');
        e.target.value = '';
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        showToast('error', 'The file is larger than 10 MB.');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
      if (!uploadTitle.trim()) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setUploadTitle(baseName);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadEmployeeId) {
      showToast('error', 'Please choose the employee this document belongs to.');
      return;
    }
    if (!uploadTitle.trim()) {
      showToast('error', 'Please enter a document title.');
      return;
    }
    if (!selectedFile) {
      showToast('error', 'Please choose a file to upload.');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('title', uploadTitle.trim());
      form.append('category', uploadCategory);
      form.append('employeeId', uploadEmployeeId);
      form.append('file', selectedFile);

      // No Content-Type header: the browser sets the multipart boundary itself
      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: getAuthHeaders(false),
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setUploadOpen(false);
        setUploadTitle('');
        setUploadEmployeeId('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        showToast('success', 'Document uploaded.');
        setSelectedDoc(null);
        await loadDocuments();
      } else {
        showToast('error', json.error?.message || 'Failed to upload document.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Upload error.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteConfirmDoc) return;
    const docId = deleteConfirmDoc.id;
    setDeleteConfirmDoc(null);
    try {
      const res = await fetch(`/api/v1/documents/${docId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Document deleted.');
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
        }
        await loadDocuments();
      } else {
        showToast('error', json.error?.message || 'Failed to delete document.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Delete failed.');
    }
  };

  const fetchDocumentFile = async (doc: DocumentRecord, inline: boolean) => {
    const res = await fetch(`/api/v1/documents/${doc.id}/download${inline ? '?inline=1' : ''}`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) throw new Error(await readError(res, 'The file could not be downloaded.'));
    return res;
  };

  const handleDownloadFile = async (doc: DocumentRecord) => {
    try {
      const res = await fetchDocumentFile(doc, false);
      const blob = await res.blob();
      const filename = fileNameFromDisposition(res.headers.get('Content-Disposition'), doc.title);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      showToast('error', err.message || 'Download failed.');
    }
  };

  const defaultCategories = [
    'Appraisal',
    'Legal Agreement',
    'Tax Document',
    'Certification',
    'Technical Spec',
    'PDF Agreement',
    'Identity Proof',
    'Employment Contract',
  ];

  const dbCategories = documents.map((d) => d.category).filter(Boolean);
  const allCategories = Array.from(new Set([...defaultCategories, ...dbCategories]));

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...allCategories.map((c) => ({ value: c, label: c })),
  ];

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      (d.employeeName && d.employeeName.toLowerCase().includes(search.toLowerCase())) ||
      (d.category && d.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter ? d.category === categoryFilter : true;
    return matchesSearch && matchesCat;
  });

  const activeDoc = selectedDoc || (filteredDocs.length > 0 ? filteredDocs[0] : null);

  const totalStorageMB = documents.reduce((acc, doc) => acc + (doc.hasFile === false ? 0 : sizeInMb(doc.fileSize)), 0);
  const employeesCovered = new Set(documents.map((d) => d.userId || d.employeeName)).size;

  // Live preview of the selected document (PDF and images open in the page; other types download)
  const activeDocId = activeDoc?.id;
  const activeHasFile = activeDoc?.hasFile;
  useEffect(() => {
    if (!activeDoc || !activeHasFile) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | undefined;
    setPreview({ docId: activeDoc.id, loading: true });
    fetchDocumentFile(activeDoc, true)
      .then(async (res) => {
        const type = (res.headers.get('Content-Type') || '').split(';')[0];
        if (!/^(application\/pdf|image\/|text\/plain)/.test(type)) {
          if (!cancelled) setPreview({ docId: activeDoc.id, type });
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setPreview({ docId: activeDoc.id, url: objectUrl, type });
      })
      .catch((err) => {
        if (!cancelled) setPreview({ docId: activeDoc.id, error: err.message });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId, activeHasFile]);

  const employeeOptions = [
    { value: '', label: employees.length ? 'Select employee…' : 'Loading employees…' },
    ...employees.map((e) => ({ value: e.id, label: e.employeeId ? `${e.fullName} (${e.employeeId})` : e.fullName })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Document Vault & Compliance Center</h1>
          <p className="page-subtitle">
            Centralized document repository, identity verification, legal contracts, and tax compliance records
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" icon={<Upload size={16} />} onClick={() => setUploadOpen(true)}>
            + Upload Document
          </Button>
        </div>
      </div>

      {toastMsg && (
        <Alert variant={toastMsg.type} title="System Notification">
          {toastMsg.text}
        </Alert>
      )}

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card padding="1rem">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-glow)', color: 'var(--primary-500)' }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Vault Docs</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{documents.length} Records</div>
            </div>
          </div>
        </Card>

        <Card padding="1rem">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
              <HardDrive size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vault Storage</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalStorageMB < 1 && totalStorageMB > 0 ? `${Math.round(totalStorageMB * 1024)} KB` : `${totalStorageMB.toFixed(1)} MB`}</div>
            </div>
          </div>
        </Card>

        <Card padding="1rem">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <FolderCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categories Tracked</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{allCategories.length} Types</div>
            </div>
          </div>
        </Card>

        <Card padding="1rem">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employees Covered</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{employeesCovered}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Split Screen Master-Detail Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: All Documents List Side Panel with Dedicated Scroll Bar */}
        <Card padding="1rem" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              All Documents ({filteredDocs.length})
            </div>

          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <SearchInput
              placeholder="Search by title, employee, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
            <Select
              options={categoryOptions}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>

          {/* Dedicated Scrollable Container for All Documents */}
          <div
            style={{
              maxHeight: 'calc(100vh - 380px)',
              minHeight: '400px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              paddingRight: '0.35rem',
            }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Loading compliance documents...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No matching documents found.
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = activeDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'var(--bg-surface-active)' : 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderLeft: isSelected ? '4px solid var(--primary-500)' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        📄 {doc.title}
                      </div>
                      <Badge variant="info" style={{ flexShrink: 0, fontSize: '0.7rem' }}>
                        {doc.category || 'General'}
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={13} color="var(--primary-400)" />
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{doc.employeeName || '—'}</span>
                      </div>
                      <span>{doc.hasFile === false ? 'No file' : doc.fileSize || '—'}</span>
                    </div>

                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={12} />
                      <span>Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* RIGHT COLUMN: Active Selected Document Inspector & Live Preview */}
        <Card padding="1.5rem" style={{ minHeight: '560px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeDoc ? (
            <>
              {/* Document Header Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  backgroundColor: 'var(--bg-surface-hover)',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {activeDoc.hasFile === false ? (
                      <Badge variant="warning" icon={<AlertTriangle size={12} />}>File missing</Badge>
                    ) : (
                      <Badge variant="success" icon={<CheckCircle2 size={12} />}>File stored</Badge>
                    )}
                    <Badge variant="info">{activeDoc.category}</Badge>
                  </div>
                  <h2 style={{ margin: '0.4rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
                    {activeDoc.title}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Employee: <strong>{activeDoc.employeeName || '—'}</strong>
                    {activeDoc.employeeCode ? ` (${activeDoc.employeeCode})` : ''} • Size: {activeDoc.fileSize || '—'} • Uploaded:{' '}
                    {activeDoc.uploadedAt ? new Date(activeDoc.uploadedAt).toLocaleDateString() : '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <Button
                    variant="primary"
                    icon={<Download size={16} />}
                    onClick={() => handleDownloadFile(activeDoc)}
                    disabled={activeDoc.hasFile === false}
                  >
                    Download File
                  </Button>
                  <Button
                    variant="danger"
                    icon={<Trash2 size={16} />}
                    onClick={() => setDeleteConfirmDoc(activeDoc)}
                    title="Delete Document"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Preview of the stored file */}
              <div
                className="document-preview"
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  flex: 1,
                  minHeight: '420px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {activeDoc.hasFile === false ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', maxWidth: 420 }}>
                    <AlertTriangle size={36} style={{ marginBottom: '0.75rem', color: 'var(--warning-text)' }} />
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>No file is stored for this document</div>
                    <p style={{ fontSize: '0.85rem' }}>
                      It was added before file storage was available. Delete it and upload the file again.
                    </p>
                  </div>
                ) : !preview || preview.docId !== activeDoc.id || preview.loading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading preview…</div>
                ) : preview.error ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', maxWidth: 420 }}>
                    <AlertTriangle size={36} style={{ marginBottom: '0.75rem', color: 'var(--warning-text)' }} />
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Preview not available</div>
                    <p style={{ fontSize: '0.85rem' }}>{preview.error}</p>
                  </div>
                ) : preview.url && preview.type?.startsWith('image/') ? (
                  <img src={preview.url} alt={activeDoc.title} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                ) : preview.url ? (
                  <iframe
                    title={`Preview of ${activeDoc.title}`}
                    src={preview.url}
                    style={{ width: '100%', height: '70vh', minHeight: '420px', border: 0, background: '#fff' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <FileText size={40} style={{ opacity: 0.6, marginBottom: '0.75rem' }} />
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>This file type can't be shown here</div>
                    <p style={{ fontSize: '0.85rem' }}>Use Download File to open it.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <h3>No Document Selected</h3>
              <p style={{ fontSize: '0.875rem' }}>Select a document from the left scroll bar list to inspect details.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Upload Document Modal */}
      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Document" maxWidth="520px">
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {toastMsg?.type === 'error' && (
            <Alert variant="error">{toastMsg.text}</Alert>
          )}
          <Select
            label="Employee"
            required
            options={employeeOptions}
            value={uploadEmployeeId}
            onChange={(e) => setUploadEmployeeId(e.target.value)}
          />

          <Input
            label="Document Title"
            required
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="e.g. Identity Aadhaar Card / Employment Contract"
          />

          <Select
            label="Category"
            required
            options={allCategories.map((c) => ({ value: c, label: c }))}
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
          />

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
              Select File *
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept={ACCEPTED_EXTENSIONS.join(',')}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--primary-400)',
                backgroundColor: 'var(--bg-surface-hover)',
                padding: '1.75rem 1rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Upload size={32} color="var(--primary-500)" style={{ marginBottom: '0.5rem' }} />
              {selectedFile ? (
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    📄 {selectedFile.name}
                  </div>
                  <span style={{ fontSize: '0.775rem', color: 'var(--primary-400)', fontWeight: 700 }}>
                    {selectedFile.size >= 1024 * 1024 ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`} • Ready to upload
                  </span>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Click here to choose file from your PC
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    PDF, Word, Excel, PNG, JPG or TXT, up to 10 MB
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={uploading}>
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmDoc && (
        <Modal isOpen={Boolean(deleteConfirmDoc)} onClose={() => setDeleteConfirmDoc(null)} title="Confirm Delete Document">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Are you sure you want to permanently delete <strong>"{deleteConfirmDoc.title}"</strong> ? The stored file is removed as well. This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setDeleteConfirmDoc(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" icon={<Trash2 size={16} />} onClick={handleDeleteDocument}>
                Permanently Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DocumentsPage;
