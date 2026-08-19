import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import Dashboard from './pages/Dashboard';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import DepartmentsTeamsPage from './pages/DepartmentsTeamsPage';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import DocumentsPage from './pages/DocumentsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import UsersRolesPage from './pages/UsersRolesPage';
import AuditLogsPage from './pages/AuditLogsPage';

import SalarySlipBulkPage from './pages/SalarySlipBulkPage';
import BiometricDevicesPage from './pages/BiometricDevicesPage';
import CalendarPage from './pages/CalendarPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { isAuthenticated, isLoading, user, activeRoleView } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <LoadingSpinner size="lg" text="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force Password Change Route Lock
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (adminOnly && activeRoleView !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RoleProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Unauthenticated Login Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Mandatory First-Time Password Change Route */}
                <Route
                  path="/change-password"
                  element={
                    <ProtectedRoute>
                      <ChangePasswordPage />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Application Routes inside Layout */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          
                          {/* Employee Management */}
                          <Route path="/employees" element={<EmployeesPage />} />
                          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                          
                          {/* Organization Hierarchy */}
                          <Route path="/departments" element={<DepartmentsTeamsPage />} />
                          <Route path="/teams" element={<DepartmentsTeamsPage />} />
                          
                          {/* Attendance & Biometric Machine Integration */}
                          <Route path="/attendance" element={<AttendancePage />} />
                          <Route path="/my-attendance" element={<AttendancePage />} />
                          <Route path="/biometrics" element={<ProtectedRoute adminOnly><BiometricDevicesPage /></ProtectedRoute>} />
                          
                          {/* Leave Management */}
                          <Route path="/leave" element={<LeavePage />} />
                          <Route path="/my-leave" element={<LeavePage />} />

                          {/* Calendar & Company Events */}
                          <Route path="/calendar" element={<CalendarPage />} />
                          <Route path="/my-calendar" element={<CalendarPage />} />
                          
                          {/* Documents & Vault */}
                          <Route path="/documents" element={<DocumentsPage />} />
                          <Route path="/my-documents" element={<DocumentsPage />} />
                          
                          {/* Reports & Analytics */}
                          <Route path="/reports" element={<ReportsPage />} />
                          
                          {/* Employee Self Service */}
                          <Route path="/my-profile" element={<EmployeeDetailPage />} />
                          
                          {/* Admin System Controls */}
                          <Route path="/users-roles" element={<ProtectedRoute adminOnly><UsersRolesPage /></ProtectedRoute>} />
                          <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
                          <Route path="/audit" element={<ProtectedRoute adminOnly><AuditLogsPage /></ProtectedRoute>} />

                          {/* Fallback */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </RoleProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
