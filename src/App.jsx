import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase, getSettings } from './services/supabase';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Profile from './components/Profile';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard';
import CarManagement from './components/CarManagement';
import DriverManagement from './components/DriverManagement';
import TripManagement from './components/TripManagement';
import Analytics from './components/Analytics';
import DeliveryBoard from './components/DeliveryBoard';
import RouteCalculator from './components/RouteCalculator';
import './App.css';

const Icon = ({ d, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {d}
  </svg>
);

const LogOutIcon = () => (
  <Icon
    d={
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    }
  />
);

const SunIcon = () => (
  <Icon
    d={
      <>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </>
    }
  />
);

const MoonIcon = () => (
  <Icon d={<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />} />
);

const DashboardIcon = () => (
  <Icon
    d={
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    }
  />
);

const ProfileIcon = () => (
  <Icon
    d={
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    }
  />
);

const DriverIcon = () => (
  <Icon
    d={
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="M3 21v-2a7 7 0 0 1 14 0v2" />
      </>
    }
  />
);

const CarIcon = () => (
  <Icon
    d={
      <>
        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
        <path d="M5 9l2-4h10l2 4" />
      </>
    }
  />
);

const TripIcon = () => (
  <Icon d={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />} />
);

const AnalyticsIcon = () => (
  <Icon
    d={
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </>
    }
  />
);

const KanbanIcon = () => (
  <Icon
    d={
      <>
        <rect x="3" y="3" width="5" height="18" rx="1" />
        <rect x="10" y="3" width="5" height="11" rx="1" />
        <rect x="17" y="3" width="5" height="15" rx="1" />
      </>
    }
  />
);

const CalcIcon = () => (
  <Icon
    d={
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="10" y2="10" />
        <line x1="14" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="10" y2="14" />
        <line x1="14" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="10" y2="18" />
        <line x1="14" y1="18" x2="16" y2="18" />
      </>
    }
  />
);

const UsersIcon = () => (
  <Icon
    d={
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    }
  />
);

const SettingsIcon = () => (
  <Icon
    d={
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    }
  />
);

const MenuIcon = () => (
  <Icon
    size={18}
    d={
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    }
  />
);

const CloseIcon = () => (
  <Icon
    size={18}
    d={
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    }
  />
);

const ROLE_LABELS = {
  admin: 'Адмін',
  dispatcher: 'Диспетчер',
  driver: 'Водій',
  manager: 'Менеджер',
};

const ROLE_CLASS = {
  admin: 'admin',
  dispatcher: 'dispatcher',
  driver: 'driver',
  manager: 'manager',
};



function useOnlineUsers(user) {
  const [onlineUsers, setOnlineUsers] = React.useState([]);

  React.useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).map(arr => arr[0]).filter(Boolean);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: user.id, name: user.name, role: user.role });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return onlineUsers;
}

const ROLE_COLORS = {
  admin:      { bg: 'var(--red-600)',   },
  dispatcher: { bg: 'var(--blue-600)',  },
  manager:    { bg: '#7c3aed',          },
  driver:     { bg: 'var(--green-600)', },
};

function OnlineBadge({ onlineUsers, currentUserId }) {
  const [tooltip, setTooltip] = React.useState(null);

  if (!onlineUsers.length) return null;

  return (
    <div style={{
      padding: '0.5rem 0.75rem 0.625rem',
      borderBottom: '1px solid var(--bd-1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>

        {/* avatars row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, flexWrap: 'wrap' }}>
          {onlineUsers.map((u, i) => {
            const color = ROLE_COLORS[u.role] || ROLE_COLORS.driver;
            const isMe = u.id === currentUserId;
            return (
              <div
                key={u.id}
                style={{ position: 'relative' }}
                onMouseEnter={() => setTooltip(u.id)}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* avatar circle */}
                <div style={{
                  width: '26px', height: '26px',
                  borderRadius: '50%',
                  background: color.bg,
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid var(--surface)`,
                  outline: isMe ? `2px solid ${color.bg}` : 'none',
                  outlineOffset: '1px',
                  cursor: 'default',
                  userSelect: 'none',
                  flexShrink: 0,
                  transition: 'transform 120ms',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {(u.name || '?').charAt(0).toUpperCase()}
                </div>

                {/* green dot */}
                <span style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: '7px', height: '7px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '1.5px solid var(--surface)',
                  pointerEvents: 'none',
                }} />

                {/* tooltip — below avatar, aligned left */}
                {tooltip === u.id && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    background: 'var(--tx-1)',
                    color: 'var(--surface)',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--r-md)',
                    pointerEvents: 'none',
                    zIndex: 9999,
                    boxShadow: 'var(--sh-md)',
                  }}>
                    <div style={{
                      position: 'absolute',
                      bottom: '100%', left: '9px',
                      width: 0, height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderBottom: '4px solid var(--tx-1)',
                    }} />
                    {u.name || '—'}{isMe ? ' (ви)' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* pulse dot + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
          <span className="online-dot" style={{ width: '6px', height: '6px' }} />
          <span style={{
            fontSize: '0.72rem', fontWeight: 600,
            color: '#16a34a',
            fontFamily: 'var(--font-mono)',
          }}>
            {onlineUsers.length}
          </span>
        </div>
      </div>
    </div>
  );
}

function SidebarNav({ currentPage, setCurrentPage, hasPermission, user, deliveryEnabled }) {
  const isManager = user?.role === 'manager';
  const isDriver = user?.role === 'driver';

  const sections = useMemo(
    () => isDriver ? [
      {
        title: 'Поїздки',
        show: true,
        items: [{ id: 'trips', label: 'Мої поїздки', Icon: TripIcon }],
      },
      {
        title: 'Акаунт',
        items: [{ id: 'profile', label: 'Мій профіль', Icon: ProfileIcon }],
      },
    ] : isManager ? [
      {
        title: 'Доставки',
        show: deliveryEnabled,
        items: [{ id: 'delivery', label: 'Дошка доставок', Icon: KanbanIcon }],
      },
      {
        title: 'Акаунт',
        items: [{ id: 'profile', label: 'Мій профіль', Icon: ProfileIcon }],
      },
    ] : [
      {
        title: 'Головна',
        items: [
          { id: 'dashboard', label: 'Панель керування', Icon: DashboardIcon },
          { id: 'profile', label: 'Мій профіль', Icon: ProfileIcon },
        ],
      },
      {
        title: 'Управління',
        show:
          hasPermission('can_view_drivers') ||
          hasPermission('can_view_cars') ||
          hasPermission('can_view_trips'),
        items: [
          ...(hasPermission('can_view_drivers')
            ? [{ id: 'drivers', label: 'Водії', Icon: DriverIcon }]
            : []),
          ...(hasPermission('can_view_cars')
            ? [{ id: 'cars', label: 'Транспорт', Icon: CarIcon }]
            : []),
          ...(hasPermission('can_view_trips')
            ? [{ id: 'trips', label: 'Поїздки', Icon: TripIcon }]
            : []),
        ],
      },
      {
        title: 'Аналітика',
        show: hasPermission('can_view_analytics'),
        items: [{ id: 'analytics', label: 'Звіти та аналітика', Icon: AnalyticsIcon }],
      },
      {
        title: 'Інструменти',
        show: hasPermission('can_view_trips') || hasPermission('can_view_analytics'),
        items: [{ id: 'calculator', label: 'Калькулятор маршруту', Icon: CalcIcon }],
      },
      {
        title: 'Доставки',
        show: deliveryEnabled && hasPermission('can_view_delivery'),
        items: [{ id: 'delivery', label: 'Дошка доставок', Icon: KanbanIcon }],
      },
      {
        title: 'Адміністрування',
        show: hasPermission('can_manage_users'),
        items: [
          { id: 'users', label: 'Користувачі', Icon: UsersIcon },
          { id: 'settings', label: 'Налаштування', Icon: SettingsIcon },
        ],
      },
    ],
    [hasPermission, isManager, isDriver, deliveryEnabled]
  );

  return (
    <>
      {sections.map(
        (section, index) =>
          (section.show === undefined || section.show) &&
          section.items.length > 0 && (
            <div key={index} className="menu-section">
              <div className="menu-section-header">
                <h3>{section.title}</h3>
              </div>
              <div className="menu-items">
                {section.items.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCurrentPage(id)}
                    className={`menu-item${currentPage === id ? ' active' : ''}`}
                  >
                    <span className="menu-icon">
                      <Icon />
                    </span>
                    <span className="menu-label">{label}</span>
                    {currentPage === id && <span className="menu-indicator" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>
          )
      )}
    </>
  );
}

function AppContent() {
  const { isAuthenticated, user, logout, hasPermission, loading: authLoading } = useAuth();

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = user?.id ? localStorage.getItem(`tc-current-page-${user.id}`) : null;
    return saved || 'dashboard';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('tc-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);

  const onlineUsers = useOnlineUsers(isAuthenticated ? user : null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getSettings().then(data => {
      setDeliveryEnabled(data.delivery_board_enabled !== false);
    }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'manager' && currentPage !== 'delivery' && currentPage !== 'profile') {
      setCurrentPage('delivery');
    } else if (user.role === 'driver' && currentPage !== 'trips' && currentPage !== 'profile') {
      setCurrentPage('trips');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Listen for custom navigate events (e.g. from Profile.jsx)
  useEffect(() => {
    const handleNavigate = (e) => {
      if (e.detail) setCurrentPage(e.detail);
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  useEffect(() => {
    if (user?.id && user?.role !== 'manager' && user?.role !== 'driver') {
      localStorage.setItem(`tc-current-page-${user.id}`, currentPage);
    }
  }, [currentPage, user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tc-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1023;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [currentPage, isMobile]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileMenuOpen]);

  if (authLoading) {
    return (
      <div className="loading" style={{ minHeight: '100dvh' }}>
        <div className="loading-spinner" />
        Завантаження...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    if (user?.role === 'manager' && currentPage !== 'profile') {
      if (!deliveryEnabled) {
        return (
          <div className="container">
            <h2>Дошка доставок</h2>
            <div className="status warning">Дошку доставок вимкнено адміністратором.</div>
          </div>
        );
      }
      return (
        <ProtectedRoute requiredPermission="can_view_delivery">
          <DeliveryBoard />
        </ProtectedRoute>
      );
    }
    if (user?.role === 'driver' && currentPage !== 'profile') {
      return (
        <ProtectedRoute requiredPermission="can_view_trips">
          <TripManagement />
        </ProtectedRoute>
      );
    }
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'profile':
        return <Profile />;
      case 'users':
        return (
          <ProtectedRoute requiredPermission="can_manage_users">
            <UserManagement />
          </ProtectedRoute>
        );
      case 'settings':
        return (
          <ProtectedRoute requiredPermission="can_manage_users">
            <Settings />
          </ProtectedRoute>
        );
      case 'cars':
        return (
          <ProtectedRoute requiredPermission="can_view_cars">
            <CarManagement />
          </ProtectedRoute>
        );
      case 'drivers':
        return (
          <ProtectedRoute requiredPermission="can_view_drivers">
            <DriverManagement />
          </ProtectedRoute>
        );
      case 'trips':
        return (
          <ProtectedRoute requiredPermission="can_view_trips">
            <TripManagement />
          </ProtectedRoute>
        );
      case 'analytics':
        return (
          <ProtectedRoute requiredPermission="can_view_analytics">
            <Analytics />
          </ProtectedRoute>
        );
      case 'calculator':
        return <RouteCalculator />;
      case 'delivery':
        if (!deliveryEnabled) {
          return (
            <div className="container">
              <h2>Дошка доставок</h2>
              <div className="status warning">Дошку доставок вимкнено адміністратором.</div>
            </div>
          );
        }
        return (
          <ProtectedRoute requiredPermission="can_view_delivery">
            <DeliveryBoard />
          </ProtectedRoute>
        );
      default:
        return <Dashboard />;
    }
  };

  const handleUserCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setCurrentPage('profile');
    }
  };

  const handleOverlayClick = () => {
    setMobileMenuOpen(false);
  };

  const handleContentClick = () => {
    if (isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>Облік пробігів транспорту</h1>
        </div>

        <div className="user-profile">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Увімкнути темну тему' : 'Увімкнути світлу тему'}
            title={theme === 'light' ? 'Темна тема' : 'Світла тема'}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>

          <div
            className="user-card"
            onClick={() => setCurrentPage('profile')}
            onKeyDown={handleUserCardKeyDown}
            role="button"
            tabIndex={0}
            aria-label="Перейти до профілю"
          >
            <div className="profile-avatar" aria-hidden="true">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Користувач'}</div>
              <div className="user-email">{user?.email || 'email@example.com'}</div>
            </div>
            <span className={`user-role-badge ${ROLE_CLASS[user?.role] || ''}`}>
              {ROLE_LABELS[user?.role] || user?.role || 'Користувач'}
            </span>
          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={logout}
            title="Вийти"
            aria-label="Вийти"
          >
            <LogOutIcon />
          </button>
        </div>
      </header>

      <div
        className={`sidebar-overlay${mobileMenuOpen ? ' open' : ''}`}
        onClick={handleOverlayClick}
        onKeyDown={(e) => e.key === 'Escape' && setMobileMenuOpen(false)}
        role="presentation"
        aria-hidden="true"
      />

      <nav
        className={`sidebar${mobileMenuOpen ? ' open' : ''}`}
        aria-label="Головне меню"
        aria-hidden={!mobileMenuOpen && isMobile}
      >
        <OnlineBadge onlineUsers={onlineUsers} currentUserId={user?.id} />

        <SidebarNav
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          hasPermission={hasPermission}
          user={user}
          deliveryEnabled={deliveryEnabled}
        />

        {isMobile && (
          <div
            className="menu-section"
            style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--bd-1)' }}
          >
            <div className="menu-section-header">
              <h3>Сесія</h3>
            </div>
            <div className="menu-items">
              <div className="menu-item" style={{ cursor: 'default' }}>
                <span
                  className="menu-label"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--tx-3)',
                  }}
                >
                  {user?.email || 'Немає даних'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{
          marginTop: 'auto',
          padding: '0.875rem 0.75rem',
          borderTop: '1px solid var(--bd-1)',
        }}>
          <div style={{ marginBottom: '0.375rem' }}>
            <span className="company-badge">Trust Cargo v0.1</span>
          </div>
          <p style={{
            fontSize: '0.7rem',
            color: 'var(--tx-3)',
            lineHeight: 1.5,
            margin: '0 0 0.25rem',
          }}>
            Розроблено спеціально для транспортної компанії Trust Cargo
          </p>
          <p style={{
            fontSize: '0.7rem',
            color: 'var(--tx-4)',
            lineHeight: 1.5,
            margin: 0,
          }}>
            Розробник:{' '}
            <a
              href="mailto:simonovych.v@icloud.com"
              style={{
                color: 'var(--tx-3)',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--tx-2)'}
              onMouseLeave={e => e.target.style.color = 'var(--tx-3)'}
            >
              Сімонович Владислав
            </a>
          </p>
        </div>
      </nav>

      <div className="main-container">
        <main className="content" onClick={handleContentClick}>
          {renderPage()}
        </main>
      </div>

      {isMobile && (
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Закрити меню' : 'Відкрити меню'}
          aria-expanded={mobileMenuOpen}
          aria-controls="sidebar"
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}