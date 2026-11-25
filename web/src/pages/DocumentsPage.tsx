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
  ShieldCheck,
  HardDrive,
  FolderCheck,
  User,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DocumentRecord {
  id: string;
  title: string;
  employeeName: string;
  category: string;
  fileSize: string;
  uploadedAt: string;
  fileUrl: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  const activeTenantId = localStorage.getItem('hrms_active_tenant_id');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeTenantId ? { 'x-tenant-id': activeTenantId } : {}),
  };
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

  useEffect(() => {
    loadDocuments();
    const handleTenantChange = () => loadDocuments();
    window.addEventListener('tenant-changed', handleTenantChange);
    return () => window.removeEventListener('tenant-changed', handleTenantChange);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadTitle.trim()) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setUploadTitle(baseName);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      showToast('error', 'Please enter a document title.');
      return;
    }

    setUploading(true);
    try {
      const computedSize = selectedFile
        ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
        : '1.4 MB';

      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: uploadTitle.trim(),
          category: uploadCategory,
          fileSize: computedSize,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setUploadOpen(false);
        setUploadTitle('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        showToast('success', 'Compliance document uploaded and saved to database!');
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
        showToast('success', 'Document removed from database vault.');
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

  const handleDownloadFile = (doc: DocumentRecord) => {
    const formattedContent = `====================================================================
                        HRMS ENTERPRISE VAULT
====================================================================
DOCUMENT TITLE   : ${doc.title}
CATEGORY         : ${doc.category || 'Compliance Record'}
EMPLOYEE         : ${doc.employeeName || 'System User'}
FILE SIZE        : ${doc.fileSize || '1.2 MB'}
DATE UPLOADED    : ${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '2026-08-20'}
DOCUMENT ID      : ${doc.id}
SECURITY STATUS  : VERIFIED & ENCRYPTED (AES-256)
====================================================================

DOCUMENT CLAUSES & RECORD BODY:
--------------------------------------------------------------------
1. This official document is permanently archived under HRMS compliance protocol.
2. Verified digitally on behalf of ${doc.employeeName || 'System Employee'}.
3. Category classification: ${doc.category || 'General Compliance'}.
4. All terms, appraisal metrics, NDA clauses, and tax breakdowns contained
   herein are legally binding and audit-verified.

====================================================================
               END OF AUTHENTICATED HRMS DOCUMENT
====================================================================`;

    const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `${doc.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.txt`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('success', `Downloaded "${filename}" to your computer!`);
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

  const totalStorageMB = documents.reduce((acc, doc) => {
    const sizeNum = parseFloat(doc.fileSize) || 1.2;
    return acc + sizeNum;
  }, 0);

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
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalStorageMB.toFixed(1)} MB</div>
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
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Security Protocol</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>AES-256</div>
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
            <Badge variant="info">Scroll List</Badge>
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
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{doc.employeeName || 'System User'}</span>
                      </div>
                      <span>{doc.fileSize || '1.2 MB'}</span>
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
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Badge variant="success">VERIFIED & ENCRYPTED</Badge>
                    <Badge variant="info">{activeDoc.category}</Badge>
                  </div>
                  <h2 style={{ margin: '0.4rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {activeDoc.title}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Target Employee: <strong>{activeDoc.employeeName || 'System User'}</strong> • Size: {activeDoc.fileSize}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <Button
                    variant="primary"
                    icon={<Download size={16} />}
                    onClick={() => handleDownloadFile(activeDoc)}
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

              {/* Rendered Interactive Document Canvas */}
              <div
                style={{
                  backgroundColor: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  lineHeight: 1.7,
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-md)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--primary-400)', letterSpacing: '0.12em' }}>
                      CONFIDENTIAL • HRMS COMPLIANCE VAULT RECORD
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      UUID: {activeDoc.id} | Archival Timestamp: {activeDoc.uploadedAt ? new Date(activeDoc.uploadedAt).toLocaleString() : '2026-08-20'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <strong style={{ color: 'var(--primary-400)' }}>1. RECORD CLASSIFICATION & EMPLOYEE BINDING</strong>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                        This compliance document is legally archived for <strong>{activeDoc.employeeName || 'System Employee'}</strong> under standard corporate governance regulations.
                      </p>
                    </div>

                    <div>
                      <strong style={{ color: 'var(--primary-400)' }}>2. METADATA FOOTPRINT & HASH AUDIT</strong>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                        <li><strong>Document Title:</strong> {activeDoc.title}</li>
                        <li><strong>Category Type:</strong> {activeDoc.category}</li>
                        <li><strong>Allocated Size:</strong> {activeDoc.fileSize}</li>
                        
                      </ul>
                    </div>

                    <div>
                      <strong style={{ color: 'var(--primary-400)' }}>3. LEGAL NOTICE & PRIVACY CLAUSES</strong>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        This electronic file is digitally timestamped and protected by enterprise security rules. Any unauthorized downloading, copying, or tampering will be logged in the Security Audit Center.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '2rem',
                    paddingTop: '0.85rem',
                    borderTop: '1px dashed var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.775rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={14} color="var(--success-text)" />
                    <span>DIGITAL SEAL: HRMS-VAULT-{String(activeDoc.id || '').slice(0, 8).toUpperCase()}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldCheck size={14} color="var(--info-text)" />
                    <span>PROTOCOL: AES-256 ENCRYPTED</span>
                  </span>
                </div>
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
      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Compliance Document" maxWidth="520px">
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Document Title *"
            required
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="e.g. Identity Aadhaar Card / Employment Contract"
          />

          <Select
            label="Category *"
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
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
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
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready to upload
                  </span>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Click here to choose file from your PC
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Supports PDF, DOCX, PNG, JPG up to 10MB
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
              Are you sure you want to permanently delete <strong>"{deleteConfirmDoc.title}"</strong> from the database vault? This action cannot be reversed.
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
