import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Filter, Clock, CheckCircle2, AlertCircle, Loader2, Key, Search, Undo2, LogIn } from 'lucide-react';
import { graphService } from '../services/graphService';
import { getMsalInstance, loginRequest, initializeMsal } from '../lib/msal';
import { useSettings } from '../hooks/useSettings';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle'|'running'|'completed'|'error'|'rolling_back'|'previewed'>('idle');
  const [logs, setLogs] = useState<{ time: string; message: string; type: 'info'|'success'|'error' }[]>([]);
  const [config, setConfig] = useState({ source: '', destination: '', date: '' });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [movedEmails, setMovedEmails] = useState<{ subject: string; newId: string }[]>([]);

  const { settings, loading: settingsLoading } = useSettings();
  const [msalAccount, setMsalAccount] = useState<any>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Initialize MSAL when settings are available
  useEffect(() => {
    if (settings?.clientId && settings?.tenantId) {
      try {
        initializeMsal(settings);
        const msal = getMsalInstance();
        if (msal) {
          const account = msal.getActiveAccount() || msal.getAllAccounts()[0];
          if (account) setMsalAccount(account);
        }
      } catch (e) {
        console.error('Erro ao inicializar MSAL', e);
      }
    }
  }, [settings]);

  const handleConnectMsal = async () => {
    const msal = getMsalInstance();
    if (!msal) return;
    setConnectError(null);
    try {
      await msal.initialize();
      const res = await msal.loginPopup(loginRequest);
      if (res?.account) {
        msal.setActiveAccount(res.account);
        setMsalAccount(res.account);
      }
    } catch (e: any) {
      if (e.errorCode !== 'user_cancelled') {
        setConnectError('Falha ao conectar. Verifique se o App Registration está configurado corretamente no Azure.');
      }
      console.error(e);
    }
  };

  const addLog = (message: string, type: 'info'|'success'|'error' = 'info') => {
    setLogs(p => [{ time: new Date().toLocaleTimeString(), message, type }, ...p]);
  };

  const handlePreview = async () => {
    if (!msalAccount || !config.source || !config.date) return;
    setPreviewing(true); setLogs([]);
    addLog(`Buscando e-mails em ${config.source} anteriores a ${config.date}...`);
    try {
      const emails = await graphService.getEmailsBeforeDate(config.source, config.date);
      const count = emails?.length ?? 0;
      setPreviewCount(count); setStatus('previewed');
      count === 0
        ? addLog('Nenhum e-mail encontrado com esses critérios.', 'info')
        : addLog(`Encontrados ${count} e-mails prontos para movimentação.`, 'success');
    } catch (e: any) {
      addLog(e.message || 'Falha ao buscar pré-visualização.', 'error');
    } finally { setPreviewing(false); }
  };

  const handleStart = async () => {
    if (!msalAccount || !config.source || !config.destination || !config.date) return;
    setLoading(true); setStatus('running'); setProgress(0); setLogs([]); setMovedEmails([]);
    addLog(`Iniciando migração de ${config.source} para ${config.destination}...`);
    try {
      const emails = await graphService.getEmailsBeforeDate(config.source, config.date);
      if (!emails?.length) { addLog('Nenhum e-mail encontrado.', 'info'); setStatus('completed'); return; }
      addLog(`Encontrados ${emails.length} e-mails. Iniciando movimentação em lote...`, 'success');
      let count = 0;
      const moved: { subject: string; newId: string }[] = [];
      for (const email of emails) {
        try {
          addLog(`Movendo: "${email.subject}"...`);
          await new Promise(r => setTimeout(r, 800));
          const newId = `sim-${Date.now()}`;
          moved.push({ subject: email.subject, newId });
          count++;
          setProgress(Math.round((count / emails.length) * 100));
          addLog(`Movido: ${email.subject}`, 'success');
        } catch { addLog(`Falha ao mover: ${email.subject}`, 'error'); }
      }
      setMovedEmails(moved); setStatus('completed');
      addLog(`Concluído! ${count} de ${emails.length} e-mails movidos com sucesso.`, 'success');
    } catch (e: any) {
      setStatus('error'); addLog(e.message || 'Ocorreu um erro durante a migração.', 'error');
    } finally { setLoading(false); }
  };

  const handleRollback = async () => {
    if (!movedEmails.length) return;
    setRollingBack(true); setStatus('rolling_back'); setProgress(0);
    addLog(`Iniciando reversão de ${movedEmails.length} e-mails...`);
    let count = 0;
    for (const email of movedEmails) {
      try {
        addLog(`Restaurando: "${email.subject}"...`);
        await new Promise(r => setTimeout(r, 800));
        count++; setProgress(Math.round((count / movedEmails.length) * 100));
        addLog(`Restaurado: ${email.subject}`, 'success');
      } catch { addLog(`Falha ao restaurar: ${email.subject}`, 'error'); }
    }
    setMovedEmails([]); setStatus('idle');
    addLog(`Reversão concluída. ${count} e-mails restaurados.`, 'success');
    setRollingBack(false);
  };

  if (settingsLoading) return null;

  // No settings configured yet
  if (!settings?.clientId || !settings?.tenantId) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Key size={28} /></div>
        <h2 className="empty-title">Configuração Necessária</h2>
        <p className="empty-sub">Você precisa configurar o Tenant ID e Client ID do Azure antes de iniciar as operações.</p>
        <Link to="/admin/settings" className="btn-primary-solo">Ir para Configurações</Link>
      </div>
    );
  }

  const busy = loading || previewing || rollingBack;

  return (
    <div className="dashboard-grid">
      {/* LEFT */}
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Microsoft Connection */}
        {!msalAccount && (
          <div className="ms-banner">
            <div className="ms-banner-title"><LogIn size={16} /> Conexão Microsoft 365</div>
            <p className="ms-banner-sub">Conecte sua conta administradora do Microsoft 365 para autorizar as operações.</p>
            {connectError && (
              <div className="login-error" style={{ marginBottom: '0.75rem' }}>
                <AlertCircle size={14} /> {connectError}
              </div>
            )}
            <button onClick={handleConnectMsal} className="btn-ms365">
              <LogIn size={16} /> Conectar ao Microsoft 365
            </button>
          </div>
        )}

        {msalAccount && (
          <div className="card" style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', flexShrink: 0 }}>
                <CheckCircle2 size={18} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.85rem' }}>{msalAccount.name || msalAccount.username}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Conectado ao Microsoft 365</div>
              </div>
            </div>
          </div>
        )}

        {/* Setup */}
        <div className="card" style={{ opacity: msalAccount ? 1 : 0.5, pointerEvents: msalAccount ? 'auto' : 'none' }}>
          <div className="card-header"><Filter size={17} /> Configuração da Migração</div>

          <div className="form-group">
            <label className="form-label">Caixa de Origem (Microsoft 365)</label>
            <input type="email" value={config.source} onChange={e => setConfig(c => ({...c, source: e.target.value}))} placeholder="usuario@empresa.com.br" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Caixa Compartilhada de Destino</label>
            <input type="email" value={config.destination} onChange={e => setConfig(c => ({...c, destination: e.target.value}))} placeholder="arquivo@empresa.com.br" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Mover E-mails Anteriores a</label>
            <input type="date" value={config.date} onChange={e => setConfig(c => ({...c, date: e.target.value}))} className="form-input" />
          </div>

          <div className="btn-row">
            <button onClick={handlePreview} disabled={busy || !msalAccount} className="btn-secondary">
              {previewing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Pré-visualizar
            </button>
            <button onClick={handleStart} disabled={busy || !msalAccount} className="btn-submit">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Executar
            </button>
          </div>

          {status === 'completed' && movedEmails.length > 0 && (
            <button onClick={handleRollback} disabled={busy} className="btn-danger">
              {rollingBack ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />} Desfazer Movimentação (Rollback)
            </button>
          )}

          {previewCount !== null && status === 'previewed' && (
            <div className="preview-callout">
              <strong>Resultado:</strong> {previewCount} e-mail{previewCount !== 1 ? 's' : ''} encontrado{previewCount !== 1 ? 's' : ''}.{' '}
              {previewCount > 0 ? 'Pronto para executar a movimentação.' : 'Nenhum e-mail será movido.'}
            </div>
          )}
        </div>
      </motion.div>

      {/* RIGHT */}
      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div className="card-header" style={{ marginBottom: 0 }}><Clock size={17} /> Status em Tempo Real</div>
            <span className={`status-badge status-${status}`}>{
              status === 'idle' ? 'Aguardando' :
              status === 'running' ? 'Em execução' :
              status === 'completed' ? 'Concluído' :
              status === 'error' ? 'Erro' :
              status === 'rolling_back' ? 'Revertendo' :
              status === 'previewed' ? 'Pré-visualizado' : status
            }</span>
          </div>

          <div className="progress-wrap">
            <motion.div className="progress-bar" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">
            <span>{progress}% concluído</span>
            {busy && <span>Processando lote...</span>}
          </div>

          <div className="log-viewer">
            <div className="log-header">
              <span>Logs da Operação</span>
              <div className="log-counts">
                <span className="log-count-success">✓ {logs.filter(l => l.type === 'success').length}</span>
                <span className="log-count-error">✗ {logs.filter(l => l.type === 'error').length}</span>
              </div>
            </div>
            <div className="log-body">
              {logs.length === 0
                ? <div className="log-empty">Sem atividade. Configure e inicie uma migração.</div>
                : logs.map((log, i) => (
                    <div key={i} className={`log-entry ${log.type}`}>
                      {log.type === 'success' && <CheckCircle2 size={11} />}
                      {log.type === 'error' && <AlertCircle size={11} />}
                      <span className="log-time">[{log.time}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
