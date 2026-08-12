import React, { useState } from 'react';
import { UserRole, MOCK_DOCUMENTS, DocumentMock } from '@hrms/shared';
import { useRole } from '../context/RoleContext';
import { Button, Card, CardHeader, CardTitle, CardBody, SearchInput, Select, TableContainer, Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, Input } from '../components/ui';
import { FileText, Download, Upload, Plus } from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const { role, currentUser } = useRole();
  const [documents, setDocuments] = useState<DocumentMock[]>(MOCK_DOCUMENTS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const filteredDocs = documents.filter(d => {
    if (role === UserRole.EMPLOYEE && !d.employeeName.toLowerCase().includes(currentUser.firstName.toLowerCase())) {
      return false;
    }
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter ? d.category === categoryFilter : true;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Management Vault</h1>
          <p className="page-subtitle">Identity proof verification, contracts, and tax compliance records</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" icon={<Upload size={16} />} onClick={() => setUploadOpen(true)}>
            + Upload Document
          </Button>
        </div>
      </div>

      <Card padding="1rem">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <SearchInput placeholder="Search documents or employees..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
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
            <Tr><Th>Document Title</Th><Th>Employee</Th><Th>Category</Th><Th>File Size</Th><Th>Uploaded Date</Th><Th>Status</Th><Th style={{ textAlign: 'right' }}>Actions</Th></Tr>
          </Thead>
          <Tbody>
            {filteredDocs.map(doc => (
              <Tr key={doc.id}>
                <Td style={{ fontWeight: 600 }}>{doc.title}</Td>
                <Td>{doc.employeeName}</Td>
                <Td>{doc.category}</Td>
                <Td>{doc.fileSize}</Td>
                <Td>{doc.uploadedAt}</Td>
                <Td><Badge variant={doc.status === 'VERIFIED' ? 'success' : 'warning'}>{doc.status}</Badge></Td>
                <Td style={{ textAlign: 'right' }}>
                  <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={() => alert('Downloading file (UI Placeholder).')}>
                    Download
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Compliance Document">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Document Title *" required placeholder="e.g. Aadhaar Card Front & Back" />
          <Select label="Category *" required options={[{ value: 'Identity Proof', label: 'Identity Proof' }, { value: 'Tax Document', label: 'Tax Document' }]} />
          <div style={{ border: '1px dashed var(--border-color)', padding: '1.5rem', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
            <Upload size={28} color="var(--primary-500)" />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem' }}>Select file to upload</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF, JPG, PNG up to 10MB</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setUploadOpen(false); alert('Document uploaded (UI Placeholder).'); }}>Upload File</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentsPage;
