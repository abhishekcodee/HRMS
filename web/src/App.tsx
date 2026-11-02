import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { NotificationProvider } from './context/NotificationContext';
import { RoleProvider } from './context/RoleContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Eagerly loaded primary auth routes
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';

// Lazy loaded feature modules
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const EmployeeDetailPage = lazy(() => import('./pages/EmployeeDetailPage'));
const DepartmentsTeamsPage = lazy(() => import('./pages/DepartmentsTeamsPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const LeavePage = lazy(() => import('./pages/LeavePage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AppointmentLetterSettingsPage = lazy(() => import('./pages/AppointmentLetterSettingsPage'));
const AppointmentLetterTemplatesPage = lazy(() => import('./pages/AppointmentLetterTemplatesPage'));
const UsersRolesPage = lazy(() => import('./pages/UsersRolesPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));

const SalarySlipBulkPage = lazy(() => import('./pages/SalarySlipBulkPage'));
const BiometricDevicesPage = lazy(() => import('./pages/BiometricDevicesPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const PayrollProcessingPage = lazy(() => import('./pages/PayrollProcessingPage').then(m => ({ default: m.PayrollProcessingPage })));
const SalaryStructuresPage = lazy(() => import('./pages/SalaryStructuresPage').then(m => ({ default: m.SalaryStructuresPage })));
const StatutorySettingsPage = lazy(() => import('./pages/StatutorySettingsPage').then(m => ({ default: m.StatutorySettingsPage })));
const BankTransferPage = lazy(() => import('./pages/BankTransferPage').then(m => ({ default: m.BankTransferPage })));
const FullAndFinalPage = lazy(() => import('./pages/FullAndFinalPage').then(m => ({ default: m.FullAndFinalPage })));
const UpcomingPayrollPage = lazy(() => import('./pages/UpcomingPayrollPage').then(m => ({ default: m.UpcomingPayrollPage })));

const DocumentDashboardPage = lazy(() => import('./pages/documentManagement/DocumentDashboardPage'));
const DocumentTypesManagerPage = lazy(() => import('./pages/documentManagement/DocumentTypesManagerPage'));
const DocumentTemplateBuilderPage = lazy(() => import('./pages/documentManagement/DocumentTemplateBuilderPage'));
const MultiDocumentGeneratorStudio = lazy(() => import('./pages/documentManagement/MultiDocumentGeneratorStudio'));
const EmployeeLockerPage = lazy(() => import('./pages/documentManagement/EmployeeLockerPage'));
const SecurityAuditCenterPage = lazy(() => import('./pages/security/SecurityAuditCenterPage'));
const SuperAdminDashboardPage = lazy(() => import('./pages/superAdmin/SuperAdminDashboardPage').then(m => ({ default: m.SuperAdminDashboardPage })));
const CompanyBrandingPage = lazy(() => import('./pages/CompanyBrandingPage').then(m => ({ default: m.CompanyBrandingPage })));

const PageFallback = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <LoadingSpinner size="md" text="Loading module..." />
  </div>
);

const ProtectedRoute: React.FC<{ children?: React.ReactNode; adminOnly?: boolean; superAdminOnly?: boolean }> = ({ children, adminOnly, superAdminOnly }) => {
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

  if (superAdminOnly && !user?.isSuperAdmin && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && activeRoleView !== 'ADMIN' && !user?.isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TenantProvider>
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

                    {/* Protected Application Layout Route */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <Suspense fallback={<PageFallback />}>
                              <Outlet />
                            </Suspense>
                          </Layout>
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/super-admin" element={<SuperAdminDashboardPage />} />
                      <Route path="/company-branding" element={<ProtectedRoute superAdminOnly><CompanyBrandingPage /></ProtectedRoute>} />
                      
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

                      {/* Fallback to Dashboard */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </ToastProvider>
            </RoleProvider>
          </NotificationProvider>
        </TenantProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
