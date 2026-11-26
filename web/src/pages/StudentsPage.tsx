import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, Pencil, Trash2, Search, Users, CalendarClock, IndianRupee, BadgeCheck, Mail, Phone } from 'lucide-react';
import { Button, Input, Select, Modal, Badge, StatCard, EmptyState, ConfirmDialog, Alert } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import './StudentsPage.css';

/**
 * Students / interns register.
 * Front-end only for now: records are kept in this browser (per company) until a backend API exists.
 */

type StudentStatus = 'APPLIED' | 'ACTIVE' | 'COMPLETED' | 'DROPPED';

export interface StudentRecord {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  department: string;
  mentor: string;
  startDate: string;
  endDate: string;
  stipend: number;
  status: StudentStatus;
}

const STATUS_META: Record<StudentStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  APPLIED: { label: 'Applied', variant: 'info' },
  ACTIVE: { label: 'Active', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'neutral' },
  DROPPED: { label: 'Dropped', variant: 'error' },
};

const STATUS_OPTIONS = (Object.keys(STATUS_META) as StudentStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }));

const emptyForm = (): Omit<StudentRecord, 'id' | 'studentCode'> => ({
  fullName: '',
  email: '',
  phone: '',
  college: '',
  course: '',
  department: '',
  mentor: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  stipend: 0,
  status: 'ACTIVE',
});

const storageKey = (companyId?: string | null) => `hrms_students_${companyId || 'default'}`;

const loadStudents = (key: string): StudentRecord[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDate = (d: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatMoney = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

const daysUntil = (d: string) => {
  if (!d) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${d}T00:00:00`).getTime() - today.getTime()) / 86400000);
};

export const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const key = storageKey(user?.companyId);

  const [students, setStudents] = useState<StudentRecord[]>(() => loadStudents(key));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudentStatus>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<StudentRecord | null>(null);

  useEffect(() => {
    setStudents(loadStudents(key));
  }, [key]);

  const persist = (next: StudentRecord[]) => {
    setStudents(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable (private mode) — keep in memory */
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (!q) return true;
      return [s.fullName, s.studentCode, s.email, s.college, s.course, s.department, s.mentor]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [students, search, statusFilter]);

  const stats = useMemo(() => {
    const active = students.filter((s) => s.status === 'ACTIVE');
    return {
      total: students.length,
      active: active.length,
      endingSoon: active.filter((s) => {
        const d = daysUntil(s.endDate);
        return d >= 0 && d <= 30;
      }).length,
      stipend: active.reduce((sum, s) => sum + (Number(s.stipend) || 0), 0),
    };
  }, [students]);

  const nextCode = () => {
    const max = students.reduce((m, s) => Math.max(m, parseInt(s.studentCode.replace(/\D/g, ''), 10) || 0), 0);
    return `STU-${String(max + 1).padStart(4, '0')}`;
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (s: StudentRecord) => {
    setEditing(s);
    const { id: _id, studentCode: _code, ...rest } = s;
    setForm(rest);
    setErrors({});
    setFormOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid e-mail';
    if (!form.college.trim()) e.college = 'College / institute is required';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (form.endDate && form.startDate && form.endDate < form.startDate) e.endDate = 'End date is before the start date';
    if (form.stipend < 0) e.stipend = 'Stipend cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const clean = { ...form, fullName: form.fullName.trim(), email: form.email.trim(), stipend: Number(form.stipend) || 0 };
    if (editing) {
      persist(students.map((s) => (s.id === editing.id ? { ...editing, ...clean } : s)));
    } else {
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
      persist([{ id, studentCode: nextCode(), ...clean }, ...students]);
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (toDelete) persist(students.filter((s) => s.id !== toDelete.id));
    setToDelete(null);
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const actions = (s: StudentRecord) => (
    <div className="students-actions">
      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => openEdit(s)} aria-label={`Edit ${s.fullName}`}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setToDelete(s)} aria-label={`Delete ${s.fullName}`}>
        Delete
      </Button>
    </div>
  );

  return (
    <div className="students-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students &amp; Interns</h1>
          <p className="page-subtitle">Interns and trainees from colleges: mentor, internship period, stipend and status.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openAdd}>
          Add Student
        </Button>
      </div>

      <Alert variant="info">
        Preview: student records are saved in this browser only. They will move to the database once the Students API is added.
      </Alert>

      <div className="students-stats">
        <StatCard title="Total students" value={stats.total} icon={<Users size={20} />} subtext="All records" />
        <StatCard title="Active now" value={stats.active} icon={<BadgeCheck size={20} />} subtext="Currently interning" />
        <StatCard title="Ending in 30 days" value={stats.endingSoon} icon={<CalendarClock size={20} />} subtext="Plan certificates / offers" />
        <StatCard title="Monthly stipend" value={formatMoney(stats.stipend)} icon={<IndianRupee size={20} />} subtext="Active students" />
      </div>

      <div className="students-panel">
        <div className="students-toolbar">
          <div className="students-search">
            <Input
              placeholder="Search name, ID, college, course, mentor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={16} />}
              aria-label="Search students"
            />
          </div>
          <div className="students-filter">
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | StudentStatus)}
              options={[{ value: 'ALL', label: 'All statuses' }, ...STATUS_OPTIONS]}
            />
          </div>
        </div>

        {students.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={40} />}
            title="No students yet"
            description="Add your interns and trainees to track their college, mentor, internship period and stipend."
            actionLabel="Add Student"
            onAction={openAdd}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No matches" description="No student matches this search or status filter." />
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="students-table-wrap table-container">
              <table className="table students-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>College &amp; course</th>
                    <th>Department / mentor</th>
                    <th>Period</th>
                    <th>Stipend</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="students-name">{s.fullName}</div>
                        <div className="students-sub">{s.studentCode}{s.email ? ` · ${s.email}` : ''}</div>
                      </td>
                      <td>
                        <div>{s.college}</div>
                        <div className="students-sub">{s.course || '—'}</div>
                      </td>
                      <td>
                        <div>{s.department || '—'}</div>
                        <div className="students-sub">{s.mentor ? `Mentor: ${s.mentor}` : 'No mentor'}</div>
                      </td>
                      <td>
                        <div>{formatDate(s.startDate)}</div>
                        <div className="students-sub">to {formatDate(s.endDate)}</div>
                      </td>
                      <td>{formatMoney(s.stipend)}</td>
                      <td><Badge variant={STATUS_META[s.status].variant}>{STATUS_META[s.status].label}</Badge></td>
                      <td>{actions(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phone: cards */}
            <ul className="students-cards">
              {filtered.map((s) => (
                <li key={s.id} className="students-card">
                  <div className="students-card-top">
                    <div className="students-avatar" aria-hidden="true">
                      {s.fullName.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="students-card-title">
                      <div className="students-name">{s.fullName}</div>
                      <div className="students-sub">{s.studentCode}</div>
                    </div>
                    <Badge variant={STATUS_META[s.status].variant}>{STATUS_META[s.status].label}</Badge>
                  </div>
                  <dl className="students-card-grid">
                    <div><dt>College</dt><dd>{s.college}</dd></div>
                    <div><dt>Course</dt><dd>{s.course || '—'}</dd></div>
                    <div><dt>Department</dt><dd>{s.department || '—'}</dd></div>
                    <div><dt>Mentor</dt><dd>{s.mentor || '—'}</dd></div>
                    <div><dt>Period</dt><dd>{formatDate(s.startDate)} – {formatDate(s.endDate)}</dd></div>
                    <div><dt>Stipend</dt><dd>{formatMoney(s.stipend)} / month</dd></div>
                  </dl>
                  {(s.email || s.phone) && (
                    <div className="students-contact">
                      {s.email && <a href={`mailto:${s.email}`}><Mail size={14} /> {s.email}</a>}
                      {s.phone && <a href={`tel:${s.phone}`}><Phone size={14} /> {s.phone}</a>}
                    </div>
                  )}
                  {actions(s)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.fullName}` : 'Add Student'}
        maxWidth="720px"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save changes' : 'Add Student'}</Button>
          </>
        }
      >
        <div className="students-form">
          <Input label="Full name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} error={errors.fullName} placeholder="e.g. Riya Mehta" />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} placeholder="name@college.edu" />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          <Input label="College / institute" required value={form.college} onChange={(e) => set('college', e.target.value)} error={errors.college} placeholder="e.g. IIT Bombay" />
          <Input label="Course" value={form.course} onChange={(e) => set('course', e.target.value)} placeholder="e.g. B.Tech Computer Science, 3rd year" />
          <Input label="Department" value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Engineering" />
          <Input label="Mentor" value={form.mentor} onChange={(e) => set('mentor', e.target.value)} placeholder="Employee guiding the student" />
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value as StudentStatus)} options={STATUS_OPTIONS} />
          <Input label="Start date" type="date" required value={form.startDate} onChange={(e) => set('startDate', e.target.value)} error={errors.startDate} />
          <Input label="End date" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} error={errors.endDate} />
          <Input label="Monthly stipend (₹)" type="number" min={0} value={form.stipend} onChange={(e) => set('stipend', Number(e.target.value))} error={errors.stipend} />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete student"
        message={`Delete ${toDelete?.fullName ?? 'this student'}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default StudentsPage;
