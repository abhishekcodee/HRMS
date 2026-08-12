import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, MOCK_EMPLOYEES, EmployeeMock } from '@hrms/shared';
import { useAuth } from './AuthContext';

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

  // Determine current display employee profile from auth state or fallback mock
  const fallbackMock = MOCK_EMPLOYEES.find(e => e.role === activeRoleView) || MOCK_EMPLOYEES[0];
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
        avatar: user.profilePhoto || fallbackMock.avatar,
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '+91 98765 00001',
      }
    : fallbackMock;

  return (
    <RoleContext.Provider
      value={{
        role: activeRoleView,
        setRole,
        theme,
        toggleTheme,
        currentUser,
        unreadNotificationCount: 2,
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
