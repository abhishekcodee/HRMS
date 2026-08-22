import React, { useState, useEffect } from 'react';
import { Users, Search, Check } from 'lucide-react';
import { Modal, Button, Input, Avatar, Alert } from '../ui';
import { searchChatEmployees, createGroupChat, ChatEmployeeSearchResult } from '../../services/chatApi';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (conversationId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<ChatEmployeeSearchResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGroupName('');
      setDescription('');
      setSelectedIds([]);
      setError(null);
      handleSearch('');
    }
  }, [isOpen]);

  const handleSearch = async (query: string) => {
    setSearchTerm(query);
    try {
      const results = await searchChatEmployees(query);
      setEmployees(results);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleCreate = async () => {
    setError(null);
    if (!groupName.trim()) {
      setError('Please enter a Group Name');
      return;
    }
    if (selectedIds.length === 0) {
      setError('Please select at least 1 group member');
      return;
    }

    setSubmitting(true);
    try {
      const convId = await createGroupChat(groupName.trim(), selectedIds, description.trim());
      onGroupCreated(convId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group Chat" maxWidth="550px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {error && (
          <Alert variant="error" title="Validation Error">
            {error}
          </Alert>
        )}
        <Input
          label="Group Name *"
          placeholder="e.g. Development Sprint Team"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <Input
          label="Group Description (Optional)"
          placeholder="e.g. Daily coordination for HRMS releases"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div style={{ marginTop: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>
            Select Group Members ({selectedIds.length} selected)
          </label>
          <Input
            placeholder="Filter employees..."
            icon={<Search size={16} />}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
          {employees.map((emp) => {
            const isSelected = selectedIds.includes(emp.id);
            return (
              <div
                key={emp.id}
                onClick={() => toggleSelectUser(emp.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--primary-glow)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: `1.5px solid ${isSelected ? 'var(--primary-500)' : 'var(--border-color)'}`,
                    backgroundColor: isSelected ? 'var(--primary-500)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  {isSelected && <Check size={14} />}
                </div>
                <Avatar name={emp.fullName} src={emp.profilePhoto} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.fullName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {emp.designation} {emp.departmentName ? `(${emp.departmentName})` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} isLoading={submitting}>
            Create Group
          </Button>
        </div>
      </div>
    </Modal>
  );
};
