import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddEditEmployeeModal } from '../components/AddEditEmployeeModal';
import {
  fetchEmployeesFromDb,
  createEmployeeInDb,
  updateEmployeeInDb,
  updateEmployeeStatusInDb,
  EmployeeDbRecord,
} from '../services/employeeApi';
import { fetchMasterDepartments, MasterDepartment } from '../services/masterApi';
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
  ConfirmDialog,
} from '../components/ui';
import { UserPlus, Eye, Edit, UserX, LayoutGrid, LayoutList, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeDbRecord[]>([]);
  const [departments, setDepartments] = useState<MasterDepartment[]>([]);
  const [companyLimit, setCompanyLimit] = useState<{ activeCount: number; maxEmployees: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() =>
    typeof window !== 'undefined' && window.innerWidth <= 768 ? 'grid' : 'list'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeDbRecord | null>(null);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<EmployeeDbRecord | null>(null);

  // Fetch employees and master data from database
  const loadDatabaseData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [empList, deptList, compRes] = await Promise.all([
        fetchEmployeesFromDb({ search, department: deptFilter, status: statusFilter }),
        fetchMasterDepartments(),
        fetch('/api/v1/companies', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then(r => r.json()).catch(() => null),
      ]);
      setEmployees(empList);
      setDepartments(deptList);

      if (compRes?.success && Array.isArray(compRes.data) && compRes.data.length > 0) {
        const myComp = compRes.data[0];
        setCompanyLimit({
          activeCount: myComp.activeEmployees !== undefined ? Number(myComp.activeEmployees) : empList.filter(e => e.status === 'active').length,
          maxEmployees: Number(myComp.maxEmployees || 100),
        });
      }
    } catch (err) {
      console.error('Error loading database data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, [search, deptFilter, statusFilter]);

  const totalPages = Math.ceil(employees.length / itemsPerPage) || 1;
  const paginatedEmployees = employees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSaveEmployee = async (data: any) => {
    if (editingEmployee) {
      const res = await updateEmployeeInDb(editingEmployee.id, data);
      if (!res.success) throw new Error(res.error);
    } else {
      const res = await createEmployeeInDb(data);
      if (!res.success) throw new Error(res.error);
    }
    setEditingEmployee(null);
    setIsAddModalOpen(false);
    await loadDatabaseData();
  };

  const handleDeactivateEmployee = async () => {
    if (deactivatingEmployee) {
      const targetStatus = deactivatingEmployee.status === 'active' ? 'inactive' : 'active';
      await updateEmployeeStatusInDb(deactivatingEmployee.id, targetStatus);
      setDeactivatingEmployee(null);
      await loadDatabaseData();
    }
  };

  const activeCount = companyLimit ? companyLimit.activeCount : employees.filter(e => e.status === 'active').length;
  const maxLimit = companyLimit?.maxEmployees || 100;
  const isAtLimit = !user?.isSuperAdmin && activeCount >= maxLimit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Employee Limit Banner when reached */}
      {isAtLimit && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Your employee limit has been reached. Please contact the Super Admin to increase your employee limit.
            </span>
          </div>
          <Badge variant="error">
            Capacity: {activeCount} / {maxLimit}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-subtitle">
            Workforce Management Directory • {employees.length} active records
            {companyLimit && (
              <span style={{ marginLeft: '8px', color: isAtLimit ? 'var(--error-text)' : 'var(--text-muted)' }}>
                (Capacity: <strong>{activeCount}</strong> / <strong>{maxLimit}</strong>)
              </span>
            )}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" size="sm" onClick={loadDatabaseData} title="Refresh Employee Directory">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </Button>
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
          <Button
            variant="primary"
            icon={<UserPlus size={16} />}
            onClick={() => {
              if (isAtLimit) {
                alert('Your employee limit has been reached. Please contact the Super Admin to increase your employee limit.');
                return;
              }
              setIsAddModalOpen(true);
            }}
            disabled={isAtLimit}
            title={isAtLimit ? 'Your employee limit has been reached. Please contact the Super Admin to increase your employee limit.' : 'Add new employee'}
          >
            + Add Employee
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card padding="1rem">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <SearchInput
            placeholder="Search by name, ID, or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            onClear={() => setSearch('')}
          />
          <Select
            placeholder="All Departments"
            options={[
              { value: '', label: 'All Departments' },
              ...departments.map(d => ({ value: d.name, label: d.name }))
            ]}
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); setCurrentPage(1); }}
          />
          <Select
            placeholder="All Statuses"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' }
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
                <Th>Employee Name</Th>
                <Th>Employee ID</Th>
                <Th>Department & Designation</Th>
                <Th>Role</Th>
                <Th>Joining Date</Th>
                <Th>Status</Th>
                <Th style={{ textAlign: 'right' }}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedEmployees.length === 0 ? (
                <Tr>
                  <Td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading employee records...' : 'No matching employee records found.'}
                  </Td>
                </Tr>
              ) : (
                paginatedEmployees.map(emp => (
                  <Tr key={emp.id}>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Avatar name={emp.fullName} src={emp.profilePhoto} size="md" />
                        <div>
                          <div
                            style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                            onClick={() => navigate(`/employees/${emp.id}`)}
                          >
                            {emp.fullName}
                          </div>
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                            {emp.email}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.employeeId}</span>
                    </Td>
                    <Td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{emp.departmentName || 'General'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.designation || 'Employee'}</div>
                      </div>
                    </Td>
                    <Td>
                      <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 500 }}>{emp.role}</span>
                    </Td>
                    <Td>{emp.joiningDate || '—'}</Td>
                    <Td>
                      <Badge
                        variant={
                          emp.status === 'active'
                            ? 'success'
                            : emp.status === 'suspended'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {emp.status ? emp.status.toUpperCase() : 'ACTIVE'}
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
                            label: 'View Employee Profile',
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
                            id: 'status',
                            label: emp.status === 'active' ? 'Deactivate (Soft Delete)' : 'Reactivate Account',
                            icon: <UserX size={14} />,
                            danger: emp.status === 'active',
                            onClick: () => setDeactivatingEmployee(emp)
                          }
                        ]}
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={employees.length}
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
                <Avatar name={emp.fullName} src={emp.profilePhoto} size="lg" />
                <div>
                  <h3
                    style={{ fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                  >
                    {emp.fullName}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.designation || 'Employee'}</p>
                  <Badge variant={emp.status === 'active' ? 'success' : 'neutral'}>{emp.status ? emp.status.toUpperCase() : 'ACTIVE'}</Badge>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>ID:</strong> {emp.employeeId}</div>
                <div><strong>Department:</strong> {emp.departmentName || 'General'}</div>
                <div><strong>Role:</strong> {emp.role}</div>
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

      {/* Confirm Status Toggle Dialog */}
      <ConfirmDialog
        isOpen={!!deactivatingEmployee}
        onClose={() => setDeactivatingEmployee(null)}
        onConfirm={handleDeactivateEmployee}
        title={deactivatingEmployee?.status === 'active' ? 'Deactivate Employee Account' : 'Reactivate Employee Account'}
        message={`Are you sure you want to ${deactivatingEmployee?.status === 'active' ? 'deactivate' : 'reactivate'} ${deactivatingEmployee?.fullName} (${deactivatingEmployee?.employeeId})? Historical attendance and leave records will be safely preserved.`}
        confirmText={deactivatingEmployee?.status === 'active' ? 'Deactivate Account' : 'Reactivate Account'}
      />
    </div>
  );
};

export default EmployeesPage;

