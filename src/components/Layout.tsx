import React from 'react';
import { Mail, Shield, User } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="brand">
            <div className="brand-logo">
              <Mail size={18} />
            </div>
            <span className="brand-name">ZimMailShift</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
              <Shield size={14} />
              <span>Azure AD</span>
            </div>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
