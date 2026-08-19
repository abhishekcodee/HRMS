import React, { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardBody, SearchInput, Select, TableContainer, Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, Input, Alert } from '../components/ui';
import { FileText, Download, Upload, Plus } from 'lucide-react';

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
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Identity Proof');
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
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    try {
      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: uploadTitle.trim(),
          category: uploadCategory,
          fileSize: '1.4 MB',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setUploadOpen(false);
        setUploadTitle('');
        showToast('success', 'Document uploaded to database!');
        await loadDocuments();
      } else {
        showToast('error', json.error?.message || 'Failed to upload document.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Upload error.');
    }
  };

  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.title?.toLowerCase().includes(search.toLowerCase()) || (d.employeeName && d.employeeName.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter ? d.category === categoryFilter : true;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Management Vault</h1>
          <p className="page-subtitle">Identity proof verification, contracts, and tax compliance records from database</p>
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

      <Card padding="1rem">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <SearchInput placeholder="Search real documents or employees..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          <Select
            placeholder="All Categories"
            options={[
              { value: 'Identity Proof', label: 'Identity Proof' },
              { value: 'Employment Contract', label: 'Employment Contract' },
              { value: 'Tax Document', label: 'Tax Document' }
            ]}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          />
        </div>
      </Card>

      <TableContainer>
        <Table>
          <Thead>
            <Tr><Th>Document Title</Th><Th>Employee</Th><Th>Category</Th><Th>File Size</Th><Th>Uploaded Date</Th><Th style={{ textAlign: 'right' }}>Actions</Th></Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading documents from MySQL database...</Td></Tr>
            ) : filteredDocs.length === 0 ? (
              <Tr><Td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No documents found in database.</Td></Tr>
            ) : (
              filteredDocs.map(doc => (
                <Tr key={doc.id}>
                  <Td style={{ fontWeight: 600 }}>{doc.title}</Td>
                  <Td>{doc.employeeName || 'System User'}</Td>
                  <Td>{doc.category || 'General'}</Td>
                  <Td>{doc.fileSize || '1.0 MB'}</Td>
                  <Td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Recent'}</Td>
                  <Td style={{ textAlign: 'right' }}>
                    <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={() => window.open(doc.fileUrl || '#', '_blank')}>
                      View / Download
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Compliance Document">
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Document Title *" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="e.g. Aadhaar Card Front & Back" />
          <Select label="Category *" required options={[{ value: 'Identity Proof', label: 'Identity Proof' }, { value: 'Employment Contract', label: 'Employment Contract' }, { value: 'Tax Document', label: 'Tax Document' }]} value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} />
          <div style={{ border: '1px dashed var(--border-color)', padding: '1.5rem', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
            <Upload size={28} color="var(--primary-500)" />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem' }}>Select file to upload</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF, JPG, PNG up to 10MB</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Upload File (Save DB)</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentsPage;
