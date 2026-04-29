import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Loader2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Invalid credentials. Please check your email and password.');
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-page">
      {/* Background decoration */}
      <div className="login-bg-glow-1" />
      <div className="login-bg-glow-2" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="login-card"
      >
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Mail size={22} />
          </div>
          <span className="login-brand-name">ZimMailShift</span>
        </div>

        <div className="login-header">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to your administration account</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="login-error"
          >
            <Shield size={14} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label className="login-label">Email address</label>
            <div className="login-input-wrapper">
              <Mail className="login-input-icon" size={16} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="login-input"
                placeholder="admin@company.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" size={16} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="login-input"
                placeholder="••••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-submit"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <LogIn size={18} />
            )}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="login-footer">
          <Shield size={12} />
          <span>Secured by Supabase Auth · Enterprise Grade</span>
        </div>
      </motion.div>
    </div>
  );
};
