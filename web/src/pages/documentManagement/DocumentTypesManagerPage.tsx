import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
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
  Modal,
  Input,
} from '../../components/ui';
import { Plus, ArrowLeft, CheckCircle2 } from 'lucide-react';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const DocumentTypesManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Type Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [requiresEmployeeAccess, setRequiresEmployeeAccess] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, typeRes] = await Promise.all([
        fetch('/api/v1/document-management/categories', { headers: getAuthHeaders() }),
        fetch('/api/v1/document-management/types', { headers: getAuthHeaders() }),
      ]);
      const catJson = await catRes.json();
      const typeJson = await typeRes.json();

      if (catJson.success) setCategories(catJson.data);
      if (typeJson.success) {
        setDocTypes(typeJson.data);
        if (catJson.data?.length > 0) setCategoryId(catJson.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load types:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/document-management/types', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          categoryId,
          name,
          code,
          requiresApproval,
          requiresSignature,
          requiresEmployeeAccess,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setModalOpen(false);
        setName('');
        setCode('');
        loadData();
      }
    } catch (err) {
      console.error('Failed to create type:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
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
            Corporate Document Types & Category Management
          </h1>
        </div>

        <Button
          variant="primary"
          onClick={() => setModalOpen(true)}
          icon={<Plus style={{ width: '16px', height: '16px' }} />}
        >
          Add Custom Document Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle style={{ fontSize: '16px' }}>Configured HRMS Document Types (20+ Out-of-the-Box)</CardTitle>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>Document Type</Th>
                  <Th>Category</Th>
                  <Th>Code</Th>
                  <Th>Requires Approval</Th>
                  <Th>Requires Signature</Th>
                  <Th>Self-Service Access</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr><Td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Loading document types...</Td></Tr>
                ) : (
                  docTypes.map((dt) => (
                    <Tr key={dt.id}>
                      <Td style={{ fontWeight: 600 }}>{dt.name}</Td>
                      <Td><Badge variant="neutral">{dt.categoryName || 'General'}</Badge></Td>
                      <Td><code style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px' }}>{dt.code}</code></Td>
                      <Td>
                        {dt.requiresApproval ? (
                          <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 style={{ width: '16px', height: '16px' }} /> Yes
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>No</span>
                        )}
                      </Td>
                      <Td>
                        {dt.requiresSignature ? (
                          <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 style={{ width: '16px', height: '16px' }} /> Required
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Optional</span>
                        )}
                      </Td>
                      <Td>
                        {dt.requiresEmployeeAccess ? (
                          <Badge variant="success">Visible in Locker</Badge>
                        ) : (
                          <Badge variant="error">Restricted Admin Only</Badge>
                        )}
                      </Td>
                      <Td><Badge variant="info">{String(dt.status).toUpperCase()}</Badge></Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      {/* New Type Modal */}
      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Document Type">
          <form onSubmit={handleCreateType} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Type Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Relocation Allowance Letter" required />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>System Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. RELOCATION_ALLOWANCE" required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
                Requires Manager / HR Approval before issuing
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={requiresSignature} onChange={(e) => setRequiresSignature(e.target.checked)} />
                Requires Digital / Image Signature
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={requiresEmployeeAccess} onChange={(e) => setRequiresEmployeeAccess(e.target.checked)} />
                Visible in Employee Self-Service Locker
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={saving}>Create Document Type</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DocumentTypesManagerPage;
