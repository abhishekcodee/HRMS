import React, { useState } from 'react';
import { MOCK_DEPARTMENTS, MOCK_TEAMS, DepartmentMock, TeamMock } from '@hrms/shared';
import { Button, Card, CardHeader, CardTitle, CardBody, Badge, Modal, Input, Select, Tabs } from '../components/ui';
import { Building2, Users2, Plus, UserCheck } from 'lucide-react';

export const DepartmentsTeamsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState<DepartmentMock[]>(MOCK_DEPARTMENTS);
  const [teams, setTeams] = useState<TeamMock[]>(MOCK_TEAMS);

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [addTeamOpen, setAddTeamOpen] = useState(false);

  const [deptForm, setDeptForm] = useState({ name: '', code: '', headName: '', description: '' });
  const [teamForm, setTeamForm] = useState({ name: '', departmentId: MOCK_DEPARTMENTS[0].id, leaderName: '' });

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    const newDept: DepartmentMock = {
      id: `dept-${departments.length + 1}`,
      name: deptForm.name,
      code: deptForm.code.toUpperCase(),
      headName: deptForm.headName,
      employeeCount: 0,
      teamsCount: 0,
      description: deptForm.description
    };
    setDepartments([...departments, newDept]);
    setAddDeptOpen(false);
    setDeptForm({ name: '', code: '', headName: '', description: '' });
  };

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const dept = departments.find(d => d.id === teamForm.departmentId);
    const newTeam: TeamMock = {
      id: `team-${teams.length + 1}`,
      departmentId: teamForm.departmentId,
      departmentName: dept?.name || '',
      name: teamForm.name,
      leaderName: teamForm.leaderName,
      memberCount: 0
    };
    setTeams([...teams, newTeam]);
    setAddTeamOpen(false);
    setTeamForm({ name: '', departmentId: MOCK_DEPARTMENTS[0].id, leaderName: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Organization Structure</h1>
          <p className="page-subtitle">
            Company → Departments → Teams Hierarchy Setup
          </p>
        </div>
        <div className="page-actions">
          {activeTab === 'departments' ? (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAddDeptOpen(true)}>
              + Add Department
            </Button>
          ) : (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAddTeamOpen(true)}>
              + Add Team
            </Button>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'departments', label: `Departments (${departments.length})`, icon: <Building2 size={16} /> },
          { id: 'teams', label: `Teams (${teams.length})`, icon: <Users2 size={16} /> }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'departments' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {departments.map(dept => (
            <Card key={dept.id}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-500)' }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <CardTitle>{dept.name}</CardTitle>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{dept.code}</span>
                  </div>
                </div>
                <Badge variant="info">{dept.employeeCount} Members</Badge>
              </CardHeader>
              <CardBody>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{dept.description}</p>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Department Head: <strong style={{ color: 'var(--text-primary)' }}>{dept.headName}</strong></span>
                  <span>{dept.teamsCount} Teams</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {teams.map(team => (
            <Card key={team.id}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info-text)' }}>
                    <Users2 size={20} />
                  </div>
                  <div>
                    <CardTitle>{team.name}</CardTitle>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.departmentName}</span>
                  </div>
                </div>
                <Badge variant="neutral">{team.memberCount} Members</Badge>
              </CardHeader>
              <CardBody>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Team Leader: <strong style={{ color: 'var(--text-primary)' }}>{team.leaderName}</strong>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Add Department Modal */}
      <Modal isOpen={addDeptOpen} onClose={() => setAddDeptOpen(false)} title="Create New Department">
        <form onSubmit={handleAddDept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Department Name *" required value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. Quality Assurance" />
          <Input label="Department Code *" required value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="e.g. QA" />
          <Input label="Department Head Name *" required value={deptForm.headName} onChange={e => setDeptForm({ ...deptForm, headName: e.target.value })} placeholder="e.g. Rohan Mehta" />
          <Input label="Description" value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setAddDeptOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Department</Button>
          </div>
        </form>
      </Modal>

      {/* Add Team Modal */}
      <Modal isOpen={addTeamOpen} onClose={() => setAddTeamOpen(false)} title="Create New Team">
        <form onSubmit={handleAddTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select label="Parent Department *" required options={departments.map(d => ({ value: d.id, label: d.name }))} value={teamForm.departmentId} onChange={e => setTeamForm({ ...teamForm, departmentId: e.target.value })} />
          <Input label="Team Name *" required value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="e.g. Automation QA" />
          <Input label="Team Leader Name *" required value={teamForm.leaderName} onChange={e => setTeamForm({ ...teamForm, leaderName: e.target.value })} placeholder="e.g. Ananya Iyer" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setAddTeamOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Team</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentsTeamsPage;
