import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
} from '../../components/ui';
import { Download, ShieldCheck, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const EmployeeLockerPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    loadLocker();
  }, []);

  const [downloadError, setDownloadError] = useState<string | null>(null);

  /** Fetches the letter with the login token and opens it in a new tab (where it can be printed or saved as PDF). */
  const openDocument = async (doc: any) => {
    setDownloadError(null);
    // Open the tab right away (inside the click) so pop-up blockers allow it, then load the letter into it
    const tab = window.open('', '_blank');
    try {
      const res = await fetch(`/api/v1/document-management/${doc.id}/download`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || 'The document could not be opened.');
      }
      const type = res.headers.get('Content-Type') || '';
      if (!/text\/html|application\/pdf/.test(type)) throw new Error('This document has no printable file yet.');
      const url = URL.createObjectURL(await res.blob());
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      tab?.close();
      setDownloadError(err.message || 'The document could not be opened.');
    }
  };

  const loadLocker = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/document-management/locker', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDocuments(json.data);
      }
    } catch (err) {
      console.error('Failed to load employee locker:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['ALL', 'Joining & Recruitment', 'Employee Certificates', 'Performance & Growth', 'Transfer & Movements', 'Exit & Offboarding'];

  const filteredDocs = selectedCategory === 'ALL'
    ? documents
    : documents.filter((d) => d.categoryName === selectedCategory);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: '#FFFFFF',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award style={{ width: '28px', height: '28px', color: '#A5B4FC' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>My Official HR Document Locker</h1>
          </div>
          <p style={{ margin: '6px 0 0 38px', color: '#C7D2FE', fontSize: '14px' }}>
            Secure employee self-service repository for official letters, contracts, certificates, and salary records.
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck style={{ width: '18px', height: '18px', color: '#818CF8' }} />
          Cryptographically Signed & Sealed
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedCategory === cat ? '1px solid transparent' : '1px solid var(--border-color)',
              background: selectedCategory === cat ? '#4F46E5' : 'var(--bg-surface)',
              color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Documents Card */}
      <Card>
        <CardHeader><CardTitle style={{ fontSize: '16px' }}>Authorized Employee Records</CardTitle></CardHeader>
        <CardBody style={{ padding: 0 }}>
          {downloadError && (
            <div role="alert" style={{ margin: '0 0 12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--error-text)', fontSize: '14px' }}>
              {downloadError}
            </div>
          )}
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>Document Title</Th>
                  <Th>Category</Th>
                  <Th>Reference Code</Th>
                  <Th>Issued Date</Th>
                  <Th style={{ textAlign: 'right' }}>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr><Td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>Loading your document locker...</Td></Tr>
                ) : filteredDocs.length === 0 ? (
                  <Tr><Td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No documents available in this category.</Td></Tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <Tr key={doc.id}>
                      <Td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</Td>
                      <Td><Badge variant="neutral">{doc.categoryName}</Badge></Td>
                      <Td><code style={{ fontSize: '11px', background: 'var(--bg-surface-hover)', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: '4px' }}>{doc.referenceNumber}</code></Td>
                      <Td>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Official Record'}</Td>
                      <Td style={{ textAlign: 'right' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openDocument(doc)}
                          icon={<Download style={{ width: '14px', height: '14px' }} />}
                        >
                          View / Print
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
    </div>
  );
};

export default EmployeeLockerPage;
