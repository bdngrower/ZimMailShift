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
      setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow-1" />
      <div className="login-bg-glow-2" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="login-card"
      >
        <div className="login-brand">
          <div className="login-brand-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
            <img src="/logo.png" alt="ZimMailShift" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="login-brand-name">ZimMailShift</span>
        </div>

        <div className="login-header">
          <h1 className="login-title">Bem-vindo de volta</h1>
          <p className="login-subtitle">Entre na sua conta de administração</p>
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
            <label className="login-label">Endereço de e-mail</label>
            <div className="login-input-wrap">
              <Mail className="login-input-icon" size={16} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="login-input"
                placeholder="admin@empresa.com.br"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Senha</label>
            <div className="login-input-wrap">
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

          <button type="submit" disabled={loading} className="login-submit">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <Shield size={12} />
          <span>Autenticação segura via Supabase</span>
        </div>
      </motion.div>
    </div>
  );
};
