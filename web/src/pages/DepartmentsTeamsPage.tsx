import React, { useState, useEffect } from 'react';
import {
  fetchDepartmentsFromDb,
  createDepartmentInDb,
  updateDepartmentInDb,
  deleteDepartmentInDb,
  fetchTeamsFromDb,
  createTeamInDb,
  updateTeamInDb,
  deleteTeamInDb,
  fetchTeamMembersFromDb,
  DepartmentRecord,
  TeamRecord,
  TeamMemberRecord,
} from '../services/departmentApi';
import { Button, Card, CardHeader, CardTitle, CardBody, Badge, Modal, Input, Select, Tabs, Alert, Avatar } from '../components/ui';
import { Building2, Users2, Plus, Pencil, Trash2, Users } from 'lucide-react';

export const DepartmentsTeamsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [addTeamOpen, setAddTeamOpen] = useState(false);

  const [editDeptOpen, setEditDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);

  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRecord | null>(null);

  // Team Members Modal
  const [teamMembersModalOpen, setTeamMembersModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [deptForm, setDeptForm] = useState({ name: '', code: '', headName: '', description: '' });
  const [teamForm, setTeamForm] = useState({ name: '', departmentId: '', leaderName: '' });

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptData, teamData] = await Promise.all([
        fetchDepartmentsFromDb(),
        fetchTeamsFromDb(),
      ]);
      setDepartments(deptData);
      setTeams(teamData);
      if (deptData.length > 0 && !teamForm.departmentId) {
        setTeamForm(prev => ({ ...prev, departmentId: deptData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load departments and teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Add Department to DB
  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createDepartmentInDb({
      name: deptForm.name,
      code: deptForm.code,
      headName: deptForm.headName,
      description: deptForm.description,
    });

    if (res.success) {
      setAddDeptOpen(false);
      setDeptForm({ name: '', code: '', headName: '', description: '' });
      showToast('success', res.message || `Department "${deptForm.name}" created in database!`);
      await loadData();
    } else {
      showToast('error', res.error || 'Failed to create department.');
    }
  };

  // Open Edit Department Modal
  const openEditDept = (dept: DepartmentRecord) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      headName: dept.headName || '',
      description: dept.description || '',
    });
    setEditDeptOpen(true);
  };

  // Save Edit Department to DB
  const handleSaveEditDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;

    const res = await updateDepartmentInDb(editingDept.id, {
      name: deptForm.name,
      code: deptForm.code,
      headName: deptForm.headName,
      description: deptForm.description,
    });

    if (res.success) {
      setEditDeptOpen(false);
      setEditingDept(null);
      showToast('success', res.message || `Department "${deptForm.name}" updated in database!`);
      await loadData();
    } else {
      showToast('error', res.error || 'Failed to update department.');
    }
  };

  // Delete Department from DB
  const handleDeleteDept = async (id: string, name: string) => {
    const res = await deleteDepartmentInDb(id);
    if (res.success) {
      showToast('success', res.message || `Department "${name}" deleted from database.`);
      await loadData();
    } else {
      showToast('error', res.error || 'Failed to delete department.');
    }
  };

  // Add Team to DB
  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createTeamInDb({
      name: teamForm.name,
      departmentId: teamForm.departmentId,
      leaderName: teamForm.leaderName,
    });

    if (res.success) {
      setAddTeamOpen(false);
      setTeamForm({ name: '', departmentId: departments[0]?.id || '', leaderName: '' });
      showToast('success', res.message || `Team "${teamForm.name}" created in database!`);
      await loadData();
    } else {
      showToast('error', res.error || 'Failed to create team.');
    }
  };

  // Open Edit Team Modal
  const openEditTeam = (team: TeamRecord) => {
    setEditingTeam(team);
    setTeamForm({
      name: team.name,
      departmentId: team.departmentId,
      leaderName: team.leaderName || '',
    });
    setEditTeamOpen(true);
  };

  // Save Edit Team to DB
  const handleSaveEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    const res = await updateTeamInDb(editingTeam.id, {
      name: teamForm.name,
      departmentId: teamForm.departmentId,
      leaderName: teamForm.leaderName,
    });

    if (res.success) {
      setEditTeamOpen(false);
      setEditingTeam(null);
      showToast('success', res.message || `Team "${teamForm.name}" updated in database!`);
      await loadData();
    } else {
      showToast('error', res.error || 'Failed to update team.');
    }
  };

  // Delete Team from DB
  const handleDeleteTeam = async (id: string, name: string) => {
    const res = await deleteTeamInDb(id);
    if (res.success) {
      showToast('success', res.message || `Team "${name}" deleted from database.`);
      await loadData();
    } else {
      showToast('error', res.error || 'Failed to delete team.');
    }
  };

  // Open View Team Members Modal
  const openTeamMembersModal = async (team: TeamRecord) => {
    setSelectedTeam(team);
    setTeamMembersModalOpen(true);
    setLoadingMembers(true);
    const members = await fetchTeamMembersFromDb(team.id);
    setTeamMembers(members);
    setLoadingMembers(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Organization Structure</h1>
          <p className="page-subtitle">
            Company → Departments → Teams Hierarchy Setup & Live Database Management
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

      {toastMsg && (
        <Alert variant={toastMsg.type} title="System Notification">
          {toastMsg.text}
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: 'departments', label: `Departments (${departments.length})`, icon: <Building2 size={16} /> },
          { id: 'teams', label: `Teams (${teams.length})`, icon: <Users2 size={16} /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading live organization data...
        </div>
      ) : activeTab === 'departments' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {departments.map((dept) => (
            <Card key={dept.id}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-500)',
                    }}
                  >
                    <Building2 size={20} />
                  </div>
                  <div>
                    <CardTitle>{dept.name}</CardTitle>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {dept.code}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Badge variant="info">{dept.employeeCount || 0} Members</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Pencil size={14} />}
                    onClick={() => openEditDept(dept)}
                    title="Edit Department"
                    aria-label="Edit Department"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={14} color="var(--error-text)" />}
                    onClick={() => handleDeleteDept(dept.id, dept.name)}
                    title="Delete Department"
                    aria-label="Delete Department"
                  />
                </div>
              </CardHeader>
              <CardBody>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {dept.description || 'No description added for this department.'}
                </p>
                <div
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '0.75rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    Department Head: <strong style={{ color: 'var(--text-primary)' }}>{dept.headName || 'Not Assigned'}</strong>
                  </span>
                  <span>{dept.teamsCount || 0} Teams</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--info-text)',
                    }}
                  >
                    <Users2 size={20} />
                  </div>
                  <div>
                    <CardTitle>{team.name}</CardTitle>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.departmentName}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Users size={14} />}
                    onClick={() => openTeamMembersModal(team)}
                    title="View Team Members"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                  >
                    Members ({team.memberCount || 0})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Pencil size={14} />}
                    onClick={() => openEditTeam(team)}
                    title="Edit Team"
                    aria-label="Edit Team"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={14} color="var(--error-text)" />}
                    onClick={() => handleDeleteTeam(team.id, team.name)}
                    title="Delete Team"
                    aria-label="Delete Team"
                  />
                </div>
              </CardHeader>
              <CardBody>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Team Leader: <strong style={{ color: 'var(--text-primary)' }}>{team.leaderName || 'Not Assigned'}</strong>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Add Department Modal */}
      <Modal isOpen={addDeptOpen} onClose={() => setAddDeptOpen(false)} title="Create New Department">
        <form onSubmit={handleAddDept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Department Name *"
            required
            value={deptForm.name}
            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
            placeholder="e.g. Quality Assurance"
          />
          <Input
            label="Department Code *"
            required
            value={deptForm.code}
            onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
            placeholder="e.g. QA"
          />
          <Input
            label="Department Head Name *"
            required
            value={deptForm.headName}
            onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
            placeholder="e.g. Rohan Mehta"
          />
          <Input
            label="Description"
            value={deptForm.description}
            onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setAddDeptOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Department (Save DB)
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Department Modal */}
      <Modal isOpen={editDeptOpen} onClose={() => setEditDeptOpen(false)} title={`Edit Department: ${editingDept?.name || ''}`}>
        <form onSubmit={handleSaveEditDept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Department Name *"
            required
            value={deptForm.name}
            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
          />
          <Input
            label="Department Code *"
            required
            value={deptForm.code}
            onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
          />
          <Input
            label="Department Head Name *"
            required
            value={deptForm.headName}
            onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
          />
          <Input
            label="Description"
            value={deptForm.description}
            onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setEditDeptOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Department Changes (Update DB)
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Team Modal */}
      <Modal isOpen={addTeamOpen} onClose={() => setAddTeamOpen(false)} title="Create New Team">
        <form onSubmit={handleAddTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select
            label="Parent Department *"
            required
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={teamForm.departmentId}
            onChange={(e) => setTeamForm({ ...teamForm, departmentId: e.target.value })}
          />
          <Input
            label="Team Name *"
            required
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
            placeholder="e.g. Automation QA"
          />
          <Input
            label="Team Leader Name *"
            required
            value={teamForm.leaderName}
            onChange={(e) => setTeamForm({ ...teamForm, leaderName: e.target.value })}
            placeholder="e.g. Ananya Iyer"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setAddTeamOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Team (Save DB)
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal isOpen={editTeamOpen} onClose={() => setEditTeamOpen(false)} title={`Edit Team: ${editingTeam?.name || ''}`}>
        <form onSubmit={handleSaveEditTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select
            label="Parent Department *"
            required
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={teamForm.departmentId}
            onChange={(e) => setTeamForm({ ...teamForm, departmentId: e.target.value })}
          />
          <Input
            label="Team Name *"
            required
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
          />
          <Input
            label="Team Leader Name *"
            required
            value={teamForm.leaderName}
            onChange={(e) => setTeamForm({ ...teamForm, leaderName: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setEditTeamOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Team Changes (Update DB)
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Team Members Modal */}
      <Modal
        isOpen={teamMembersModalOpen}
        onClose={() => setTeamMembersModalOpen(false)}
        title={`Team Members: ${selectedTeam?.name || ''} (${selectedTeam?.departmentName || ''})`}
        maxWidth="600px"
      >
        <div>
          <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Leader: <strong style={{ color: 'var(--text-primary)' }}>{selectedTeam?.leaderName || 'Not Assigned'}</strong>
          </div>

          {loadingMembers ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Fetching team members...
            </div>
          ) : teamMembers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No employees assigned to this team/department yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Avatar name={member.fullName} src={member.profilePhoto} size="md" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {member.fullName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({member.employeeId})</span>
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        {member.designation || 'Team Member'} • {member.email}
                      </div>
                    </div>
                  </div>
                  <Badge variant="success">Active Member</Badge>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <Button variant="outline" onClick={() => setTeamMembersModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepartmentsTeamsPage;
