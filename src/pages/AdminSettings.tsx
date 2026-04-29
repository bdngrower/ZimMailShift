import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Settings, Key, Globe, CheckCircle2,
  ChevronDown, ChevronUp, ExternalLink, BookOpen
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { initializeMsal } from '../lib/msal';

export const AdminSettings: React.FC = () => {
  const { settings, saveSettings, loading } = useSettings();
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [saved, setSaved] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  useEffect(() => {
    if (settings) {
      setTenantId(settings.tenantId || '');
      setClientId(settings.clientId || '');
      // If already configured, collapse the guide
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
      console.error('MSAL init error', err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
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
                <CheckCircle2 size={16} /> Configurações salvas com sucesso! O sistema está pronto para uso.
              </div>
            )}

            {isConfigured && !saved && (
              <div className="success-banner" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                <CheckCircle2 size={16} /> Configuração ativa. Para operar, acesse a aba <strong>Operações</strong> e conecte sua conta Microsoft 365.
              </div>
            )}

            <div className="settings-fields">
              <div>
                <div className="settings-input-icon"><Globe size={14} /> Tenant ID (ID do Diretório)</div>
                <input
                  type="text"
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="form-input"
                  required
                />
                <div className="settings-hint">Encontrado em Registro de Aplicativo → Visão Geral → ID do Diretório (locatário).</div>
              </div>
              <div>
                <div className="settings-input-icon"><Key size={14} /> Client ID (ID do Aplicativo)</div>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="form-input"
                  required
                />
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
