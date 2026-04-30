import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Settings, Key, Globe, CheckCircle2, Loader2,
  ChevronDown, ChevronUp, ExternalLink, BookOpen, AlertCircle, User, ShieldCheck, Trash2
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export const AdminSettings: React.FC = () => {
  const { profiles, activeProfile, activeProfileId, saveProfile, deleteProfile, switchActiveProfile, loading } = useSettings();
  
  const [profileName, setProfileName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saved, setSaved] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    if (activeProfile) {
      setProfileName(activeProfile.name || '');
      setTenantId(activeProfile.tenantId || '');
      setClientId(activeProfile.clientId || '');
      setClientSecret(activeProfile.clientSecret || '');
      if (activeProfile.tenantId && activeProfile.clientId && activeProfile.clientSecret) {
        setGuideOpen(false);
      }
    } else {
      handleNewProfile();
    }
  }, [activeProfile]);

  const handleNewProfile = () => {
    setProfileName('');
    setTenantId('');
    setClientId('');
    setClientSecret('');
    setGuideOpen(true);
    setIsValidated(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const id = activeProfile?.id || Date.now().toString();
    const newSettings = { 
      id, 
      name: profileName || `Cliente ${profiles.length + 1}`,
      tenantId, 
      clientId, 
      clientSecret, 
      redirectUri: window.location.origin 
    };
    saveProfile(newSettings);
    setSaved(true);
    setIsValidated(false);
    setTimeout(() => setSaved(false), 4000);
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationError(null);
    try {
      const res = await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          clientId,
          clientSecret,
          action: 'search_users',
          query: 'test'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na API');
      setIsValidated(true);
    } catch (e: any) {
      setValidationError(`Erro ao validar conexão: ${e.message}`);
    } finally {
      setValidating(false);
    }
  };

  if (loading) return <div style={{ color: '#475569', padding: '2rem' }}>Carregando...</div>;

  const isConfigured = !!(tenantId && clientId);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '680px' }}>

      {/* ── SELEÇÃO DE CLIENTE ── */}
      <div className="settings-card">
        <div className="settings-header" style={{ marginBottom: '1rem' }}>
          <div className="settings-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
            <User size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="settings-title">Seleção de Cliente (Tenant)</div>
            <div className="settings-subtitle">Selecione um cliente configurado ou crie um novo</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select 
            className="form-input" 
            style={{ flex: 1 }}
            value={activeProfileId || 'new'}
            onChange={(e) => {
              if (e.target.value === 'new') handleNewProfile();
              else switchActiveProfile(e.target.value);
            }}
          >
            <option value="new">+ Criar Novo Cliente</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {activeProfile && (
            <button 
              type="button" 
              onClick={() => {
                if(confirm('Tem certeza que deseja excluir as configurações deste cliente?')) {
                  deleteProfile(activeProfile.id);
                }
              }}
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '0.65rem', borderRadius: 8, cursor: 'pointer' }}
              title="Excluir Cliente"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── ETAPA 1: Guia ── */}
      <div className="settings-card">
        <button onClick={() => setGuideOpen(v => !v)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
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

                  <GuideStep number="B" title="Criar um Segredo do Cliente (Client Secret)">
                    <p>No menu lateral, vá em <strong>Certificados e segredos → Novo segredo do cliente</strong>.</p>
                    <ul>
                      <li>Dê uma descrição (ex: <code>ZimMailShift Secret</code>) e escolha uma validade.</li>
                      <li>Copie o <strong>Valor</strong> do segredo imediatamente e cole abaixo (ele será ocultado depois).</li>
                    </ul>
                  </GuideStep>

                  <GuideStep number="C" title="Copiar os IDs">
                    <p>Na <strong>Visão Geral</strong> copie:</p>
                    <ul>
                      <li><strong>ID do Aplicativo (cliente)</strong> → Client ID abaixo</li>
                      <li><strong>ID do Diretório (locatário)</strong> → Tenant ID abaixo</li>
                    </ul>
                  </GuideStep>

                  <GuideStep number="D" title="Configurar Permissões da API (Application)" highlight>
                    <p>Vá em <strong>Permissões de API → Microsoft Graph → Permissões de Aplicativo (Application permissions)</strong> e adicione:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.5rem 0' }}>
                      {['User.Read.All','Mail.ReadWrite'].map(p => (
                        <code key={p} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.78rem', color: '#a5b4fc' }}>{p}</code>
                      ))}
                    </div>
                    <p style={{ color: '#fb923c' }}>⚠ Clique em <strong>"Conceder consentimento do administrador"</strong> após adicionar.</p>
                  </GuideStep>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── ETAPA 2: Configuração ── */}
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
              <div className="success-banner"><CheckCircle2 size={16} /> Configurações salvas com sucesso!</div>
            )}
            <div className="settings-fields">
              <div>
                <div className="settings-input-icon"><User size={14} /> Nome de Identificação do Cliente</div>
                <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Ex: Cliente XYZ" className="form-input" required />
              </div>
              <div>
                <div className="settings-input-icon"><Globe size={14} /> Tenant ID (ID do Diretório)</div>
                <input type="text" value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="form-input" required />
              </div>
              <div>
                <div className="settings-input-icon"><Key size={14} /> Client ID (ID do Aplicativo)</div>
                <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="form-input" required />
              </div>
              <div>
                <div className="settings-input-icon"><Key size={14} /> Client Secret (Valor do Segredo)</div>
                <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Insira o Valor do Segredo do Cliente" className="form-input" required />
              </div>
            </div>
          </div>
          <div className="settings-footer">
            <button type="submit" className="settings-save"><Save size={16} /> Salvar Configuração</button>
          </div>
        </form>
      </div>

      {/* ── ETAPA 3: Validação ── */}
      <div className="settings-card" style={{ opacity: isConfigured ? 1 : 0.4, pointerEvents: isConfigured ? 'auto' : 'none' }}>
        <div className="settings-header">
          <div className="settings-icon" style={{ background: isValidated ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)', color: isValidated ? '#4ade80' : '#60a5fa' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="settings-title">Etapa 3 — Validar App Registration</div>
            <div className="settings-subtitle">Teste a conexão via proxy backend</div>
          </div>
        </div>
        <div className="settings-body">
          {!isConfigured && (
            <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
              Salve o Tenant ID e Client ID antes de validar.
            </p>
          )}

          {isConfigured && !isValidated && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                Clique abaixo para testar a conexão com a Graph API via Application Permissions.
              </p>
              {validationError && (
                <div className="login-error" style={{ margin: 0 }}>
                  <AlertCircle size={14} /> {validationError}
                </div>
              )}
              <button onClick={handleValidate} disabled={validating} className="btn-ms365" style={{ width: 'fit-content' }}>
                {validating ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {validating ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>
          )}

          {isValidated && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', flexShrink: 0 }}>
                  <User size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>Conexão Estabelecida</div>
                  <div style={{ color: '#475569', fontSize: '0.78rem' }}>Permissões de Aplicativo Ativas</div>
                </div>
                <div className="success-banner" style={{ margin: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                  <CheckCircle2 size={13} /> Validado
                </div>
              </div>
              <div className="success-banner" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                <CheckCircle2 size={16} /> App Registration validado! Acesse <strong>Operações</strong> para iniciar migrações.
              </div>
            </>
          )}
        </div>
      </div>

    </motion.div>
  );
};

const GuideStep: React.FC<{ number: string; title: string; highlight?: boolean; children: React.ReactNode }> = ({ number, title, highlight, children }) => (
  <div style={{ display: 'flex', gap: '1rem' }}>
    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: highlight ? 'rgba(251,146,60,0.12)' : 'rgba(59,130,246,0.12)', color: highlight ? '#fb923c' : '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{number}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{title}</div>
      <div className="guide-content">{children}</div>
    </div>
  </div>
);
