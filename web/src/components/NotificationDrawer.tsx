import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, Badge, Button } from './ui';
import { useNotifications } from '../context/NotificationContext';
import { CheckCheck, Clock, Trash2, ArrowRight } from 'lucide-react';

export const NotificationDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  } = useNotifications();

  const handleNotificationClick = async (id: string, link?: string) => {
    await markAsRead(id);
    if (link) {
      navigate(link);
      onClose();
    }
  };

  const getBadgeVariant = (type: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (type) {
      case 'LEAVE':
        return 'warning';
      case 'ATTENDANCE':
        return 'info';
      case 'PAYROLL':
        return 'success';
      case 'DOCUMENT':
        return 'neutral';
      case 'SYSTEM':
      default:
        return 'info';
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Notification Center" width="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            {notifications.length} notification(s) ({unreadCount} unread)
          </span>

          {notifications.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<CheckCheck size={14} />}
                  onClick={() => markAllAsRead()}
                  title="Mark all as read"
                >
                  Mark read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => clearAllNotifications()}
                style={{ color: 'var(--error-text)' }}
                title="Clear all notifications"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* List of Notifications */}
        {notifications.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success-text)',
              }}
            >
              <CheckCheck size={24} />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              All Notifications Cleared
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              You're all caught up! There are no unread notifications right now.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: n.read ? 'var(--bg-surface)' : 'var(--bg-surface-hover)',
                  border: n.read
                    ? '1px solid var(--border-color)'
                    : '1px solid rgba(99, 102, 241, 0.4)',
                  boxShadow: n.read ? 'none' : '0 2px 8px rgba(99, 102, 241, 0.08)',
                  position: 'relative',
                  cursor: n.link ? 'pointer' : 'default',
                  transition: 'all 0.15s ease-in-out',
                }}
                onClick={() => handleNotificationClick(n.id, n.link)}
              >
                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    removeNotification(n.id);
                  }}
                  title="Dismiss notification"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                >
                  ×
                </button>

                {/* Badge & Timestamp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Badge variant={getBadgeVariant(n.type)}>{n.type}</Badge>
                  {!n.read && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-500)',
                        display: 'inline-block',
                      }}
                      title="Unread"
                    />
                  )}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      marginLeft: 'auto',
                      paddingRight: '1.2rem',
                    }}
                  >
                    <Clock size={12} /> {n.timestamp}
                  </span>
                </div>

                {/* Title */}
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', paddingRight: '1rem' }}>
                  {n.title}
                </h4>

                {/* Message */}
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                  {n.message}
                </p>

                {/* Action Link Hint */}
                {n.link && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-500)' }}>
                    <span>View details</span>
                    <ArrowRight size={12} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
