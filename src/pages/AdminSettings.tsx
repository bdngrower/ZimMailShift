import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Settings, Key, Globe, CheckCircle2, LogIn, Loader2,
  ChevronDown, ChevronUp, ExternalLink, BookOpen, AlertCircle, User, ShieldCheck
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { initializeMsal, getMsalInstance, safeLoginPopup } from '../lib/msal';

export const AdminSettings: React.FC = () => {
  const { settings, saveSettings, loading } = useSettings();
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [saved, setSaved] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedUser, setValidatedUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setTenantId(settings.tenantId || '');
      setClientId(settings.clientId || '');
      if (settings.tenantId && settings.clientId) {
        setGuideOpen(false);
      }
    }
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings = { tenantId, clientId, redirectUri: window.location.origin };
    saveSettings(newSettings);
    try {
      initializeMsal(newSettings);
    } catch (err) {
      console.error('Erro ao inicializar MSAL', err);
    }
    setSaved(true);
    setValidatedUser(null); // Reset validation on new save
    setTimeout(() => setSaved(false), 4000);
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationError(null);
    setValidatedUser(null);

    // Ensure MSAL is initialized with current settings
    if (settings?.clientId && settings?.tenantId) {
      try {
        initializeMsal(settings);
      } catch (e) {
        console.error(e);
      }
    }

    const msal = getMsalInstance();
    if (!msal) {
      setValidationError('MSAL não inicializado. Salve as configurações primeiro.');
      setValidating(false);
      return;
    }

    try {
      const res = await safeLoginPopup(msal, ['User.Read', 'Directory.Read.All']);
      if (res?.account) {
        msal.setActiveAccount(res.account);
        setValidatedUser({
          name: res.account.name || res.account.username,
          email: res.account.username,
        });
      }
    } catch (e: any) {
      if (e.errorCode !== 'user_cancelled') {
        const errorMsg = e.message || e.errorCode || 'Erro desconhecido';
        setValidationError(`Falha na validação: ${errorMsg}`);
      }
      console.error(e);
    } finally {
      setValidating(false);
    }
  };

  if (loading) return <div style={{ color: '#475569', padding: '2rem' }}>Carregando...</div>;

  const isConfigured = !!(settings?.tenantId && settings?.clientId);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '680px' }}>

      {/* ── ETAPA 1: Guia do App Registration ── */}
      <div className="settings-card">
        <button
          onClick={() => setGuideOpen(v => !v)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div className="settings-header" style={{ margin: 0 }}>
            <div className="settings-icon" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>
              <BookOpen size={18} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div className="settings-title">Etapa 1 — Guia de Registro do Aplicativo no Azure</div>
              <div className="settings-subtitle">Permissões e configurações necessárias no Portal Azure</div>
            </div>
            <div style={{ color: '#475569', marginLeft: '1rem' }}>
              {guideOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {guideOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="settings-body" style={{ paddingTop: 0 }}>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  <GuideStep number="A" title="Criar um Registro de Aplicativo (App Registration)">
                    <p>Acesse <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="guide-link">Portal Azure → Registros de Aplicativo <ExternalLink size={11} /></a> e clique em <strong>Novo registro</strong>.</p>
                    <ul>
                      <li>Nome: <code>ZimMailShift</code></li>
                      <li>Tipos de conta: <strong>Contas apenas neste diretório organizacional</strong></li>
                      <li>URI de Redirecionamento: <strong>Aplicativo de página única (SPA)</strong> → <code>{window.location.origin}</code></li>
                    </ul>
                  </GuideStep>

                  <GuideStep number="B" title="Copiar os IDs">
                    <p>Após criar o registro, na página <strong>Visão Geral</strong>, copie:</p>
                    <ul>
                      <li><strong>ID do Aplicativo (cliente)</strong> → colar no campo "Client ID" abaixo</li>
                      <li><strong>ID do Diretório (locatário)</strong> → colar no campo "Tenant ID" abaixo</li>
                    </ul>
                  </GuideStep>

                  <GuideStep number="C" title="Configurar Permissões da API" highlight>
                    <p>Vá em <strong>Permissões de API → Adicionar permissão → Microsoft Graph → Permissões delegadas</strong> e adicione:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.5rem 0' }}>
                      {['User.Read','Mail.Read','Mail.ReadWrite','Mail.ReadWrite.Shared','Mail.Send','Directory.Read.All'].map(p => (
                        <code key={p} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.78rem', color: '#a5b4fc' }}>{p}</code>
                      ))}
                    </div>
                    <p style={{ color: '#fb923c' }}>⚠ Após adicionar, clique em <strong>"Conceder consentimento do administrador para [seu tenant]"</strong> — isso é obrigatório para acessar caixas compartilhadas.</p>
                  </GuideStep>

                  <GuideStep number="D" title="Configurações de Autenticação">
                    <p>Em <strong>Autenticação</strong>, verifique:</p>
                    <ul>
                      <li>Plataforma: <strong>Aplicativo de página única (SPA)</strong></li>
                      <li>URI de Redirecionamento inclui: <code>{window.location.origin}</code></li>
                      <li>Ative <strong>Tokens de acesso</strong> e <strong>Tokens de ID</strong> em Concessão implícita</li>
                    </ul>
                  </GuideStep>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── ETAPA 2: Configuração do Tenant ── */}
      <div className="settings-card">
        <div className="settings-header">
          <div className="settings-icon"><Settings size={20} /></div>
          <div>
            <div className="settings-title">Etapa 2 — Configuração do Tenant</div>
            <div className="settings-subtitle">Insira os IDs obtidos no Registro do Aplicativo Azure</div>
          </div>
        </div>
        <form onSubmit={handleSave}>
          <div className="settings-body">
            {saved && (
              <div className="success-banner">
                <CheckCircle2 size={16} /> Configurações salvas com sucesso!
              </div>
            )}

            <div className="settings-fields">
              <div>
                <div className="settings-input-icon"><Globe size={14} /> Tenant ID (ID do Diretório)</div>
                <input type="text" value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="form-input" required />
                <div className="settings-hint">Encontrado em Registro de Aplicativo → Visão Geral → ID do Diretório (locatário).</div>
              </div>
              <div>
                <div className="settings-input-icon"><Key size={14} /> Client ID (ID do Aplicativo)</div>
                <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="form-input" required />
                <div className="settings-hint">Encontrado em Registro de Aplicativo → Visão Geral → ID do Aplicativo (cliente).</div>
              </div>
            </div>
          </div>
          <div className="settings-footer">
            <button type="submit" className="settings-save">
              <Save size={16} /> Salvar Configuração
            </button>
          </div>
        </form>
      </div>

      {/* ── ETAPA 3: Validação com conta Global Admin ── */}
      <div className="settings-card" style={{ opacity: isConfigured ? 1 : 0.4, pointerEvents: isConfigured ? 'auto' : 'none' }}>
        <div className="settings-header">
          <div className="settings-icon" style={{ background: validatedUser ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)', color: validatedUser ? '#4ade80' : '#60a5fa' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="settings-title">Etapa 3 — Validar App Registration</div>
            <div className="settings-subtitle">Conecte com a conta Administrador Global para validar o registro</div>
          </div>
        </div>
        <div className="settings-body">
          {!isConfigured && (
            <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
              Salve o Tenant ID e Client ID na Etapa 2 antes de validar.
            </p>
          )}

          {isConfigured && !validatedUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                Faça login com a conta <strong style={{ color: '#94a3b8' }}>Administrador Global do Microsoft 365</strong> para validar
                que o App Registration está configurado corretamente e que as permissões foram concedidas.
              </p>

              {validationError && (
                <div className="login-error" style={{ margin: 0 }}>
                  <AlertCircle size={14} /> {validationError}
                </div>
              )}

              <button onClick={handleValidate} disabled={validating} className="btn-ms365" style={{ width: 'fit-content' }}>
                {validating ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {validating ? 'Conectando...' : 'Conectar com conta Admin Global'}
              </button>
            </div>
          )}

          {validatedUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', flexShrink: 0 }}>
                <User size={20} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{validatedUser.name}</div>
                <div style={{ color: '#475569', fontSize: '0.78rem' }}>{validatedUser.email}</div>
              </div>
              <div className="success-banner" style={{ margin: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                <CheckCircle2 size={13} /> Validado
              </div>
            </div>
          )}

          {validatedUser && (
            <div className="success-banner" style={{ marginTop: '1rem', background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>
              <CheckCircle2 size={16} /> App Registration validado com sucesso! Acesse a aba <strong>Operações</strong> para iniciar as migrações.
            </div>
          )}
        </div>
      </div>

    </motion.div>
  );
};

// Componente auxiliar para etapas do guia
const GuideStep: React.FC<{ number: string; title: string; highlight?: boolean; children: React.ReactNode }> = ({ number, title, highlight, children }) => (
  <div style={{ display: 'flex', gap: '1rem' }}>
    <div style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: highlight ? 'rgba(251,146,60,0.12)' : 'rgba(59,130,246,0.12)',
      color: highlight ? '#fb923c' : '#60a5fa',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: '0.8rem'
    }}>{number}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{title}</div>
      <div className="guide-content">{children}</div>
    </div>
  </div>
);
