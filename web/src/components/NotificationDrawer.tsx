import React, { useState } from 'react';
import { Drawer, Badge, Button } from './ui';
import { MOCK_NOTIFICATIONS, NotificationMock } from '@hrms/shared';
import { Bell, CheckCheck, Clock } from 'lucide-react';

export const NotificationDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const [notifications, setNotifications] = useState<NotificationMock[]>(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Notification Center" width="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            {notifications.filter(n => !n.read).length} unread notifications
          </span>
          <Button variant="ghost" size="sm" icon={<CheckCheck size={14} />} onClick={markAllRead}>
            Mark all read
          </Button>
        </div>

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
              {!n.read && (
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-500)'
                  }}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Badge variant={n.type === 'LEAVE' ? 'warning' : 'info'}>
                  {n.type}
                </Badge>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={12} /> {n.timestamp}
                </span>
              </div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                {n.title}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {n.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
};
