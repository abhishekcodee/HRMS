import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, EmployeeMock } from '@hrms/shared';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => Promise<boolean>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  currentUser: EmployeeMock;
  unreadNotificationCount: number;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeRoleView, switchRoleView } = useAuth();
  const { unreadCount } = useNotifications();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setRole = async (newRole: UserRole): Promise<boolean> => {
    const result = await switchRoleView(newRole);
    return result.success;
  };

  // Determine current display employee profile from auth state
  const currentUser: EmployeeMock = user
    ? {
        id: user.id,
        employeeId: user.employeeId,
        firstName: user.fullName.split(' ')[0] || 'User',
        lastName: user.fullName.split(' ').slice(1).join(' ') || '',
        email: user.email,
        phone: user.phone || '+91 98765 00000',
        gender: 'Male',
        dob: '1990-01-01',
        address: 'Enterprise HQ, India',
        role: activeRoleView,
        designation: user.role === UserRole.ADMIN ? 'Chief Administrator' : user.role === UserRole.EMPLOYER ? 'Enterprise Employer' : 'Full Stack Engineer',
        departmentId: 'dept-1',
        departmentName: 'Operations',
        teamId: 'team-1',
        teamName: 'Core Operations',
        joiningDate: '2024-01-01',
        status: 'ACTIVE',
        avatar: user.profilePhoto || '',
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '+91 98765 00001',
      }
    : {
        id: 'guest',
        employeeId: 'EMP000',
        firstName: 'Guest',
        lastName: 'User',
        email: 'guest@hrms.com',
        phone: '',
        gender: 'Male',
        dob: '1990-01-01',
        address: '',
        role: activeRoleView,
        designation: 'User',
        departmentId: 'dept-1',
        departmentName: 'General',
        teamId: 'team-1',
        teamName: 'General',
        joiningDate: '2024-01-01',
        status: 'ACTIVE',
        avatar: '',
        emergencyContact: '',
        emergencyPhone: '',
      };

  return (
    <RoleContext.Provider
      value={{
        role: activeRoleView,
        setRole,
        theme,
        toggleTheme,
        currentUser,
        unreadNotificationCount: unreadCount,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
