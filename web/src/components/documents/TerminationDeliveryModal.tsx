import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Truck, Upload, CheckCircle } from 'lucide-react';

interface TerminationDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  letterId: string;
  employeeName: string;
  onSuccess?: () => void;
}

export const TerminationDeliveryModal: React.FC<TerminationDeliveryModalProps> = ({
  isOpen,
  onClose,
  letterId,
  employeeName,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState('dispatched_registered_post_ad');
  const [postalTrackingNumber, setPostalTrackingNumber] = useState('');
  const [postalReceiptUrl, setPostalReceiptUrl] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/termination-letters/${letterId}/delivery-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_status: deliveryStatus,
          postal_tracking_number: postalTrackingNumber,
          postal_receipt_url: postalReceiptUrl,
          delivery_notes: deliveryNotes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('✅ Delivery record updated successfully!');
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
      title="Record Delivery Status & Registered Post AD Receipt"
      maxWidth="600px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Recording delivery proof for <strong>{employeeName}</strong>
        </div>

        <div>
          <label className="form-label">Delivery Outcome Status</label>
          <select
            className="select"
            value={deliveryStatus}
            onChange={(e) => setDeliveryStatus(e.target.value)}
          >
            <option value="acknowledged">Hand Delivered & Signed Acknowledgement Received</option>
            <option value="dispatched_registered_post_ad">Dispatched via Registered Post AD (India Post)</option>
            <option value="refused">Refused / Returned by Addressee</option>
          </select>
        </div>

        <Input
          label="Postal / Courier Tracking Reference (e.g. EM123456789IN)"
          value={postalTrackingNumber}
          onChange={(e) => setPostalTrackingNumber(e.target.value)}
          placeholder="Enter tracking ID..."
        />

        <Input
          label="Postal Receipt / AD Slip Attachment URL"
          value={postalReceiptUrl}
          onChange={(e) => setPostalReceiptUrl(e.target.value)}
          placeholder="e.g. /uploads/postal_ad_receipt.jpg"
        />

        <div>
          <label className="form-label">Delivery Remarks / Dispatch Log Notes</label>
          <textarea
            className="textarea"
            rows={3}
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="Enter dispatch notes, postal office branch, or refusal details..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<CheckCircle size={16} />} onClick={handleSubmit} isLoading={loading}>
            Save Delivery Record
          </Button>
        </div>
      </div>
    </Modal>
  );
};
