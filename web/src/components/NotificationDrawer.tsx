import React, { useState } from 'react';
import { Drawer, Badge, Button } from './ui';
import { NotificationMock } from '@hrms/shared';
import { Bell, CheckCheck, Clock } from 'lucide-react';

export const NotificationDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const [notifications, setNotifications] = useState<NotificationMock[]>([]);

  const markAllRead = () => {
    setNotifications([]);
  };

  const removeSingleNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Notification Center" width="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            {notifications.length} notification(s) remaining
          </span>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" icon={<CheckCheck size={14} />} onClick={markAllRead}>
              Mark all read & Clear
            </Button>
          )}
        </div>

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
                  border: '1px solid var(--border-color)',
                  position: 'relative'
                }}
              >
                <button
                  type="button"
                  onClick={() => removeSingleNotification(n.id)}
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
                  }}
                >
                  ×
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Badge variant={n.type === 'LEAVE' ? 'warning' : 'info'}>
                    {n.type}
                  </Badge>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={12} /> {n.timestamp}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', paddingRight: '1rem' }}>
                  {n.title}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                  {n.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
