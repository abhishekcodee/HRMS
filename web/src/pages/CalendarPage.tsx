import React, { useState, useEffect } from 'react';
import {
  fetchCalendarEventsFromDb,
  createCalendarEventInDb,
  CalendarEventRecord,
} from '../services/calendarApi';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@hrms/shared';
import { Button, Card, CardHeader, CardTitle, CardBody, Badge, Modal, Input, Select, Alert, Avatar } from '../components/ui';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, PartyPopper, Palmtree, Cake, MapPin, Info } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { activeRoleView } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // Default August 2026
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Add Event Modal
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    type: 'FESTIVAL' as 'FESTIVAL' | 'EVENT',
    date: '2026-08-25',
    description: '',
    location: '',
  });

  // Event Detail Modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRecord | null>(null);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const data = await fetchCalendarEventsFromDb(year);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate.getFullYear()]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 7, 19)); // Current time in system 2026-08-19
  };

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createCalendarEventInDb(addForm);
    if (res.success) {
      setAddEventOpen(false);
      setAddForm({ title: '', type: 'FESTIVAL', date: '2026-08-25', description: '', location: '' });
      showToast('success', 'Event added successfully to company calendar!');
      await loadEvents();
    } else {
      showToast('error', res.error || 'Failed to add event.');
    }
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (filterType === 'ALL') return true;
    return e.type === filterType;
  });

  // Get events for a specific day formatted as YYYY-MM-DD
  const getEventsForDay = (dayNumber: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNumber).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    return filteredEvents.filter((e) => e.date === dateStr);
  };

  const isAdminOrEmployer = activeRoleView === UserRole.ADMIN || activeRoleView === UserRole.EMPLOYER;

  // Upcoming events in current month
  const upcomingMonthEvents = filteredEvents.filter((e) => {
    if (!e.date) return false;
    const parts = e.date.split('-');
    if (parts.length < 2) return false;
    return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month + 1;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Calendar & Events</h1>
          <p className="page-subtitle">
            Track employee birthdays, festival holidays, approved leaves, and company events
          </p>
        </div>
        <div className="page-actions">
          {isAdminOrEmployer && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAddEventOpen(true)}>
              + Add Event / Holiday
            </Button>
          )}
        </div>
      </div>

      {toastMsg && (
        <Alert variant={toastMsg.type} title="System Notification">
          {toastMsg.text}
        </Alert>
      )}

      {/* Calendar Controls & Filters */}
      <Card padding="1rem">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button variant="outline" size="sm" icon={<ChevronLeft size={16} />} onClick={handlePrevMonth} title="Previous Month" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, minWidth: '180px', textAlign: 'center', color: 'var(--text-primary)' }}>
              {monthNames[month]} {year}
            </h2>
            <Button variant="outline" size="sm" icon={<ChevronRight size={16} />} onClick={handleNextMonth} title="Next Month" />
            <Button variant="secondary" size="sm" onClick={handleToday} style={{ marginLeft: '0.5rem' }}>
              Today
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant={filterType === 'ALL' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilterType('ALL')}
            >
              All Events
            </Button>
            <Button
              variant={filterType === 'BIRTHDAY' ? 'primary' : 'outline'}
              size="sm"
              icon={<Cake size={14} />}
              onClick={() => setFilterType('BIRTHDAY')}
            >
              Birthdays
            </Button>
            <Button
              variant={filterType === 'FESTIVAL' ? 'primary' : 'outline'}
              size="sm"
              icon={<PartyPopper size={14} />}
              onClick={() => setFilterType('FESTIVAL')}
            >
              Festivals
            </Button>
            <Button
              variant={filterType === 'LEAVE' ? 'primary' : 'outline'}
              size="sm"
              icon={<Palmtree size={14} />}
              onClick={() => setFilterType('LEAVE')}
            >
              Leaves
            </Button>
            <Button
              variant={filterType === 'EVENT' ? 'primary' : 'outline'}
              size="sm"
              icon={<CalendarIcon size={14} />}
              onClick={() => setFilterType('EVENT')}
            >
              Company Events
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Grid & Side Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        {/* Calendar Grid */}
        <Card style={{ padding: '1rem' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading company events & birthdays from database...
            </div>
          ) : (
            <div>
              {/* Day Name Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>SUN</span>
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>

              {/* Day Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {/* Empty Cells for padding start of month */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: '95px', backgroundColor: 'transparent', borderRadius: 'var(--radius-md)' }} />
                ))}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayEvents = getEventsForDay(dayNum);
                  const isToday = year === 2026 && month === 7 && dayNum === 19;

                  return (
                    <div
                      key={`day-${dayNum}`}
                      style={{
                        minHeight: '100px',
                        padding: '0.4rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isToday ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface-hover)',
                        border: isToday ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontWeight: isToday ? 800 : 600,
                            fontSize: '0.85rem',
                            color: isToday ? 'var(--primary-500)' : 'var(--text-primary)',
                            backgroundColor: isToday ? 'var(--primary-500)' : 'transparent',
                            color: isToday ? '#fff' : 'inherit',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {dayNum}
                        </span>

                        {dayEvents.length > 0 && (
                          <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {dayEvents.length} event(s)
                          </span>
                        )}
                      </div>

                      {/* Event Badges in Day Cell */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', maxHeight: '70px' }}>
                        {dayEvents.map((evt) => {
                          const bg =
                            evt.type === 'BIRTHDAY'
                              ? 'rgba(168, 85, 247, 0.2)'
                              : evt.type === 'FESTIVAL'
                              ? 'rgba(34, 197, 94, 0.2)'
                              : evt.type === 'LEAVE'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(59, 130, 246, 0.2)';

                          const border =
                            evt.type === 'BIRTHDAY'
                              ? 'rgba(168, 85, 247, 0.4)'
                              : evt.type === 'FESTIVAL'
                              ? 'rgba(34, 197, 94, 0.4)'
                              : evt.type === 'LEAVE'
                              ? 'rgba(245, 158, 11, 0.4)'
                              : 'rgba(59, 130, 246, 0.4)';

                          return (
                            <div
                              key={evt.id}
                              onClick={() => setSelectedEvent(evt)}
                              style={{
                                padding: '2px 5px',
                                borderRadius: '4px',
                                backgroundColor: bg,
                                border: `1px solid ${border}`,
                                fontSize: '0.675rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer',
                              }}
                              title={evt.title}
                            >
                              {evt.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Right Sidebar: Upcoming Events & Birthdays List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>
                Upcoming in {monthNames[month]} ({upcomingMonthEvents.length})
              </CardTitle>
            </CardHeader>
            <CardBody>
              {upcomingMonthEvents.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  No upcoming events or holidays found for {monthNames[month]}.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto' }}>
                  {upcomingMonthEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface-hover)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                      }}
                    >
                      {evt.type === 'BIRTHDAY' ? (
                        <Avatar name={evt.employeeName || evt.title} src={evt.profilePhoto} size="md" />
                      ) : (
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: evt.type === 'FESTIVAL' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: evt.type === 'FESTIVAL' ? 'var(--success-text)' : 'var(--info-text)',
                          }}
                        >
                          {evt.type === 'FESTIVAL' ? <PartyPopper size={18} /> : <CalendarIcon size={18} />}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {evt.title}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          📅 {evt.date} {evt.location ? `• ${evt.location}` : ''}
                        </div>
                      </div>

                      <Badge
                        variant={
                          evt.type === 'BIRTHDAY'
                            ? 'info'
                            : evt.type === 'FESTIVAL'
                            ? 'success'
                            : evt.type === 'LEAVE'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {evt.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal isOpen={addEventOpen} onClose={() => setAddEventOpen(false)} title="Add Holiday / Company Event">
        <form onSubmit={handleAddEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Event / Holiday Title *"
            required
            value={addForm.title}
            onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
            placeholder="e.g. Independence Day Gala"
          />

          <Select
            label="Event Category *"
            required
            options={[
              { value: 'FESTIVAL', label: '🎉 Festival Public Holiday' },
              { value: 'EVENT', label: '📌 Company Event / Celebration' },
            ]}
            value={addForm.type}
            onChange={(e) => setAddForm({ ...addForm, type: e.target.value as any })}
          />

          <Input
            label="Date *"
            type="date"
            required
            value={addForm.date}
            onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
          />

          <Input
            label="Location"
            value={addForm.location}
            onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
            placeholder="e.g. All Branches / Grand Auditorium"
          />

          <Input
            label="Description"
            value={addForm.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
            placeholder="Details about the holiday or event..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setAddEventOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Event (Save DB)
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Event Details'}
        maxWidth="480px"
      >
        {selectedEvent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {selectedEvent.type === 'BIRTHDAY' ? (
                <Avatar name={selectedEvent.employeeName || selectedEvent.title} src={selectedEvent.profilePhoto} size="xl" />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: selectedEvent.type === 'FESTIVAL' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: selectedEvent.type === 'FESTIVAL' ? 'var(--success-text)' : 'var(--info-text)',
                  }}
                >
                  {selectedEvent.type === 'FESTIVAL' ? <PartyPopper size={24} /> : <CalendarIcon size={24} />}
                </div>
              )}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedEvent.title}
                </h3>
                <Badge
                  variant={
                    selectedEvent.type === 'BIRTHDAY'
                      ? 'info'
                      : selectedEvent.type === 'FESTIVAL'
                      ? 'success'
                      : selectedEvent.type === 'LEAVE'
                      ? 'warning'
                      : 'neutral'
                  }
                  style={{ marginTop: '0.25rem' }}
                >
                  {selectedEvent.type}
                </Badge>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--bg-surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong>📅 {selectedEvent.date}</strong>
                {selectedEvent.endDate ? ` to ${selectedEvent.endDate}` : ''}
              </div>
              {selectedEvent.location && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Location:</span> <strong>📍 {selectedEvent.location}</strong>
                </div>
              )}
              {selectedEvent.description && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                  {selectedEvent.description}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="primary" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CalendarPage;
