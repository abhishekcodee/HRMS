import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES, MOCK_DEPARTMENTS, MOCK_TEAMS, EmployeeMock } from '@hrms/shared';
import { AddEditEmployeeModal } from '../components/AddEditEmployeeModal';
import {
  Button,
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
  Avatar,
  Pagination,
  Dropdown,
  Card,
  ConfirmDialog
} from '../components/ui';
import { UserPlus, Eye, Edit, Trash2, LayoutGrid, LayoutList, Filter } from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeMock[]>(MOCK_EMPLOYEES);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeMock | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeMock | null>(null);

  // Filter logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter ? emp.departmentId === deptFilter : true;
    const matchesTeam = teamFilter ? emp.teamId === teamFilter : true;
    const matchesStatus = statusFilter ? emp.status === statusFilter : true;
    return matchesSearch && matchesDept && matchesTeam && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSaveEmployee = (data: Partial<EmployeeMock>) => {
    if (editingEmployee) {
      setEmployees(prev =>
        prev.map(e => (e.id === editingEmployee.id ? ({ ...e, ...data } as EmployeeMock) : e))
      );
      setEditingEmployee(null);
    } else {
      const newEmp: EmployeeMock = {
        ...(data as EmployeeMock),
        id: data.id || `emp-${Math.floor(1000 + Math.random() * 9000)}`
      };
      setEmployees(prev => [newEmp, ...prev]);
    }
  };

  const handleDeleteEmployee = () => {
    if (deletingEmployee) {
      setEmployees(prev => prev.filter(e => e.id !== deletingEmployee.id));
      setDeletingEmployee(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-subtitle">
            Manage company employees, designations, roles, and profiles ({filteredEmployees.length} total)
          </p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2px', backgroundColor: 'var(--bg-surface)' }}>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="List View"
            >
              <LayoutList size={16} />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
            >
              <LayoutGrid size={16} />
            </Button>
          </div>
          <Button variant="primary" icon={<UserPlus size={16} />} onClick={() => setIsAddModalOpen(true)}>
            + Add Employee
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card padding="1rem">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <SearchInput
            placeholder="Search by name, ID, or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            onClear={() => setSearch('')}
          />
          <Select
            placeholder="Filter by Department"
            options={MOCK_DEPARTMENTS.map(d => ({ value: d.id, label: d.name }))}
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); setCurrentPage(1); }}
          />
          <Select
            placeholder="Filter by Team"
            options={MOCK_TEAMS.map(t => ({ value: t.id, label: t.name }))}
            value={teamFilter}
            onChange={e => { setTeamFilter(e.target.value); setCurrentPage(1); }}
          />
          <Select
            placeholder="Filter by Status"
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PROBATION', label: 'Probation' },
              { value: 'NOTICE_PERIOD', label: 'Notice Period' },
              { value: 'INACTIVE', label: 'Inactive' }
            ]}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </Card>

      {/* Employees Table View */}
      {viewMode === 'list' ? (
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Employee ID</Th>
                <Th>Department & Team</Th>
                <Th>Manager</Th>
                <Th>Joining Date</Th>
                <Th>Status</Th>
                <Th style={{ textAlign: 'right' }}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedEmployees.map(emp => (
                <Tr key={emp.id}>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Avatar name={`${emp.firstName} ${emp.lastName}`} src={emp.avatar} size="md" />
                      <div>
                        <div
                          style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                          onClick={() => navigate(`/employees/${emp.id}`)}
                        >
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                          {emp.designation} • {emp.email}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.employeeId}</span>
                  </Td>
                  <Td>
                    <div>
                      <div style={{ fontWeight: 500 }}>{emp.departmentName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.teamName}</div>
                    </div>
                  </Td>
                  <Td>{emp.managerName || '—'}</Td>
                  <Td>{emp.joiningDate}</Td>
                  <Td>
                    <Badge
                      variant={
                        emp.status === 'ACTIVE'
                          ? 'success'
                          : emp.status === 'PROBATION'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {emp.status}
                    </Badge>
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm">
                          Actions ▾
                        </Button>
                      }
                      items={[
                        {
                          id: 'view',
                          label: 'View Profile Details',
                          icon: <Eye size={14} />,
                          onClick: () => navigate(`/employees/${emp.id}`)
                        },
                        {
                          id: 'edit',
                          label: 'Edit Employee Record',
                          icon: <Edit size={14} />,
                          onClick: () => setEditingEmployee(emp)
                        },
                        {
                          id: 'delete',
                          label: 'Delete Record',
                          icon: <Trash2 size={14} />,
                          danger: true,
                          onClick: () => setDeletingEmployee(emp)
                        }
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredEmployees.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </TableContainer>
      ) : (
        /* Employees Grid Card View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {paginatedEmployees.map(emp => (
            <Card key={emp.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <Avatar name={`${emp.firstName} ${emp.lastName}`} src={emp.avatar} size="lg" />
                <div>
                  <h3
                    style={{ fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                  >
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.designation}</p>
                  <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'warning'}>{emp.status}</Badge>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>ID:</strong> {emp.employeeId}</div>
                <div><strong>Dept:</strong> {emp.departmentName}</div>
                <div><strong>Team:</strong> {emp.teamName}</div>
                <div><strong>Email:</strong> {emp.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <Button variant="outline" size="sm" style={{ flex: 1 }} icon={<Eye size={14} />} onClick={() => navigate(`/employees/${emp.id}`)}>
                  View Profile
                </Button>
                <Button variant="secondary" size="sm" icon={<Edit size={14} />} onClick={() => setEditingEmployee(emp)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {(isAddModalOpen || editingEmployee) && (
        <AddEditEmployeeModal
          isOpen={isAddModalOpen || !!editingEmployee}
          onClose={() => { setIsAddModalOpen(false); setEditingEmployee(null); }}
          employee={editingEmployee}
          onSave={handleSaveEmployee}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingEmployee}
        onClose={() => setDeletingEmployee(null)}
        onConfirm={handleDeleteEmployee}
        title="Delete Employee Profile"
        message={`Are you sure you want to delete ${deletingEmployee?.firstName} ${deletingEmployee?.lastName} (${deletingEmployee?.employeeId})? This action cannot be undone.`}
        confirmText="Delete Record"
      />
    </div>
  );
};

export default EmployeesPage;
