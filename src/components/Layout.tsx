import React from 'react';
import { Shield, User, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Operations', icon: <LayoutDashboard size={18} /> },
    { path: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  if (!user) {
    return (
      <div className="auth-page-wrapper">
        <nav className="public-nav">
          <div className="public-nav-inner">
            <div className="brand">
              <div className="brand-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
                <img src="/logo.png" alt="ZimMailShift" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span className="brand-name">ZimMailShift</span>
            </div>
          </div>
        </nav>
        {children}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
            <img src="/logo.png" alt="ZimMailShift" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="brand-name">ZimMailShift</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} className={`nav-item${active ? ' nav-item--active' : ''}`}>
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar"><User size={15} /></div>
            <div className="user-info">
              <span className="user-email">{user.email}</span>
              <span className="user-role"><Shield size={10} /> Admin</span>
            </div>
          </div>
          <button onClick={signOut} className="signout-btn">
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
};
