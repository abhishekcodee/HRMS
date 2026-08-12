import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Building2, CalendarDays, FileText } from 'lucide-react';
import { Modal, Input } from './ui';
import { MOCK_EMPLOYEES, MOCK_DEPARTMENTS } from '@hrms/shared';

export const GlobalSearchModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filteredEmployees = query
    ? MOCK_EMPLOYEES.filter(
        e =>
          e.firstName.toLowerCase().includes(query.toLowerCase()) ||
          e.lastName.toLowerCase().includes(query.toLowerCase()) ||
          e.employeeId.toLowerCase().includes(query.toLowerCase()) ||
          e.departmentName.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredDepts = query
    ? MOCK_DEPARTMENTS.filter(
        d =>
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.code.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global HRMS Search" maxWidth="560px">
      <div>
        <Input
          placeholder="Search employees, departments, attendance, payroll..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          icon={<Search size={18} />}
          autoFocus
        />

        {query && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredEmployees.length > 0 && (
              <div>
                <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Employees ({filteredEmployees.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {filteredEmployees.map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => {
                        navigate(`/employees/${emp.id}`);
                        onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface-hover)',
                        cursor: 'pointer'
                      }}
                    >
                      <User size={16} color="var(--primary-500)" />
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {emp.firstName} {emp.lastName} ({emp.employeeId})
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                          {emp.designation} • {emp.departmentName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredDepts.length > 0 && (
              <div>
                <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Departments ({filteredDepts.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {filteredDepts.map(dept => (
                    <div
                      key={dept.id}
                      onClick={() => {
                        navigate('/departments');
                        onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface-hover)',
                        cursor: 'pointer'
                      }}
                    >
                      <Building2 size={16} color="var(--primary-500)" />
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {dept.name} ({dept.code})
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                          Head: {dept.headName} • {dept.employeeCount} Members
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredEmployees.length === 0 && filteredDepts.length === 0 && (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No results found matching &quot;{query}&quot;
              </div>
            )}
          </div>
        )}

        {!query && (
          <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Type a name, ID, department, or module to search across HRMS.
          </div>
        )}
      </div>
    </Modal>
  );
};
