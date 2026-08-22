import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationMock } from '@hrms/shared';
import {
  fetchNotifications,
  markNotificationReadApi,
  createNotificationApi,
  deleteNotificationApi,
  clearAllNotificationsApi,
  getLocalNotifications,
} from '../services/notificationApi';

interface NotificationContextType {
  notifications: NotificationMock[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id?: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  addNotification: (notif: Omit<NotificationMock, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationMock[]>(() => getLocalNotifications());
  const [loading, setLoading] = useState<boolean>(true);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 15000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markAsRead = async (id?: string) => {
    const updated = await markNotificationReadApi(id);
    setNotifications(updated);
  };

  const markAllAsRead = async () => {
    const updated = await markNotificationReadApi();
    setNotifications(updated);
  };

  const removeNotification = async (id: string) => {
    const updated = await deleteNotificationApi(id);
    setNotifications(updated);
  };

  const clearAllNotifications = async () => {
    const updated = await clearAllNotificationsApi();
    setNotifications(updated);
  };

  const addNotification = async (notif: Omit<NotificationMock, 'id' | 'timestamp' | 'read'>) => {
    const updated = await createNotificationApi(notif);
    setNotifications(updated);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications,
        addNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
