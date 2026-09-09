import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CheckCircle, XCircle, FileText, ExternalLink, ShieldCheck } from 'lucide-react';

interface TerminationApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestRecord: {
    id: string;
    employee_name: string;
    employee_code: string;
    variant_code: 'notice' | 'misconduct' | 'probation';
    last_working_day: string;
    attachments_json?: string;
    status: string;
  };
  onSuccess?: () => void;
}

export const TerminationApprovalModal: React.FC<TerminationApprovalModalProps> = ({
  isOpen,
  onClose,
  requestRecord,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const attachments = JSON.parse(requestRecord.attachments_json || '{}');

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/termination-letters/${requestRecord.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: rejectionReason }),
      });

      const json = await res.json();
      if (json.success) {
        alert(action === 'approve' ? '✅ Termination request approved successfully!' : 'Termination request rejected.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert('Error: ' + json.error?.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="2nd Approver Review — Termination Request"
      maxWidth="700px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '6px' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            {requestRecord.employee_name} ({requestRecord.employee_code})
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Variant: <strong>{requestRecord.variant_code.toUpperCase()}</strong> | Last Working Day: <strong>{requestRecord.last_working_day}</strong>
          </div>
        </div>

        {/* Variant 2 Attachments Inspection */}
        {requestRecord.variant_code === 'misconduct' && (
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={16} color="var(--primary-color)" /> Inquiry Proceeding Mandatory Documents
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>1. Show Cause Notice Document:</span>
                {attachments.show_cause_url ? (
                  <a href={attachments.show_cause_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Inspect File <ExternalLink size={14} />
                  </a>
                ) : (
                  <span style={{ color: '#DC2626' }}>Missing</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>2. Employee Reply Document:</span>
                {attachments.employee_reply_url ? (
                  <a href={attachments.employee_reply_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Inspect File <ExternalLink size={14} />
                  </a>
                ) : (
                  <span style={{ color: '#DC2626' }}>Missing</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>3. Inquiry Report Document:</span>
                {attachments.inquiry_report_url ? (
                  <a href={attachments.inquiry_report_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Inspect File <ExternalLink size={14} />
                  </a>
                ) : (
                  <span style={{ color: '#DC2626' }}>Missing</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="form-label">Rejection Comments (If rejecting)</label>
          <textarea
            className="textarea"
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason if rejecting request..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <Button variant="danger" icon={<XCircle size={16} />} onClick={() => handleAction('reject')} isLoading={loading}>
            Reject Request
          </Button>
          <Button variant="primary" icon={<CheckCircle size={16} />} onClick={() => handleAction('approve')} isLoading={loading}>
            Approve & Authorize Issue
          </Button>
        </div>
      </div>
    </Modal>
  );
};
