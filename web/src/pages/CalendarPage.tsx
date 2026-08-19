import React, { useState, useEffect } from 'react';
import {
  fetchCalendarEventsFromDb,
  createCalendarEventInDb,
  CalendarEventRecord,
} from '../services/calendarApi';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@hrms/shared';
import { Button, Card, CardHeader, CardTitle, CardBody, Badge, Modal, Input, Select, Alert, Avatar } from '../components/ui';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, PartyPopper, Palmtree, Cake, Sparkles, MapPin, Clock, ArrowUpRight } from 'lucide-react';

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

  // Monthly stats
  const birthdayCount = upcomingMonthEvents.filter(e => e.type === 'BIRTHDAY').length;
  const festivalCount = upcomingMonthEvents.filter(e => e.type === 'FESTIVAL').length;
  const leaveCount = upcomingMonthEvents.filter(e => e.type === 'LEAVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Animated Hero Header Banner */}
      <div className="calendar-hero-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Sparkles size={22} color="var(--primary-400)" />
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.65rem' }}>
              Company Interactive Calendar
            </h1>
          </div>
          <p className="page-subtitle" style={{ margin: 0, opacity: 0.9 }}>
            Live database tracking for team birthdays 🎂, festive holidays 🌴, employee leaves 🏖️, and events
          </p>
        </div>

        {/* Quick Month Stat Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cake size={18} color="#c084fc" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e9d5ff' }}>{birthdayCount} Birthdays</span>
          </div>

          <div style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PartyPopper size={18} color="#4ade80" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#bbf7d0' }}>{festivalCount} Festivals</span>
          </div>

          <div style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palmtree size={18} color="#fbbf24" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fef08a' }}>{leaveCount} Approved Leaves</span>
          </div>

          {isAdminOrEmployer && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAddEventOpen(true)} style={{ marginLeft: '0.5rem' }}>
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

      {/* Calendar Controls & Filter Pills */}
      <Card padding="1rem">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button variant="outline" size="sm" icon={<ChevronLeft size={16} />} onClick={handlePrevMonth} title="Previous Month" />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, minWidth: '200px', textAlign: 'center', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {monthNames[month]} {year}
            </h2>
            <Button variant="outline" size="sm" icon={<ChevronRight size={16} />} onClick={handleNextMonth} title="Next Month" />
            <Button variant="secondary" size="sm" onClick={handleToday} style={{ marginLeft: '0.5rem', fontWeight: 700 }}>
              Today
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant={filterType === 'ALL' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilterType('ALL')}
            >
              ✨ All ({upcomingMonthEvents.length})
            </Button>
            <Button
              variant={filterType === 'BIRTHDAY' ? 'primary' : 'outline'}
              size="sm"
              icon={<Cake size={14} />}
              onClick={() => setFilterType('BIRTHDAY')}
            >
              🎂 Birthdays
            </Button>
            <Button
              variant={filterType === 'FESTIVAL' ? 'primary' : 'outline'}
              size="sm"
              icon={<PartyPopper size={14} />}
              onClick={() => setFilterType('FESTIVAL')}
            >
              🌴 Festivals & Holidays
            </Button>
            <Button
              variant={filterType === 'LEAVE' ? 'primary' : 'outline'}
              size="sm"
              icon={<Palmtree size={14} />}
              onClick={() => setFilterType('LEAVE')}
            >
              🏖️ Approved Leaves
            </Button>
            <Button
              variant={filterType === 'EVENT' ? 'primary' : 'outline'}
              size="sm"
              icon={<CalendarIcon size={14} />}
              onClick={() => setFilterType('EVENT')}
            >
              📌 Company Events
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Calendar Grid & Right Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Calendar Grid Container */}
        <Card style={{ padding: '1.25rem' }}>
          {loading ? (
            <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Sparkles size={32} style={{ animation: 'birthdayBounce 1s infinite', marginBottom: '1rem', color: 'var(--primary-400)' }} />
              <div>Fetching live database events, birthdays & leaves...</div>
            </div>
          ) : (
            <div>
              {/* Styled Weekday Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px', textAlign: 'center' }}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, index) => (
                  <div
                    key={d}
                    style={{
                      padding: '0.5rem 0',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      fontSize: '0.775rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      color: index === 0 || index === 6 ? 'var(--warning-text)' : 'var(--text-secondary)',
                      borderBottom: '2px solid var(--border-color)',
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {/* Empty Padding Cells */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: '110px', opacity: 0.15, borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }} />
                ))}

                {/* Days of Current Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayEvents = getEventsForDay(dayNum);
                  const isToday = year === 2026 && month === 7 && dayNum === 19; // 2026-08-19 system time

                  return (
                    <div
                      key={`day-${dayNum}`}
                      className={`calendar-cell-card ${isToday ? 'calendar-today-glow' : ''}`}
                      style={{
                        minHeight: '115px',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-lg)',
                        border: isToday ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        animationDelay: `${i * 0.015}s`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontWeight: isToday ? 900 : 700,
                            fontSize: '0.875rem',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isToday ? 'var(--primary-500)' : 'transparent',
                            color: isToday ? '#fff' : 'var(--text-primary)',
                            boxShadow: isToday ? '0 0 10px rgba(99, 102, 241, 0.6)' : 'none',
                          }}
                        >
                          {dayNum}
                        </span>

                        {dayEvents.length > 0 && (
                          <span style={{ fontSize: '0.675rem', fontWeight: 800, padding: '1px 6px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-400)' }}>
                            {dayEvents.length} event(s)
                          </span>
                        )}
                      </div>

                      {/* Event Badges inside Cell */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '80px', paddingRight: '2px' }}>
                        {dayEvents.map((evt) => {
                          const pillClass =
                            evt.type === 'BIRTHDAY'
                              ? 'event-pill-birthday'
                              : evt.type === 'FESTIVAL'
                              ? 'event-pill-festival'
                              : evt.type === 'LEAVE'
                              ? 'event-pill-leave'
                              : 'event-pill-company';

                          return (
                            <div
                              key={evt.id}
                              className={pillClass}
                              onClick={() => setSelectedEvent(evt)}
                              style={{
                                padding: '3px 7px',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title={evt.title}
                            >
                              <span>{evt.title}</span>
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

        {/* Right Sidebar: Upcoming Events Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card>
            <CardHeader style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--primary-400)" />
                Upcoming in {monthNames[month]} ({upcomingMonthEvents.length})
              </CardTitle>
            </CardHeader>
            <CardBody style={{ paddingTop: '1rem' }}>
              {upcomingMonthEvents.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Sparkles size={24} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>No events scheduled for {monthNames[month]}.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '580px', overflowY: 'auto', paddingRight: '4px' }}>
                  {upcomingMonthEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--bg-surface-hover)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
                        e.currentTarget.style.borderColor = 'var(--primary-400)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      {evt.type === 'BIRTHDAY' ? (
                        <Avatar name={evt.employeeName || evt.title} src={evt.profilePhoto} size="md" />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: evt.type === 'FESTIVAL' ? 'rgba(34, 197, 94, 0.18)' : 'rgba(59, 130, 246, 0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: evt.type === 'FESTIVAL' ? '#4ade80' : '#818cf8',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                          }}
                        >
                          {evt.type === 'FESTIVAL' ? <PartyPopper size={20} /> : <CalendarIcon size={20} />}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {evt.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          📅 {evt.date} {evt.location ? `• 📍 ${evt.location}` : ''}
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
                    width: '52px',
                    height: '52px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: selectedEvent.type === 'FESTIVAL' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: selectedEvent.type === 'FESTIVAL' ? '#4ade80' : '#818cf8',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {selectedEvent.type === 'FESTIVAL' ? <PartyPopper size={26} /> : <CalendarIcon size={26} />}
                </div>
              )}
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
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
                  style={{ marginTop: '0.35rem' }}
                >
                  {selectedEvent.type}
                </Badge>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem', backgroundColor: 'var(--bg-surface-hover)', padding: '1.15rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
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
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', marginTop: '0.35rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
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
