import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
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
import AppointmentLetterSettingsPage from './pages/AppointmentLetterSettingsPage';
import AppointmentLetterTemplatesPage from './pages/AppointmentLetterTemplatesPage';
import UsersRolesPage from './pages/UsersRolesPage';
import AuditLogsPage from './pages/AuditLogsPage';

import SalarySlipBulkPage from './pages/SalarySlipBulkPage';
import BiometricDevicesPage from './pages/BiometricDevicesPage';
import CalendarPage from './pages/CalendarPage';
import ChatPage from './pages/ChatPage';
import { PayrollProcessingPage } from './pages/PayrollProcessingPage';
import { SalaryStructuresPage } from './pages/SalaryStructuresPage';
import { StatutorySettingsPage } from './pages/StatutorySettingsPage';
import { BankTransferPage } from './pages/BankTransferPage';
import { FullAndFinalPage } from './pages/FullAndFinalPage';
import { UpcomingPayrollPage } from './pages/UpcomingPayrollPage';

import DocumentDashboardPage from './pages/documentManagement/DocumentDashboardPage';
import DocumentTypesManagerPage from './pages/documentManagement/DocumentTypesManagerPage';
import DocumentTemplateBuilderPage from './pages/documentManagement/DocumentTemplateBuilderPage';
import DocumentGenerationWizardPage from './pages/documentManagement/DocumentGenerationWizardPage';
import EmployeeLockerPage from './pages/documentManagement/EmployeeLockerPage';
import AppointmentLetterGeneratorPage from './pages/documentManagement/AppointmentLetterGeneratorPage';
import MultiDocumentGeneratorStudio from './pages/documentManagement/MultiDocumentGeneratorStudio';
import SecurityAuditCenterPage from './pages/security/SecurityAuditCenterPage';


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
        <NotificationProvider>
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
                          
                          {/* HRMS Internal Communication Platform */}
                          <Route path="/chat" element={<ChatPage />} />
                          
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
                          <Route path="/document-management" element={<DocumentDashboardPage />} />
                          <Route path="/document-management/types" element={<DocumentTypesManagerPage />} />
                          <Route path="/document-management/templates" element={<DocumentTemplateBuilderPage />} />
                          <Route path="/document-management/generate" element={<MultiDocumentGeneratorStudio />} />
                          <Route path="/document-management/generator" element={<MultiDocumentGeneratorStudio />} />
                          <Route path="/appointment-letters/generator" element={<MultiDocumentGeneratorStudio />} />
                          <Route path="/appointment-letters/generate-pdf" element={<MultiDocumentGeneratorStudio />} />
                          <Route path="/documents" element={<DocumentsPage />} />
                          <Route path="/my-documents" element={<EmployeeLockerPage />} />
                          
                          {/* Security & Audit Center */}
                          <Route path="/security-center" element={<ProtectedRoute adminOnly><SecurityAuditCenterPage /></ProtectedRoute>} />

                          {/* Production Payroll & Salary Engine */}
                          <Route path="/payroll/processing" element={<PayrollProcessingPage />} />
                          <Route path="/payroll/upcoming" element={<UpcomingPayrollPage />} />
                          <Route path="/payroll/structures" element={<SalaryStructuresPage />} />
                          <Route path="/payroll/statutory" element={<StatutorySettingsPage />} />
                          <Route path="/payroll/bank-transfer" element={<BankTransferPage />} />
                          <Route path="/payroll/ff-settlement" element={<FullAndFinalPage />} />
                          <Route path="/salary-slips" element={<SalarySlipBulkPage />} />

                          {/* Reports & Analytics */}
                          <Route path="/reports" element={<ReportsPage />} />
                          <Route path="/reports-analytics" element={<ReportsPage />} />
                          
                          {/* Employee Self Service */}
                          <Route path="/my-profile" element={<EmployeeDetailPage />} />
                          
                          {/* Admin System Controls */}
                          <Route path="/users-roles" element={<ProtectedRoute adminOnly><UsersRolesPage /></ProtectedRoute>} />
                          <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
                          <Route path="/settings/appointment-letters" element={<ProtectedRoute adminOnly><AppointmentLetterSettingsPage /></ProtectedRoute>} />
                          <Route path="/settings/letter-templates" element={<ProtectedRoute adminOnly><AppointmentLetterTemplatesPage /></ProtectedRoute>} />
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
      </NotificationProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
