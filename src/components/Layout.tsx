import React from 'react';
import { Mail, Shield, User, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Operations', icon: <LayoutDashboard size={18} /> },
    { path: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex">
      {/* Sidebar */}
      {user && (
        <aside className="w-64 border-r border-slate-800 bg-[#0f172a]/95 flex flex-col fixed h-full z-10">
          <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Mail size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">ZimMailShift</span>
            </div>
          </div>
          
          <nav className="flex-1 py-6 px-4 space-y-2">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active 
                      ? 'bg-blue-600/10 text-blue-400 font-medium' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 rounded-xl border border-slate-800/50 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <User size={16} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-white truncate">{user.email}</p>
                <p className="text-[10px] text-slate-500 uppercase flex items-center gap-1 mt-0.5">
                  <Shield size={10} /> Admin
                </p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${user ? 'ml-64' : ''}`}>
        {!user && (
          <nav className="border-b border-slate-800 bg-[#0f172a]/50 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Mail size={18} className="text-white" />
                  </div>
                  <span className="font-bold text-xl tracking-tight text-white">ZimMailShift</span>
                </div>
              </div>
            </div>
          </nav>
        )}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
