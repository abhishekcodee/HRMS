import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@hrms/shared';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationDrawer } from './NotificationDrawer';
import { Tooltip, Avatar, Badge, Dropdown, Button, Modal } from './ui';
import {
  LayoutDashboard,
  Users,
  Building2,
  Users2,
  CalendarDays,
  Fingerprint,
  FileCheck2,
  Receipt,
  FileText,
  BarChart3,
  ShieldCheck,
  Settings,
  History,
  User,
  Bell,
  Search,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { fetchTotalUnreadChatCount } from '../services/chatApi';

interface NavItemConfig {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: string;
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, setRole, theme, toggleTheme, currentUser, unreadNotificationCount } = useRole();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleSwitchError, setRoleSwitchError] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Load chat unread count
  useEffect(() => {
    fetchTotalUnreadChatCount().then(setUnreadChatCount);
    const interval = setInterval(() => {
      fetchTotalUnreadChatCount().then(setUnreadChatCount);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems: NavItemConfig[] = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, UserRole.EMPLOYEE] },
    
    // Shared Internal Chat Module for All Roles
    {
      path: '/chat',
      label: 'Chat',
      icon: <MessageSquare size={20} />,
      roles: [UserRole.ADMIN, UserRole.EMPLOYER, UserRole.EMPLOYEE],
      badge: unreadChatCount > 0 ? String(unreadChatCount) : undefined
    },

    // Admin & Employer Shared Management
    { path: '/employees', label: 'Employees', icon: <Users size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },
    { path: '/departments', label: 'Departments', icon: <Building2 size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },
    { path: '/teams', label: 'Teams', icon: <Users2 size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },
    { path: '/attendance', label: 'Attendance', icon: <CalendarDays size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },
    { path: '/biometrics', label: 'eSSL Biometric Machines', icon: <Fingerprint size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },
    { path: '/leave', label: 'Leave', icon: <FileCheck2 size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },
    { path: '/calendar', label: 'Company Calendar', icon: <Calendar size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },
    { path: '/salary-slips', label: 'Salary Slips (Bulk Mail)', icon: <Receipt size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },
    { path: '/documents', label: 'Documents', icon: <FileText size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },
    { path: '/reports', label: 'Reports & Analytics', icon: <BarChart3 size={20} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER] },

    // Employee Self Service Nav
    { path: '/my-profile', label: 'My Profile', icon: <User size={20} />, roles: [UserRole.EMPLOYEE] },
    { path: '/my-attendance', label: 'My Attendance', icon: <CalendarDays size={20} />, roles: [UserRole.EMPLOYEE] },
    { path: '/my-leave', label: 'My Leave', icon: <FileCheck2 size={20} />, roles: [UserRole.EMPLOYEE] },
    { path: '/my-calendar', label: 'Company Calendar', icon: <Calendar size={20} />, roles: [UserRole.EMPLOYEE] },
    { path: '/my-documents', label: 'My Documents', icon: <FileText size={20} />, roles: [UserRole.EMPLOYEE] },

    // Admin Only System Controls
    { path: '/users-roles', label: 'Users & Roles', icon: <ShieldCheck size={20} />, roles: [UserRole.ADMIN] },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} />, roles: [UserRole.ADMIN] },
    { path: '/audit', label: 'Audit Logs', icon: <History size={20} />, roles: [UserRole.ADMIN] }
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(role));

  const handleRoleSwitch = async (targetRole: UserRole) => {
    setRoleSwitchError(null);
    const success = await setRole(targetRole);
    if (!success) {
      setRoleSwitchError(`Access Denied: Your authenticated user account (${user?.role || 'User'}) is not authorized to switch to ${targetRole} view.`);
    }
  };

  const roleOptions: { id: string; label: string; onClick: () => void }[] = [
    { id: 'employer', label: 'Switch to Employer View', onClick: () => handleRoleSwitch(UserRole.EMPLOYER) },
    { id: 'employee', label: 'Switch to Employee View', onClick: () => handleRoleSwitch(UserRole.EMPLOYEE) },
    { id: 'admin', label: 'Switch to Admin View', onClick: () => handleRoleSwitch(UserRole.ADMIN) }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    { id: 'profile', label: 'View Profile', icon: <User size={16} />, onClick: () => navigate('/my-profile') },
    ...(role === UserRole.ADMIN ? [{ id: 'settings', label: 'System Settings', icon: <Settings size={16} />, onClick: () => navigate('/settings') }] : []),
    { id: 'logout', label: 'Sign Out', icon: <LogOut size={16} />, danger: true, onClick: handleLogout }
  ];

  return (
    <div className="hrms-layout">
      {/* Mobile Backdrop Overlay (Click to auto-close menu) */}
      {mobileOpen && (
        <div
          className="mobile-overlay-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`hrms-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src="/hrms-brand.png"
              alt="HRMS Brand"
              style={{
                height: collapsed ? '32px' : '44px',
                maxWidth: collapsed ? '32px' : '175px',
                objectFit: 'contain',
                transition: 'all 0.2s ease',
              }}
            />
          </Link>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {!collapsed && <div className="nav-section-title">Navigation</div>}
          {visibleNav.map(item => {
            const isActive = location.pathname === item.path;
            const linkContent = (
              <Link
                to={item.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: 'var(--primary-glow)',
                      color: 'var(--primary-500)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );

            return (
              <div key={item.path}>
                {collapsed ? (
                  <Tooltip content={item.label} position="right">
                    {linkContent}
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Context
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {role} Role
                </div>
              </div>
              <Badge variant={role === UserRole.ADMIN ? 'error' : role === UserRole.EMPLOYER ? 'warning' : 'success'}>
                {role}
              </Badge>
            </div>
          )}
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="hrms-main">
        {/* Topbar */}
        <header className="hrms-header">
          <div className="header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Open mobile menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                variant="outline"
                size="sm"
                icon={<Search size={16} />}
                onClick={() => setSearchOpen(true)}
                style={{ color: 'var(--text-muted)', fontWeight: 400 }}
              >
                <span className="search-btn-text">Search system...</span> <kbd className="search-btn-kbd" style={{ marginLeft: '1rem', fontSize: '0.7rem', backgroundColor: 'var(--bg-surface-hover)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Ctrl K</kbd>
              </Button>
            </div>
          </div>

          <div className="header-right">
            {/* Header Role Display / Switcher based on User Role */}
            {user?.role === UserRole.EMPLOYEE ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--success-text)',
                }}
              >
                <User size={14} /> Employee: {user.employeeId}
              </div>
            ) : user?.role === UserRole.EMPLOYER ? (
              <Badge variant="warning">Role: EMPLOYER</Badge>
            ) : (
              <Dropdown
                trigger={
                  <Button variant="secondary" size="sm" style={{ gap: '0.4rem' }}>
                    Role: <strong style={{ color: 'var(--primary-500)' }}>{role}</strong>
                    <ChevronDown size={14} />
                  </Button>
                }
                items={roleOptions}
              />
            )}

            {/* Senior Designer Theme Mode Toggle Switcher */}
            <button
              onClick={toggleTheme}
              className="theme-mode-toggle"
              aria-label="Toggle dark/light theme mode"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} style={{ color: '#fbbf24' }} />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={15} style={{ color: '#6366f1' }} />
                  <span>Night Mode</span>
                </>
              )}
            </button>

            {/* Notifications Trigger */}
            <div style={{ position: 'relative' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotifOpen(true)}
                aria-label="Open notifications"
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--error-text)'
                    }}
                  />
                )}
              </Button>
            </div>

            {/* User Profile Menu */}
            <Dropdown
              trigger={
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Avatar name={user?.fullName || 'User'} src={user?.profilePhoto || undefined} size="sm" status="online" />
                  <div style={{ textAlign: 'left', display: 'none', flexDirection: 'column' }} className="user-info-text">
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {user?.fullName || 'User'}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      {currentUser.designation}
                    </span>
                  </div>
                </div>
              }
              items={userMenuItems}
            />
          </div>
        </header>

        {/* Content Body */}
        <main className={`hrms-content ${location.pathname === '/chat' ? 'chat-page-content' : ''}`}>{children}</main>

        {/* Senior Design System: Floating Glassmorphic Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav">
          <Link
            to="/"
            className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>

          <Link
            to={role === UserRole.EMPLOYEE ? '/my-profile' : '/employees'}
            className={`bottom-nav-item ${location.pathname.startsWith('/employees') || location.pathname === '/my-profile' ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>{role === UserRole.EMPLOYEE ? 'Profile' : 'Employees'}</span>
          </Link>

          <Link
            to={role === UserRole.EMPLOYEE ? '/my-attendance' : '/attendance'}
            className={`bottom-nav-item ${location.pathname.includes('attendance') ? 'active' : ''}`}
          >
            <CalendarDays size={20} />
            <span>Attendance</span>
          </Link>

          <Link
            to={role === UserRole.EMPLOYEE ? '/my-leave' : '/leave'}
            className={`bottom-nav-item ${location.pathname.includes('leave') ? 'active' : ''}`}
          >
            <FileCheck2 size={20} />
            <span>Leave</span>
          </Link>

          <button
            className={`bottom-nav-item ${mobileOpen ? 'active' : ''}`}
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            <span>Menu</span>
          </button>
        </nav>
      </div>

      {/* Global Search & Notification Center Overlay Modals */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Access Denied Modal */}
      <Modal isOpen={Boolean(roleSwitchError)} onClose={() => setRoleSwitchError(null)} title="Access Authorization Alert">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {roleSwitchError}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="primary" onClick={() => setRoleSwitchError(null)}>
              Understand & Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Layout;
