import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Building2 } from 'lucide-react';
import { Modal, Input } from './ui';
import { fetchEmployeesFromDb, EmployeeDbRecord } from '../services/employeeApi';
import { MOCK_DEPARTMENTS } from '@hrms/shared';

export const GlobalSearchModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<EmployeeDbRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setEmployees([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await fetchEmployeesFromDb({ search: query.trim() });
      setEmployees(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

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
          placeholder="Search real employees, departments..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          icon={<Search size={18} />}
          autoFocus
        />

        {query && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {employees.length > 0 && (
              <div>
                <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Employees ({employees.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {employees.map(emp => (
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
                          {emp.fullName} ({emp.employeeId})
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                          {emp.designation || 'Employee'} • {emp.departmentName || 'General'}
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

            {employees.length === 0 && filteredDepts.length === 0 && (
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
