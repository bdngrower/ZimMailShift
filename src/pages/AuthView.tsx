import React from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../lib/msal";
import { motion } from "framer-motion";
import { LogIn, Shield, ArrowRight } from "lucide-react";

interface AuthViewProps {
  onAuthenticated: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
      onAuthenticated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card"
      >
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">
          Securely manage and shift your Microsoft 365 emails with intelligent automation.
        </p>
        
        <button
          onClick={handleLogin}
          className="btn-microsoft"
        >
          <LogIn size={18} />
          Sign in with Microsoft
        </button>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
          <Shield size={12} />
          <span>Azure Active Directory Protected</span>
        </div>

        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
          <span style={{ color: '#64748b' }}>New to ZimMailShift?</span>
          <a href="#" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Request Access <ArrowRight size={14} />
          </a>
        </div>
      </motion.div>
    </div>
  );
};
