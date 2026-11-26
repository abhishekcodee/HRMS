import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { UserRole } from '@hrms/shared';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationDrawer } from './NotificationDrawer';
import { DemoBanner } from './DemoBanner';
import { Tooltip, Avatar, Badge, Dropdown, Button, Modal } from './ui';
import { API_BASE_URL } from '../config/api';
import { safeFetchJson } from '../utils/safeFetch';
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
  ChevronUp,
  Calendar,
  MessageSquare,
  Globe,
  Palette,
  GraduationCap,
} from 'lucide-react';
import { fetchTotalUnreadChatCount } from '../services/chatApi';

interface NavItemConfig {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: (UserRole | string)[];
  badge?: string;
}

interface NavGroupConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItemConfig[];
}

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { role, setRole, theme, toggleTheme, currentUser, unreadNotificationCount } = useRole();
  const { user, logout } = useAuth();
  const { branding, activeTenantId, setActiveTenantId, reloadBranding } = useTenant();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleSwitchError, setRoleSwitchError] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [companiesList, setCompaniesList] = useState<{ id: string; name: string; code: string }[]>([]);
  
  // Multi-accordion open groups state initialized from localStorage
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('hrms_open_groups');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      people: true,
      time: true,
      payroll: false,
      documents: false,
      security: false,
      settings: false,
    };
  });

  const location = useLocation();
  const navigate = useNavigate();

  const isSuper = user?.isSuperAdmin || user?.role === 'SUPER_ADMIN';
  const isDemo = user?.role === UserRole.DEMO || (user?.role as any) === 'demo' || (user?.role as any) === 'DEMO';

  const restrictedDemoPaths = [
    '/super-admin',
    '/settings',
    '/company-branding',
    '/users-roles',
    '/payroll/bank-transfer',
    '/payroll/ff-settlement',
    '/payroll/statutory',
    '/security-center',
    '/audit',
  ];
  const isRestrictedPath = isDemo && restrictedDemoPaths.some(p => location.pathname === p || location.pathname.startsWith(`${p}/`));

  // Load companies for Super Admin Selector
  useEffect(() => {
    if (isSuper) {
      safeFetchJson<{ success: boolean; data: any[] }>(`${API_BASE_URL}/super-admin/companies`).then(res => {
        if (res.ok && res.data?.success && Array.isArray(res.data.data)) {
          setCompaniesList(res.data.data.map(c => ({ id: c.id, name: c.name, code: c.code })));
        }
      });
    }
  }, [isSuper]);

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

  // Auto-close mobile drawer on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveNavRole = isDemo ? UserRole.DEMO : role;

  // Direct Top-Level Links (Dashboard, Chat, Platform Control)
  const directNavItems: NavItemConfig[] = [
    ...(isSuper ? [{ path: '/super-admin', label: 'Platform SaaS Control', icon: <Globe size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, UserRole.EMPLOYEE, 'SUPER_ADMIN'] }] : []),
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, UserRole.EMPLOYEE, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
    { path: '/chat', label: 'Chat', icon: <MessageSquare size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, UserRole.EMPLOYEE, 'SUPER_ADMIN', UserRole.DEMO, 'demo'], badge: unreadChatCount > 0 ? String(unreadChatCount) : undefined },
  ].filter(item => item.roles.includes(effectiveNavRole as any) || (isDemo && (item.roles.includes('demo') || item.roles.includes(UserRole.DEMO))));

  // Collapsible Navigation Groups
  const allGroups: NavGroupConfig[] = [
    {
      id: 'people',
      label: 'People Management',
      icon: <Users size={18} />,
      items: [
        { path: '/employees', label: 'Employees', icon: <Users size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/departments', label: 'Departments', icon: <Building2 size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/teams', label: 'Teams', icon: <Users2 size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/students', label: 'Students & Interns', icon: <GraduationCap size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN'] },
        { path: '/users-roles', label: 'Users & Roles', icon: <ShieldCheck size={18} />, roles: [UserRole.ADMIN, 'SUPER_ADMIN'] },
        { path: '/my-profile', label: 'My Profile', icon: <User size={18} />, roles: [UserRole.EMPLOYEE] },
      ],
    },
    {
      id: 'time',
      label: 'Time & Attendance',
      icon: <CalendarDays size={18} />,
      items: [
        { path: '/attendance', label: 'Attendance', icon: <CalendarDays size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/my-attendance', label: 'My Attendance', icon: <CalendarDays size={18} />, roles: [UserRole.EMPLOYEE] },
        { path: '/biometrics', label: 'eSSL Biometric Machines', icon: <Fingerprint size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN'] },
        { path: '/leave', label: 'Leave', icon: <FileCheck2 size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/my-leave', label: 'My Leave', icon: <FileCheck2 size={18} />, roles: [UserRole.EMPLOYEE] },
        { path: '/calendar', label: 'Company Calendar', icon: <Calendar size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/my-calendar', label: 'Company Calendar', icon: <Calendar size={18} />, roles: [UserRole.EMPLOYEE] },
      ],
    },
    {
      id: 'payroll',
      label: 'Payroll & Finance',
      icon: <Receipt size={18} />,
      items: [
        { path: '/payroll/processing', label: 'Run Payroll', icon: <Receipt size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN'] },
        { path: '/my-payslips', label: 'My Payslips', icon: <Receipt size={18} />, roles: [UserRole.EMPLOYEE] },
        { path: '/payroll/upcoming', label: 'Upcoming Payroll & Claims', icon: <Receipt size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/payroll/structures', label: 'Salary Structures & Components', icon: <Receipt size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/payroll/statutory', label: 'Statutory Rules (PF/ESIC/PT)', icon: <ShieldCheck size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN'] },
        { path: '/payroll/bank-transfer', label: 'Bank Transfer Advice', icon: <Building2 size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN'] },
        { path: '/payroll/ff-settlement', label: 'Full & Final (F&F)', icon: <Receipt size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN'] },
        { path: '/salary-slips', label: 'Salary Slips (Bulk & Single)', icon: <Receipt size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
      ],
    },
    {
      id: 'documents',
      label: 'Document Center',
      icon: <FileText size={18} />,
      items: [
        { path: '/document-management', label: 'Document Management', icon: <FileText size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/document-management/generate', label: 'Document Generator', icon: <FileText size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
        { path: '/documents', label: 'Document Uploads', icon: <FileText size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN'] },
        { path: '/my-documents', label: 'My Documents', icon: <FileText size={18} />, roles: [UserRole.EMPLOYEE] },
      ],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: <BarChart3 size={18} />,
      items: [
        { path: '/reports', label: 'Reports & Analytics', icon: <BarChart3 size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN', UserRole.DEMO, 'demo'] },
      ],
    },
    {
      id: 'security',
      label: 'Security & Compliance',
      icon: <ShieldCheck size={18} />,
      items: [
        { path: '/security-center', label: 'Security & Audit Center', icon: <ShieldCheck size={18} />, roles: [UserRole.ADMIN, 'SUPER_ADMIN'] },
        { path: '/audit', label: 'Audit Logs', icon: <History size={18} />, roles: [UserRole.ADMIN, 'SUPER_ADMIN'] },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />,
      items: [
        { path: '/settings', label: 'Settings', icon: <Settings size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, 'SUPER_ADMIN'] },
        ...(role === UserRole.ADMIN || isSuper || user?.email?.toLowerCase() === 'amanupadhyay2030@gmail.com' ? [{ path: '/company-branding', label: 'White-Label Branding', icon: <Palette size={18} />, roles: [UserRole.ADMIN, UserRole.EMPLOYER, UserRole.EMPLOYEE, 'SUPER_ADMIN'] }] : []),
      ],
    },
  ];

  const visibleGroups = allGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.roles.includes(effectiveNavRole as any) || (isDemo && (item.roles.includes('demo') || item.roles.includes(UserRole.DEMO)))
      )
    }))
    .filter(group => group.items.length > 0);

  const allNavItems = [
    ...directNavItems,
    ...visibleGroups.flatMap(group => group.items),
  ];

  const pathMatches = (path: string) => {
    if (path === '/') return location.pathname === '/';
    // 1. If any registered item strictly matches the current pathname, only that exact item is active
    const hasExactMatch = allNavItems.some(item => item.path === location.pathname);
    if (hasExactMatch) {
      return location.pathname === path;
    }
    // 2. Otherwise (e.g. /employees/:id), match exclusively the longest matching prefix
    if (location.pathname.startsWith(`${path}/`)) {
      const candidates = allNavItems
        .map(i => i.path)
        .filter(p => p !== '/' && (location.pathname === p || location.pathname.startsWith(`${p}/`)));
      const longestCandidate = candidates.sort((a, b) => b.length - a.length)[0];
      return path === longestCandidate;
    }
    return false;
  };

  const activeGroup = visibleGroups.find(group => group.items.some(item => pathMatches(item.path)))?.id;

  // Auto-expand group that contains active route without collapsing any other open groups!
  useEffect(() => {
    if (activeGroup) {
      setOpenGroups(prev => {
        if (prev[activeGroup]) return prev;
        const updated = { ...prev, [activeGroup]: true };
        try {
          localStorage.setItem('hrms_open_groups', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [location.pathname, activeGroup]);

  // Smooth toggle handler for groups
  const toggleGroup = (groupId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (collapsed) setCollapsed(false);
    setOpenGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem('hrms_open_groups', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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
    ...(role === UserRole.ADMIN || role === UserRole.EMPLOYER ? [{ id: 'settings', label: 'System Settings', icon: <Settings size={16} />, onClick: () => navigate('/settings') }] : []),
    { id: 'logout', label: 'Sign Out', icon: <LogOut size={16} />, danger: true, onClick: handleLogout }
  ];

  return (
    <div className="hrms-app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DemoBanner />
      <div className="hrms-layout" style={{ flex: 1 }}>
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
            <Link
              to="/"
              className="sidebar-brand"
              style={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                gap: '8px',
                padding: '4px',
                borderRadius: '8px',
              }}
            >
              <img
                src="/logo.png"
                alt={branding.name || 'Wokhman'}
                style={{
                  height: collapsed ? '28px' : '36px',
                  maxWidth: collapsed ? '28px' : '150px',
                  objectFit: 'contain',
                  display: 'block',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = branding.logo_url || '/hrms-logo.png';
                }}
              />
            </Link>
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          <nav className="sidebar-nav">
            {!collapsed && <div className="nav-section-title">Navigation</div>}

            {/* Direct Navigation Links (Dashboard, Chat, Platform Control) */}
            {directNavItems.map(item => {
              const isActive = pathMatches(item.path);
              const linkContent = (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-link-label">{item.label}</span>}
                  {!collapsed && item.badge && <span className="nav-badge">{item.badge}</span>}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={item.path} content={item.label} position="right">
                  {linkContent}
                </Tooltip>
              ) : (
                linkContent
              );
            })}

            {!collapsed && <div className="nav-section-title" style={{ marginTop: '0.6rem' }}>Modules</div>}

            {/* Collapsible Module Groups */}
            {visibleGroups.map(group => {
              const isGroupActive = group.id === activeGroup;
              const isSingleItem = group.items.length === 1;

              // If group has only 1 item (e.g. Reports & Analytics), render as direct top-level link for 1-click navigation!
              if (isSingleItem) {
                const singleItem = group.items[0];
                const isActive = pathMatches(singleItem.path);
                const directLink = (
                  <Link
                    key={group.id}
                    to={singleItem.path}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="nav-icon">{group.icon}</span>
                    {!collapsed && <span className="nav-link-label">{group.label}</span>}
                    {!collapsed && singleItem.badge && <span className="nav-badge">{singleItem.badge}</span>}
                  </Link>
                );

                return collapsed ? (
                  <Tooltip key={group.id} content={group.label} position="right">
                    {directLink}
                  </Tooltip>
                ) : (
                  directLink
                );
              }

              // Multi-item expandable module group
              const isExpanded = Boolean(openGroups[group.id]) && !collapsed;
              const groupButton = (
                <button
                  type="button"
                  className={`nav-group-trigger ${isGroupActive ? 'has-active-child' : ''}`}
                  onClick={(e) => toggleGroup(group.id, e)}
                  aria-expanded={isExpanded}
                  aria-controls={`nav-group-${group.id}`}
                  aria-label={collapsed ? group.label : undefined}
                >
                  <span className="nav-icon">{group.icon}</span>
                  {!collapsed && <span className="nav-group-label">{group.label}</span>}
                  {!collapsed && (isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />)}
                </button>
              );

              return (
                <div className={`nav-group ${isExpanded ? 'open' : ''}`} key={group.id}>
                  {collapsed ? <Tooltip content={group.label} position="right">{groupButton}</Tooltip> : groupButton}
                  <div className="nav-group-items" id={`nav-group-${group.id}`} aria-hidden={!isExpanded}>
                    {group.items.map(item => {
                      const isActive = pathMatches(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`nav-link nav-child-link ${isActive ? 'active' : ''}`}
                          onClick={() => setMobileOpen(false)}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className="nav-icon">{item.icon}</span>
                          <span className="nav-link-label">{item.label}</span>
                          {item.badge && (
                            <span className="nav-badge">{item.badge}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
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
                type="button"
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
              {/* Super Admin Multi-Tenant Company Scope Selector */}
              {isSuper && (
                <div
                  className="header-scope-selector"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  <Building2 size={15} style={{ color: 'var(--primary-500)' }} />
                  <span className="scope-selector-label" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Scope:</span>
                  <select
                    className="scope-select-dropdown"
                    aria-label="Select Company Scope"
                    value={activeTenantId || ''}
                    onChange={async (e) => {
                      const selectedVal = e.target.value || null;
                      setActiveTenantId(selectedVal);
                      await reloadBranding();
                      window.dispatchEvent(new Event('tenant-changed'));
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      outline: 'none',
                      cursor: 'pointer',
                      maxWidth: '180px',
                    }}
                  >
                    <option value="" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                      🌐 All Companies (Global View)
                    </option>
                    {companiesList.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                        🏢 {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Header Role Display / Switcher based on User Role */}
              <div className="header-role-container">
                {isDemo ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: '#a5b4fc',
                    }}
                  >
                    ⚡ Role: DEMO MODE
                  </div>
                ) : user?.role === UserRole.EMPLOYEE ? (
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
                    <User size={14} /> Employee: {user?.employeeId}
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
              </div>

              {/* Senior Designer Theme Mode Toggle Switcher */}
              <button
                type="button"
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}>
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
          <main className={`hrms-content ${location.pathname === '/chat' ? 'chat-page-content' : ''}`}>
            {children || <Outlet />}
          </main>

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
              type="button"
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

        {/* Restricted Feature in Demo Modal */}
        <Modal
          isOpen={Boolean(isRestrictedPath)}
          onClose={() => navigate('/')}
          title="⚡ Restricted Feature in Demo Mode"
        >
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <ShieldCheck size={28} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Enterprise Subscription Required
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 auto 1.5rem', maxWidth: '380px' }}>
              Administrative configurations, live banking transfers, and security settings are restricted in the public demo to safeguard system integrity.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <Button variant="primary" onClick={() => navigate('/')}>
                Return to Safe Dashboard
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Layout;
