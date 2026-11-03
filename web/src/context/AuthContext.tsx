import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@hrms/shared';
import { API_BASE_URL } from '../config/api';

export interface UserAuthProfile {
  id: string;
  companyId?: string | null;
  isSuperAdmin?: boolean;
  company?: any;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole | 'SUPER_ADMIN' | 'DEMO' | 'demo'; // Actual system role assigned in database
  status: 'active' | 'inactive' | 'suspended';
  mustChangePassword?: boolean;
  profilePhoto?: string;
}

interface AuthContextType {
  user: UserAuthProfile | null;
  token: string | null;
  activeRoleView: UserRole | 'SUPER_ADMIN' | 'DEMO' | 'demo';
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRoleView: (targetRole: UserRole | 'SUPER_ADMIN') => Promise<{ success: boolean; error?: string }>;
  updateUserProfileInState: (partial: Partial<UserAuthProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAuthProfile | null>(() => {
    const cached = localStorage.getItem('hrms_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hrms_token'));
  const [activeRoleView, setActiveRoleView] = useState<UserRole | 'SUPER_ADMIN' | 'DEMO' | 'demo'>(() => {
    const cachedRole = localStorage.getItem('hrms_active_role') as any;
    if (cachedRole) {
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
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const rawRole = data.data.role ? String(data.data.role).toUpperCase() : 'EMPLOYEE';
            const dbRoleUpper = (rawRole as UserRole | 'SUPER_ADMIN' | 'DEMO' | 'demo');

            // Check if demo user has exceeded 30 minute limit
            const storedDemoExpiry = localStorage.getItem('hrms_demo_expires_at');
            if (dbRoleUpper === 'DEMO' && storedDemoExpiry && Date.now() > Number(storedDemoExpiry)) {
              logout();
              window.location.href = '/login?reason=demo_expired';
              return;
            }

            const updatedProfile: UserAuthProfile = {
              id: data.data.id,
              companyId: data.data.companyId || null,
              isSuperAdmin: !!data.data.isSuperAdmin,
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
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
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

      const rawRole = result.data.user.role ? String(result.data.user.role).toUpperCase() : 'EMPLOYEE';
      const dbRoleUpper = (rawRole as UserRole | 'SUPER_ADMIN' | 'DEMO' | 'demo');
      const mustChangePassword = !!result.data.user.mustChangePassword;

      // Strictly record 30-minute demo expiration if demo role
      if (dbRoleUpper === 'DEMO' || result.data.user.email?.toLowerCase().includes('demo')) {
        const demoExpiry = result.data.demoExpiresAt || (Date.now() + 30 * 60 * 1000);
        localStorage.setItem('hrms_demo_expires_at', String(demoExpiry));
      } else {
        localStorage.removeItem('hrms_demo_expires_at');
      }

      const userProfile: UserAuthProfile = {
        id: result.data.user.id,
        companyId: result.data.user.companyId || null,
        isSuperAdmin: !!result.data.user.isSuperAdmin,
        company: result.data.user.company,
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
      localStorage.setItem('token', result.data.token);
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
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
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
        localStorage.setItem('token', result.data.token);
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
    localStorage.removeItem('token');
    localStorage.removeItem('hrms_user');
    localStorage.removeItem('hrms_active_role');
    localStorage.clear();
    sessionStorage.clear();
  };

  const switchRoleView = async (targetRole: UserRole | 'SUPER_ADMIN'): Promise<{ success: boolean; error?: string }> => {
    if (!user || !token) {
      return { success: false, error: 'Not authenticated.' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/switch-role`, {
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
