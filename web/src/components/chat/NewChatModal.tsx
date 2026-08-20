import React, { useState, useEffect } from 'react';
import { Search, User, X } from 'lucide-react';
import { Modal, Button, Input, Avatar, Badge } from '../ui';
import { searchChatEmployees, ChatEmployeeSearchResult } from '../../services/chatApi';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onSelectUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<ChatEmployeeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleSearch('');
    }
  }, [isOpen]);

  const handleSearch = async (query: string) => {
    setSearchTerm(query);
    setLoading(true);
    try {
      const results = await searchChatEmployees(query);
      setEmployees(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start New Private Chat" maxWidth="550px">
      <div style={{ padding: '0.5rem 0' }}>
        <Input
          placeholder="Search by Employee Name, ID, Department..."
          icon={<Search size={18} />}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />

        <div style={{ marginTop: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Searching active employees...</div>
          ) : employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No matching active HRMS employees found.</div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => {
                  onSelectUser(emp.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Avatar name={emp.fullName} src={emp.profilePhoto} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {emp.fullName}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({emp.employeeId})</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                    {emp.designation && <span>{emp.designation}</span>}
                    {emp.departmentName && <span>• {emp.departmentName}</span>}
                  </div>
                </div>
                <Button size="sm" variant="secondary">Message</Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
