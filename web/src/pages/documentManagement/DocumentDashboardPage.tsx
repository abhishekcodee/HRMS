import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  SearchInput,
  Select,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Modal,
  Input,
} from '../../components/ui';
import {
  FileText,
  PlusCircle,
  FolderTree,
  FileCode,
  Lock,
  Download,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Award,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const DocumentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [approveModalDoc, setApproveModalDoc] = useState<any | null>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/documents', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDocuments(json.data);
      }
    } catch (err) {
      console.error('Failed to load document dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleApproveReject = async (docId: string, action: 'APPROVE' | 'REJECT') => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/v1/document-management/${docId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, comments: approvalComments }),
      });
      const json = await res.json();
      if (json.success) {
        setApproveModalDoc(null);
        setApprovalComments('');
        loadDocuments();
      }
    } catch (err) {
      console.error('Approval action error:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDownload = (docId: string) => {
    window.open(`/api/v1/document-management/${docId}/download`, '_blank');
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      doc.referenceNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || doc.status === statusFilter;
    const matchesCat = !categoryFilter || doc.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCat;
  });

  const counts = {
    total: documents.length,
    submitted: documents.filter((d) => d.status === 'SUBMITTED').length,
    final: documents.filter((d) => d.status === 'FINAL' || d.status === 'APPROVED').length,
    draft: documents.filter((d) => d.status === 'DRAFT').length,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '24px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '16px',
          color: '#FFFFFF',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.4)',
              }}
            >
              <ShieldCheck style={{ width: '24px', height: '24px', color: '#60A5FA' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Enterprise Document Management & Security
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 52px', color: '#94A3B8', fontSize: '14px' }}>
            Centralized corporate document lifecycle, dynamic templates, multi-tier approvals, & tamper-proof cryptographic signatures.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/document-management/types')}
            icon={<FolderTree style={{ width: '16px', height: '16px' }} />}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            Types & Categories
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/document-management/templates')}
            icon={<FileCode style={{ width: '16px', height: '16px' }} />}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            Template Builder
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/document-management/generate')}
            icon={<PlusCircle style={{ width: '16px', height: '16px' }} />}
            style={{ background: '#3B82F6', fontWeight: 600 }}
          >
            Generate Document
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <Card style={{ borderLeft: '4px solid #3B82F6' }}>
          <CardBody style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Total Documents</p>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>{counts.total}</h3>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card style={{ borderLeft: '4px solid #F59E0B' }}>
          <CardBody style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Pending Approval</p>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 700, color: '#D97706' }}>{counts.submitted}</h3>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles style={{ width: '20px', height: '20px', color: '#D97706' }} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card style={{ borderLeft: '4px solid #10B981' }}>
          <CardBody style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Final & Sealed</p>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 700, color: '#059669' }}>{counts.final}</h3>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock style={{ width: '20px', height: '20px', color: '#059669' }} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card style={{ borderLeft: '4px solid #6366F1' }}>
          <CardBody style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 500 }}>My Locker Access</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/my-documents')}
                  style={{ marginTop: '6px', fontSize: '12px' }}
                >
                  Open Locker
                </Button>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award style={{ width: '20px', height: '20px', color: '#6366F1' }} />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <CardTitle style={{ fontSize: '16px', fontWeight: 600 }}>Corporate Document Vault</CardTitle>
          <div style={{ display: 'flex', gap: '12px', width: '60%', justifyContent: 'flex-end' }}>
            <SearchInput
              placeholder="Search by Title, Employee, or Ref Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: '280px' }}
            />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'SUBMITTED', label: 'Pending Approval' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'FINAL', label: 'Final & Locked' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ maxWidth: '160px' }}
            />
          </div>
        </CardHeader>

        <CardBody style={{ padding: 0 }}>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>Document Details</Th>
                  <Th>Employee</Th>
                  <Th>Reference No.</Th>
                  <Th>Status</Th>
                  <Th>Generated Date</Th>
                  <Th style={{ textAlign: 'right' }}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                      Loading document repository...
                    </Td>
                  </Tr>
                ) : filteredDocs.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                      No documents found matching your criteria.
                    </Td>
                  </Tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <Tr key={doc.id}>
                      <Td style={{ fontWeight: 600, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText style={{ width: '18px', height: '18px', color: '#3B82F6' }} />
                          <div>
                            <div>{doc.title}</div>
                            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 400 }}>{doc.category || 'Official Document'}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>{doc.employeeName || 'N/A'}</Td>
                      <Td>
                        <code style={{ fontSize: '12px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                          {doc.referenceNumber || doc.id.slice(0, 8)}
                        </code>
                      </Td>
                      <Td>
                        {doc.status === 'FINAL' || doc.status === 'APPROVED' ? (
                          <Badge variant="success">Final & Locked</Badge>
                        ) : doc.status === 'SUBMITTED' ? (
                          <Badge variant="warning">Pending Approval</Badge>
                        ) : doc.status === 'REJECTED' ? (
                          <Badge variant="error">Rejected</Badge>
                        ) : (
                          <Badge variant="neutral">Draft</Badge>
                        )}
                      </Td>
                      <Td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Today'}</Td>
                      <Td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {doc.status === 'SUBMITTED' && (String(user?.role).toLowerCase() === 'admin' || String(user?.role).toLowerCase() === 'employer') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setApproveModalDoc(doc)}
                              style={{ color: '#D97706', borderColor: '#FCD34D' }}
                            >
                              Review Approval
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownload(doc.id)}
                            icon={<Download style={{ width: '14px', height: '14px' }} />}
                          >
                            View / Print
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

      {/* Approval Modal */}
      {approveModalDoc && (
        <Modal
          isOpen={Boolean(approveModalDoc)}
          onClose={() => setApproveModalDoc(null)}
          title="Review & Approve Document"
        >
          <div style={{ padding: '16px 0' }}>
            <p>
              Reviewing approval request for <strong>{approveModalDoc.title}</strong> generated for{' '}
              <strong>{approveModalDoc.employeeName}</strong>.
            </p>
            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Approval / Rejection Remarks (Optional)
              </label>
              <Input
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Enter remarks..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <Button
                variant="secondary"
                onClick={() => handleApproveReject(approveModalDoc.id, 'REJECT')}
                disabled={submittingAction}
                icon={<XCircle style={{ width: '16px', height: '16px' }} />}
                style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
              >
                Reject Document
              </Button>
              <Button
                variant="primary"
                onClick={() => handleApproveReject(approveModalDoc.id, 'APPROVE')}
                disabled={submittingAction}
                icon={<CheckCircle style={{ width: '16px', height: '16px' }} />}
                style={{ background: '#10B981' }}
              >
                Approve & Seal Document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DocumentDashboardPage;
