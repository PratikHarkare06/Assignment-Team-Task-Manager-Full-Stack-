import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../services/api';
import { logout } from '../redux/slices/authSlice';
import {
  LayoutDashboard, FolderOpen, CheckSquare, Users,
  BarChart2, Settings, LogOut, Bell, Search, Rocket,
  ChevronLeft, ChevronRight, Moon, Sun, X
} from 'lucide-react';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',  icon: FolderOpen,       label: 'Projects'   },
  { to: '/tasks',     icon: CheckSquare,       label: 'Tasks'      },
  { to: '/team',      icon: Users,             label: 'Team'       },
  { to: '/analytics', icon: BarChart2,         label: 'Analytics'  },
];

export default function AppLayout() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user }  = useSelector(s => s.auth);
  const [search,        setSearch]        = useState('');
  const [searchResults, setSearchResults] = useState({ tasks: [], projects: [] });
  const [isSearching,   setIsSearching]   = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const searchBoxRef = useRef(null);

  // Default sidebar to OPEN (false = not collapsed)
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode,  setDarkMode]  = useState(
    () => localStorage.getItem('theme-dark') === 'true'
  );

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme-dark', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const syncTheme = () => {
      setDarkMode(localStorage.getItem('theme-dark') === 'true');
    };
    window.addEventListener('theme-change', syncTheme);
    return () => window.removeEventListener('theme-change', syncTheme);
  }, []);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K or / to search, N to open tasks)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search');
        if (searchInput) searchInput.focus();
      } else if (!isInput && e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search');
        if (searchInput) searchInput.focus();
      } else if (!isInput && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        navigate('/tasks');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    if (!user?._id) return;

    // Fetch initial unread count
    api.get('/notifications').then(res => {
      if (res.data?.success) {
        setUnreadCount(res.data.data.filter(n => !n.isRead).length);
      }
    }).catch(() => {});

    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('/api', '');
    const socket = io(socketUrl);

    socket.emit('join_user_room', user._id);

    socket.on('new_notification', (notification) => {
      setUnreadCount(prev => prev + 1);
      toast(notification.title, { icon: '🔔' });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Debounced search logic
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults({ tasks: [], projects: [] });
      setShowSearchDrop(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(q)}`)
        .then(res => {
          if (res.data?.success) {
            setSearchResults({
              tasks: res.data.tasks || [],
              projects: res.data.projects || [],
            });
            setShowSearchDrop(true);
          }
        })
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearchDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <aside style={{
        width:         collapsed ? 68 : 240,
        minWidth:      collapsed ? 68 : 240,
        background:    'var(--surface)',
        borderRight:   '1px solid var(--border)',
        display:       'flex',
        flexDirection: 'column',
        height:        '100vh',
        overflowY:     'auto',
        overflowX:     'hidden',
        transition:    'width .2s ease, min-width .2s ease',
      }}>

        {/* Logo row */}
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:          10,
          padding:      '0 14px',
          minHeight:    60,
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Rocket icon always visible */}
          <div style={{
            width: 34, height: 34, background: 'var(--accent)',
            borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', flexShrink: 0,
          }}>
            <Rocket size={18} />
          </div>

          {/* App name — hidden when collapsed */}
          {!collapsed && (
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700, fontSize: '1.05rem',
              color: 'var(--text-1)', whiteSpace: 'nowrap',
            }}>
              Momentum
            </span>
          )}

          {/* Collapse arrow — always at the end */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              marginLeft:      'auto',
              width:            26, height: 26,
              borderRadius:     6,
              border:          'none',
              background:      'transparent',
              color:           'var(--text-3)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              cursor:          'pointer',
              flexShrink:       0,
            }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Main nav links */}
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              style={collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}}
            >
              <Icon size={17} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom links */}
        <div style={{ padding: '8px 8px 0' }}>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />

          <NavLink
            to="/notifications"
            title={collapsed ? 'Notifications' : undefined}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            style={collapsed ? { justifyContent: 'center', padding: '10px 0', position: 'relative' } : { position: 'relative' }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 8, left: collapsed ? 34 : 26,
                background: 'var(--accent)', color: 'white', fontSize: '0.6rem',
                fontWeight: 700, borderRadius: '50%', padding: '0 4px', minWidth: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {!collapsed && <span>Notifications</span>}
          </NavLink>

          <NavLink
            to="/settings"
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            style={collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}}
          >
            <Settings size={17} />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          {/* Logout button — always visible in sidebar */}
          <button
            className="nav-item"
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            style={{
              color: 'var(--accent)',
              ...(collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}),
            }}
          >
            <LogOut size={17} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* User chip */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <div
            className="user-chip"
            onClick={() => navigate('/settings')}
            style={collapsed ? { justifyContent: 'center', background: 'transparent', padding: '8px 0' } : {}}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="User" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div className="avatar" style={{ background: 'var(--accent)', flexShrink: 0 }}>
                {getInitials(user?.name || 'U')}
              </div>
            )}
            {!collapsed && (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 500 }}>
                  {user?.role || 'member'}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="search-box" ref={searchBoxRef} style={{ position: 'relative', minWidth: 280 }}>
            <Search size={14} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => { if (search.trim().length >= 2) setShowSearchDrop(true); }}
              placeholder="Search tasks or projects... (⌘K)"
              id="global-search"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setShowSearchDrop(false); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, display: 'flex' }}
              >
                <X size={13} />
              </button>
            )}

            {/* Live Search Dropdown */}
            {showSearchDrop && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                zIndex: 9999, overflow: 'hidden', maxHeight: 380, overflowY: 'auto',
                padding: '8px 0',
              }}>
                {isSearching ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-3)' }}>
                    Searching...
                  </div>
                ) : (searchResults.tasks.length === 0 && searchResults.projects.length === 0) ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-3)' }}>
                    No results matching "{search}"
                  </div>
                ) : (
                  <>
                    {searchResults.tasks.length > 0 && (
                      <div>
                        <div style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Tasks ({searchResults.tasks.length})
                        </div>
                        {searchResults.tasks.map(t => (
                          <div
                            key={t._id}
                            onClick={() => {
                              setShowSearchDrop(false);
                              setSearch('');
                              navigate('/tasks');
                            }}
                            style={{
                              padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-1)' }}>{t.title}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>📁 {t.projectId?.title || 'General'}</div>
                            </div>
                            <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{t.status}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.projects.length > 0 && (
                      <div style={{ borderTop: searchResults.tasks.length > 0 ? '1px solid var(--border)' : 'none', marginTop: 4, paddingTop: 4 }}>
                        <div style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Projects ({searchResults.projects.length})
                        </div>
                        {searchResults.projects.map(p => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setShowSearchDrop(false);
                              setSearch('');
                              navigate('/projects');
                            }}
                            style={{
                              padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-1)' }}>{p.title}</div>
                              {p.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{p.description}</div>}
                            </div>
                            <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{p.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            {/* Dark mode toggle */}
            <button
              className="icon-btn"
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="icon-btn" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: 'var(--accent)', width: 8, height: 8, borderRadius: '50%'
                }} />
              )}
            </button>

            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Profile"
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => navigate('/settings')}
              />
            ) : (
              <div
                className="avatar avatar-lg"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/settings')}
              >
                {getInitials(user?.name || 'U')}
              </div>
            )}
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
