import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@hrms/shared';

export interface UserAuthProfile {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole; // Actual system role assigned in database ('ADMIN' | 'EMPLOYER' | 'EMPLOYEE')
  status: 'active' | 'inactive' | 'suspended';
  mustChangePassword?: boolean;
  profilePhoto?: string;
}

interface AuthContextType {
  user: UserAuthProfile | null;
  token: string | null;
  activeRoleView: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRoleView: (targetRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  updateUserProfileInState: (partial: Partial<UserAuthProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAuthProfile | null>(() => {
    const cached = localStorage.getItem('hrms_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hrms_token'));
  const [activeRoleView, setActiveRoleView] = useState<UserRole>(() => {
    const cachedRole = localStorage.getItem('hrms_active_role') as UserRole;
    if (cachedRole && Object.values(UserRole).includes(cachedRole)) {
      return cachedRole;
    }
    const cachedUser = localStorage.getItem('hrms_user');
    if (cachedUser) {
      const parsed = JSON.parse(cachedUser);
      return parsed.role || UserRole.ADMIN;
    }
    return UserRole.ADMIN;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on load
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('hrms_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const dbRoleUpper = data.data.role.toUpperCase() as UserRole;
            const updatedProfile: UserAuthProfile = {
              id: data.data.id,
              employeeId: data.data.employeeId,
              fullName: data.data.fullName,
              email: data.data.email,
              phone: data.data.phone,
              role: dbRoleUpper,
              status: data.data.status,
              mustChangePassword: !!data.data.mustChangePassword,
              profilePhoto: data.data.profilePhoto,
            };
            setUser(updatedProfile);
            localStorage.setItem('hrms_user', JSON.stringify(updatedProfile));
          }
        } else {
          // Token invalid or user inactive
          logout();
        }
      } catch (err) {
        console.warn('Session verification fallback (offline or starting backend):', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }> => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.error?.message || 'Login failed. Please check your credentials.',
        };
      }

      const dbRoleUpper = result.data.user.role.toUpperCase() as UserRole;
      const mustChangePassword = !!result.data.user.mustChangePassword;
      const userProfile: UserAuthProfile = {
        id: result.data.user.id,
        employeeId: result.data.user.employeeId,
        fullName: result.data.user.fullName,
        email: result.data.user.email,
        phone: result.data.user.phone,
        role: dbRoleUpper,
        status: result.data.user.status,
        mustChangePassword,
        profilePhoto: result.data.user.profilePhoto,
      };

      setToken(result.data.token);
      setUser(userProfile);
      setActiveRoleView(dbRoleUpper);

      localStorage.setItem('hrms_token', result.data.token);
      localStorage.setItem('hrms_user', JSON.stringify(userProfile));
      localStorage.setItem('hrms_active_role', dbRoleUpper);

      return { success: true, mustChangePassword };
    } catch (err: any) {
      console.error('Login network error:', err);
      return {
        success: false,
        error: 'Unable to connect to HRMS server. Please verify backend service status.',
      };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated.' };
    }

    try {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.error?.message || 'Failed to update password.',
        };
      }

      if (result.data?.token) {
        setToken(result.data.token);
        localStorage.setItem('hrms_token', result.data.token);
      }

      if (result.data?.user) {
        const updated = {
          ...user!,
          mustChangePassword: false,
        };
        setUser(updated);
        localStorage.setItem('hrms_user', JSON.stringify(updated));
      } else if (user) {
        const updated = { ...user, mustChangePassword: false };
        setUser(updated);
        localStorage.setItem('hrms_user', JSON.stringify(updated));
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to server to update password.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setActiveRoleView(UserRole.ADMIN);
    localStorage.removeItem('hrms_token');
    localStorage.removeItem('hrms_user');
    localStorage.removeItem('hrms_active_role');
    localStorage.clear();
    sessionStorage.clear();
  };

  const switchRoleView = async (targetRole: UserRole): Promise<{ success: boolean; error?: string }> => {
    if (!user || !token) {
      return { success: false, error: 'Not authenticated.' };
    }

    try {
      const response = await fetch('/api/v1/auth/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetRole: targetRole.toLowerCase() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.error?.message || `Failed to switch to ${targetRole} view.`,
        };
      }

      setActiveRoleView(targetRole);
      localStorage.setItem('hrms_active_role', targetRole);
      return { success: true };
    } catch (err) {
      if (user.role === UserRole.ADMIN) {
        setActiveRoleView(targetRole);
        localStorage.setItem('hrms_active_role', targetRole);
        return { success: true };
      }
      return { success: false, error: 'Network error switching role view.' };
    }
  };

  const updateUserProfileInState = (partial: Partial<UserAuthProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      localStorage.setItem('hrms_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeRoleView,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        changePassword,
        logout,
        switchRoleView,
        updateUserProfileInState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
