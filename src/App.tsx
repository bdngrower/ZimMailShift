import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { AdminSettings } from "./pages/AdminSettings";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useSettings } from "./hooks/useSettings";
import { waitForMsalReady, getAccount } from "./lib/msal";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1221', color: '#475569' }}>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppContent = () => {
  const { user } = useAuth();
  const { settings, loading } = useSettings();
  const [msalAccount, setMsalAccount] = useState<any>(null);
  const [msalReady, setMsalReady] = useState(false);

  // Wait for MSAL to finish processing the redirect (if any)
  useEffect(() => {
    waitForMsalReady().then(() => {
      const account = getAccount();
      if (account) setMsalAccount(account);
      setMsalReady(true);
    });
  }, []);

  if (loading || !msalReady) return null;

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard msalAccount={msalAccount} setMsalAccount={setMsalAccount} />
          </ProtectedRoute>
        } />
        
        <Route path="/admin/settings" element={
          <ProtectedRoute>
            <AdminSettings msalAccount={msalAccount} setMsalAccount={setMsalAccount} />
          </ProtectedRoute>
        } />
        
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
