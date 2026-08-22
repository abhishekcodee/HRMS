import React, { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Modal, Button, Input, Alert } from '../ui';
import { postHRAnnouncement } from '../../services/chatApi';

interface PostAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PostAnnouncementModal: React.FC<PostAnnouncementModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim() || !message.trim()) {
      setError('Please fill out both announcement Title and Message.');
      return;
    }

    setSubmitting(true);
    try {
      await postHRAnnouncement(title.trim(), message.trim());
      setTitle('');
      setMessage('');
      setError(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to post announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publish Company Announcement" maxWidth="550px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {error && (
          <Alert variant="error" title="Validation Error">
            {error}
          </Alert>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-500)', fontSize: '0.9rem', fontWeight: 600 }}>
          <Megaphone size={20} />
          Broadcast message to all active HRMS employees
        </div>

        <Input
          label="Announcement Header / Title *"
          placeholder="e.g. Office Schedule Update & Holiday Calendar 2026"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
            Announcement Content *
          </label>
          <textarea
            className="chat-textarea"
            placeholder="Enter the detailed official company announcement here..."
            rows={5}
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            style={{ width: '100%', minHeight: '120px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Megaphone size={16} />} onClick={handleSubmit} isLoading={submitting}>
            Publish Broadcast
          </Button>
        </div>
      </div>
    </Modal>
  );
};
