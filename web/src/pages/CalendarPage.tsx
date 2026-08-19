import React, { useState, useEffect } from 'react';
import {
  fetchCalendarEventsFromDb,
  createCalendarEventInDb,
  CalendarEventRecord,
} from '../services/calendarApi';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@hrms/shared';
import { Button, Card, CardHeader, CardTitle, CardBody, Badge, Modal, Input, Select, Alert, Avatar } from '../components/ui';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  PartyPopper,
  Palmtree,
  Cake,
  Sparkles,
  MapPin,
  Clock,
  LayoutGrid,
  List,
  CalendarDays,
  Search,
  ArrowRight,
} from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { activeRoleView } = useAuth();
  // Default to Year 2028 as requested!
  const [currentDate, setCurrentDate] = useState(new Date(2028, 0, 1));
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST' | 'YEAR'>('GRID');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Event Modal
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    type: 'FESTIVAL' as 'FESTIVAL' | 'EVENT',
    date: '2028-08-25',
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
      const targetYear = currentDate.getFullYear();
      const data = await fetchCalendarEventsFromDb(targetYear);
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
    setCurrentDate(new Date(2028, 0, 1)); // Default 2028
  };

  const handleYearChange = (newYear: number) => {
    setCurrentDate(new Date(newYear, month, 1));
  };

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createCalendarEventInDb(addForm);
    if (res.success) {
      setAddEventOpen(false);
      setAddForm({ title: '', type: 'FESTIVAL', date: `${year}-08-25`, description: '', location: '' });
      showToast('success', 'Event added successfully to company calendar!');
      await loadEvents();
    } else {
      showToast('error', res.error || 'Failed to add event.');
    }
  };

  // Rich Festival Visual & Gemini Generated Image Artwork Helper
  const getFestivalVisual = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('independence') || t.includes('republic')) {
      return {
        emoji: '🇮🇳',
        gradient: 'linear-gradient(135deg, rgba(255, 153, 51, 0.25) 0%, rgba(18, 136, 7, 0.25) 100%)',
        borderColor: 'rgba(255, 153, 51, 0.6)',
        color: '#ffaa44',
        tagLabel: 'National Holiday 🇮🇳',
        imageUrl: '/assets/festival_independence_day.jpg',
      };
    }
    if (t.includes('diwali') || t.includes('deepavali')) {
      return {
        emoji: '🪔',
        gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.3) 100%)',
        borderColor: 'rgba(245, 158, 11, 0.6)',
        color: '#fbbf24',
        tagLabel: 'Festival of Lights 🪔',
        imageUrl: '/assets/festival_diwali.jpg',
      };
    }
    if (t.includes('holi')) {
      return {
        emoji: '🎨',
        gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)',
        borderColor: 'rgba(236, 72, 153, 0.6)',
        color: '#f472b6',
        tagLabel: 'Festival of Colors 🎨',
        imageUrl: '/assets/festival_holi.jpg',
      };
    }
    if (t.includes('christmas')) {
      return {
        emoji: '🎄',
        gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(220, 38, 38, 0.3) 100%)',
        borderColor: 'rgba(34, 197, 94, 0.6)',
        color: '#4ade80',
        tagLabel: 'Christmas Festival 🎄',
        imageUrl: '/assets/festival_christmas.jpg',
      };
    }
    if (t.includes('new year')) {
      return {
        emoji: '🎆',
        gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)',
        borderColor: 'rgba(99, 102, 241, 0.6)',
        color: '#818cf8',
        tagLabel: 'New Year Celebration 🎆',
      };
    }
    if (t.includes('gandhi')) {
      return {
        emoji: '🕊️',
        gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.3) 100%)',
        borderColor: 'rgba(16, 185, 129, 0.6)',
        color: '#34d399',
        tagLabel: 'Gandhi Jayanti 🕊️',
      };
    }
    if (t.includes('raksha') || t.includes('rakhi')) {
      return {
        emoji: '🎗️',
        gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.3) 0%, rgba(251, 113, 133, 0.3) 100%)',
        borderColor: 'rgba(244, 63, 94, 0.6)',
        color: '#fb7185',
        tagLabel: 'Raksha Bandhan 🎗️',
      };
    }
    return {
      emoji: '🌴',
      gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)',
      borderColor: 'rgba(34, 197, 94, 0.5)',
      color: '#4ade80',
      tagLabel: 'Public Holiday 🌴',
    };
  };

  // Filter events by Category
  const categoryFilteredEvents = events.filter((e) => {
    if (filterType === 'ALL') return true;
    return e.type === filterType;
  });

  // Filter events by Search Query
  const filteredEvents = categoryFilteredEvents.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.employeeName && e.employeeName.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.location && e.location.toLowerCase().includes(q))
    );
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
  const birthdayCount = upcomingMonthEvents.filter((e) => e.type === 'BIRTHDAY').length;
  const festivalCount = upcomingMonthEvents.filter((e) => e.type === 'FESTIVAL').length;
  const leaveCount = upcomingMonthEvents.filter((e) => e.type === 'LEAVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Animated Hero Header Banner */}
      <div className="calendar-hero-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Sparkles size={22} color="var(--primary-400)" />
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.65rem' }}>
              Company Interactive Calendar ({year})
            </h1>
          </div>
          <p className="page-subtitle" style={{ margin: 0, opacity: 0.9 }}>
            Live database tracking for team birthdays 🎂, 2028 festive holidays 🇮🇳 🪔 🎨 🎄 🎆, employee leaves 🏖️, and events
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
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#bbf7d0' }}>{festivalCount} Festivals & Holidays</span>
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

      {/* Toolbar: Navigation, Year Selector, Layout View Switcher & Category Filters */}
      <Card padding="1rem">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Row 1: Month Nav, Year Selector & Layout Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Button variant="outline" size="sm" icon={<ChevronLeft size={16} />} onClick={handlePrevMonth} title="Previous Month" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, minWidth: '200px', textAlign: 'center', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {monthNames[month]} {year}
              </h2>
              <Button variant="outline" size="sm" icon={<ChevronRight size={16} />} onClick={handleNextMonth} title="Next Month" />
              
              {/* Year Selector Dropdown Pill */}
              <select
                value={year}
                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                className="select"
                style={{ width: 'auto', padding: '0.35rem 0.75rem', fontWeight: 800, fontSize: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-500)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                <option value={2026} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>2026 Calendar</option>
                <option value={2027} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>2027 Calendar</option>
                <option value={2028} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>2028 Calendar (Selected)</option>
                <option value={2029} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>2029 Calendar</option>
                <option value={2030} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>2030 Calendar</option>
              </select>

              <Button variant="secondary" size="sm" onClick={handleToday} style={{ fontWeight: 700 }}>
                Reset 2028
              </Button>
            </div>

            {/* Layout Alternate Style View Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--bg-surface-hover)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setViewMode('GRID')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'GRID' ? 'var(--primary-500)' : 'transparent',
                  color: viewMode === 'GRID' ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutGrid size={15} /> Month Grid
              </button>

              <button
                onClick={() => setViewMode('LIST')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'LIST' ? 'var(--primary-500)' : 'transparent',
                  color: viewMode === 'LIST' ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <List size={15} /> Timeline Agenda
              </button>

              <button
                onClick={() => setViewMode('YEAR')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'YEAR' ? 'var(--primary-500)' : 'transparent',
                  color: viewMode === 'YEAR' ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <CalendarDays size={15} /> 12-Month Year View
              </button>
            </div>
          </div>

          {/* Row 2: Category Filter Buttons & Live Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <Button
                variant={filterType === 'ALL' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterType('ALL')}
              >
                ✨ All ({events.length})
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

            {/* Event Live Search Input */}
            <div style={{ minWidth: '260px', position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search event, holiday, or employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: '32px', fontSize: '0.825rem' }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Main View Container */}
      {viewMode === 'GRID' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
          {/* Calendar Month Grid */}
          <Card style={{ padding: '1.25rem' }}>
            {loading ? (
              <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Sparkles size={32} style={{ animation: 'birthdayBounce 1s infinite', marginBottom: '1rem', color: 'var(--primary-400)' }} />
                <div>Fetching live database events, birthdays & leaves for {year}...</div>
              </div>
            ) : (
              <div>
                {/* Weekday Header */}
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
                  {/* Empty Start Padding */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ minHeight: '130px', opacity: 0.15, borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }} />
                  ))}

                  {/* Month Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dayEvents = getEventsForDay(dayNum);
                    const dayOfWeek = (firstDayOfWeek + i) % 7;
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isToday = year === 2028 && month === 0 && dayNum === 1;

                    return (
                      <div
                        key={`day-${dayNum}`}
                        className={`calendar-cell-card ${isToday ? 'calendar-today-glow' : ''} ${isWeekend ? 'weekend-cell-highlight' : ''}`}
                        style={{
                          minHeight: '130px',
                          padding: '0.6rem',
                          borderRadius: 'var(--radius-lg)',
                          border: isToday ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
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

                        {/* Event Badges inside Day Cell (FULL TEXT, NO CUTOFF!) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', overflowY: 'auto', maxHeight: '100px', paddingRight: '2px' }}>
                          {dayEvents.map((evt) => {
                            const festVisual = evt.type === 'FESTIVAL' ? getFestivalVisual(evt.title) : null;
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
                                  padding: '4px 7px',
                                  borderRadius: '6px',
                                  fontSize: '0.725rem',
                                  fontWeight: 700,
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.3,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: festVisual ? festVisual.gradient : undefined,
                                  borderColor: festVisual ? festVisual.borderColor : undefined,
                                }}
                                title={evt.title}
                              >
                                {evt.type === 'BIRTHDAY' && evt.employeeName && (
                                  <Avatar name={evt.employeeName} src={evt.profilePhoto} size="xs" />
                                )}

                                {evt.type === 'FESTIVAL' && festVisual && (
                                  <span style={{ fontSize: '0.9rem' }}>{festVisual.emoji}</span>
                                )}

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

          {/* Right Sidebar: Upcoming Events with Images */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Card>
              <CardHeader style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} color="var(--primary-400)" />
                  Upcoming in {monthNames[month]} {year} ({upcomingMonthEvents.length})
                </CardTitle>
              </CardHeader>
              <CardBody style={{ paddingTop: '1rem' }}>
                {upcomingMonthEvents.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Sparkles size={24} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>No events found for {monthNames[month]} {year}.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                    {upcomingMonthEvents.map((evt) => {
                      const festVisual = evt.type === 'FESTIVAL' ? getFestivalVisual(evt.title) : null;

                      return (
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
                          ) : festVisual?.imageUrl ? (
                            <img
                              src={festVisual.imageUrl}
                              alt={evt.title}
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: 'var(--radius-md)',
                                objectFit: 'cover',
                                border: `1px solid ${festVisual.borderColor}`,
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: 'var(--radius-lg)',
                                background: festVisual ? festVisual.gradient : 'rgba(59, 130, 246, 0.18)',
                                border: festVisual ? `1px solid ${festVisual.borderColor}` : '1px solid rgba(59, 130, 246, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: festVisual ? '1.3rem' : '1.1rem',
                                color: evt.type === 'FESTIVAL' ? '#4ade80' : '#818cf8',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                flexShrink: 0,
                              }}
                            >
                              {festVisual ? festVisual.emoji : <CalendarIcon size={20} />}
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                              {evt.title}
                            </div>
                            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.3 }}>
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
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Alternate View Mode 2: Timeline Agenda View */}
      {viewMode === 'LIST' && (
        <Card style={{ padding: '1.5rem' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <List size={20} color="var(--primary-400)" />
              Timeline Agenda Schedule — {monthNames[month]} {year} ({filteredEvents.length} total events)
            </CardTitle>
          </CardHeader>
          <CardBody>
            {filteredEvents.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No events or holidays matching search criteria for {year}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredEvents.map((evt) => {
                  const festVisual = evt.type === 'FESTIVAL' ? getFestivalVisual(evt.title) : null;

                  return (
                    <div
                      key={evt.id}
                      className="calendar-timeline-item"
                      onClick={() => setSelectedEvent(evt)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Date Block */}
                      <div
                        style={{
                          padding: '0.65rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(99, 102, 241, 0.12)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          textAlign: 'center',
                          minWidth: '110px',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-400)', textTransform: 'uppercase' }}>
                          {evt.date}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {evt.endDate ? `to ${evt.endDate}` : 'Single Day'}
                        </div>
                      </div>

                      {/* Festival Image / Icon Avatar */}
                      {evt.type === 'BIRTHDAY' ? (
                        <Avatar name={evt.employeeName || evt.title} src={evt.profilePhoto} size="lg" />
                      ) : festVisual?.imageUrl ? (
                        <img
                          src={festVisual.imageUrl}
                          alt={evt.title}
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: 'var(--radius-lg)',
                            objectFit: 'cover',
                            border: `1px solid ${festVisual.borderColor}`,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-lg)',
                            background: festVisual ? festVisual.gradient : 'rgba(59, 130, 246, 0.18)',
                            border: festVisual ? `1px solid ${festVisual.borderColor}` : '1px solid rgba(59, 130, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: festVisual ? '1.5rem' : '1.2rem',
                            color: evt.type === 'FESTIVAL' ? '#4ade80' : '#818cf8',
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                            flexShrink: 0,
                          }}
                        >
                          {festVisual ? festVisual.emoji : <CalendarIcon size={24} />}
                        </div>
                      )}

                      {/* Event Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {evt.title}
                          </h3>
                          {festVisual && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: festVisual.gradient, color: festVisual.color, border: `1px solid ${festVisual.borderColor}` }}>
                              {festVisual.tagLabel}
                            </span>
                          )}
                        </div>
                        {evt.description && (
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0', lineHeight: 1.4, wordBreak: 'break-word' }}>
                            {evt.description}
                          </p>
                        )}
                        {evt.location && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                            📍 Location: {evt.location}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                        <ArrowRight size={18} color="var(--text-muted)" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Alternate View Mode 3: 12-Month Year View */}
      {viewMode === 'YEAR' && (
        <Card style={{ padding: '1.5rem' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={20} color="var(--primary-400)" />
              {year} Full Year Overview (Click any month to jump)
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {monthNames.map((mName, mIdx) => {
                const mEvents = events.filter((e) => {
                  if (!e.date) return false;
                  const parts = e.date.split('-');
                  return parts.length >= 2 && parseInt(parts[1], 10) === mIdx + 1;
                });

                return (
                  <div
                    key={mName}
                    className="mini-month-card"
                    onClick={() => {
                      setCurrentDate(new Date(year, mIdx, 1));
                      setViewMode('GRID');
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {mName}
                      </h4>
                      <Badge variant={mEvents.length > 0 ? 'info' : 'neutral'}>
                        {mEvents.length} Event(s)
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                      {mEvents.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No events scheduled</div>
                      ) : (
                        mEvents.slice(0, 3).map((me) => {
                          const fest = me.type === 'FESTIVAL' ? getFestivalVisual(me.title) : null;
                          return (
                            <div key={me.id} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              📅 {me.date.split('-')[2]}: {fest ? fest.emoji : ''} {me.title}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

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
        maxWidth="520px"
      >
        {selectedEvent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(() => {
              const fest = selectedEvent.type === 'FESTIVAL' ? getFestivalVisual(selectedEvent.title) : null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Generated Festival Artwork Image Banner */}
                  {fest?.imageUrl && (
                    <img
                      src={fest.imageUrl}
                      alt={selectedEvent.title}
                      style={{
                        width: '100%',
                        height: '180px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-lg)',
                        border: `1px solid ${fest.borderColor}`,
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                      }}
                    />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {selectedEvent.type === 'BIRTHDAY' ? (
                      <Avatar name={selectedEvent.employeeName || selectedEvent.title} src={selectedEvent.profilePhoto} size="xl" />
                    ) : (
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: 'var(--radius-lg)',
                          background: fest ? fest.gradient : 'rgba(59, 130, 246, 0.2)',
                          border: fest ? `1px solid ${fest.borderColor}` : '1px solid rgba(59, 130, 246, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: fest ? '1.8rem' : '1.4rem',
                          color: selectedEvent.type === 'FESTIVAL' ? '#4ade80' : '#818cf8',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                        }}
                      >
                        {fest ? fest.emoji : <CalendarIcon size={26} />}
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
                </div>
              );
            })()}

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
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', marginTop: '0.35rem', color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word' }}>
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
