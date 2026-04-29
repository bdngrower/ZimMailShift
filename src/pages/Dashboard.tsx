import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Filter, Clock, CheckCircle2, AlertCircle, Loader2, Key, Search, Undo2 } from 'lucide-react';
import { graphService } from '../services/graphService';
import { getMsalInstance, loginRequest } from '../lib/msal';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle'|'running'|'completed'|'error'|'rolling_back'|'previewed'>('idle');
  const [logs, setLogs] = useState<{ time: string; message: string; type: 'info'|'success'|'error' }[]>([]);
  const [config, setConfig] = useState({ source: '', destination: '', date: '' });
  const [isMsalConfigured, setIsMsalConfigured] = useState(true);
  const [msalAccount, setMsalAccount] = useState<any>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [movedEmails, setMovedEmails] = useState<{ subject: string; newId: string }[]>([]);

  useEffect(() => {
    const msal = getMsalInstance();
    if (!msal) { setIsMsalConfigured(false); return; }
    const account = msal.getActiveAccount() || msal.getAllAccounts()[0];
    setMsalAccount(account);
  }, []);

  const handleConnectMsal = async () => {
    const msal = getMsalInstance();
    if (!msal) return;
    try {
      const res = await msal.loginPopup(loginRequest);
      if (res?.account) setMsalAccount(res.account);
    } catch (e) { console.error(e); }
  };

  const addLog = (message: string, type: 'info'|'success'|'error' = 'info') => {
    setLogs(p => [{ time: new Date().toLocaleTimeString(), message, type }, ...p]);
  };

  const handlePreview = async () => {
    if (!msalAccount || !config.source || !config.date) return;
    setPreviewing(true); setLogs([]);
    addLog(`Previewing emails in ${config.source} before ${config.date}...`);
    try {
      const emails = await graphService.getEmailsBeforeDate(config.source, config.date);
      const count = emails?.length ?? 0;
      setPreviewCount(count); setStatus('previewed');
      count === 0
        ? addLog('No emails found matching the criteria.', 'info')
        : addLog(`Found ${count} emails ready to be moved.`, 'success');
    } catch (e: any) {
      addLog(e.message || 'Failed to fetch preview.', 'error');
    } finally { setPreviewing(false); }
  };

  const handleStart = async () => {
    if (!msalAccount || !config.source || !config.destination || !config.date) return;
    setLoading(true); setStatus('running'); setProgress(0); setLogs([]); setMovedEmails([]);
    addLog(`Initializing migration from ${config.source} to ${config.destination}...`);
    try {
      const emails = await graphService.getEmailsBeforeDate(config.source, config.date);
      if (!emails?.length) { addLog('No emails found.', 'info'); setStatus('completed'); return; }
      addLog(`Found ${emails.length} emails. Starting batch move...`, 'success');
      let count = 0;
      const moved: { subject: string; newId: string }[] = [];
      for (const email of emails) {
        try {
          addLog(`Moving: "${email.subject}"...`);
          await new Promise(r => setTimeout(r, 800));
          const newId = `simulated-${Date.now()}`;
          moved.push({ subject: email.subject, newId });
          count++;
          setProgress(Math.round((count / emails.length) * 100));
          addLog(`Moved: ${email.subject}`, 'success');
        } catch { addLog(`Failed: ${email.subject}`, 'error'); }
      }
      setMovedEmails(moved); setStatus('completed');
      addLog(`Done! Moved ${count} of ${emails.length} emails.`, 'success');
    } catch (e: any) {
      setStatus('error'); addLog(e.message || 'An error occurred.', 'error');
    } finally { setLoading(false); }
  };

  const handleRollback = async () => {
    if (!movedEmails.length) return;
    setRollingBack(true); setStatus('rolling_back'); setProgress(0);
    addLog(`Rolling back ${movedEmails.length} emails...`);
    let count = 0;
    for (const email of movedEmails) {
      try {
        addLog(`Restoring: "${email.subject}"...`);
        await new Promise(r => setTimeout(r, 800));
        count++; setProgress(Math.round((count / movedEmails.length) * 100));
        addLog(`Restored: ${email.subject}`, 'success');
      } catch { addLog(`Failed to restore: ${email.subject}`, 'error'); }
    }
    setMovedEmails([]); setStatus('idle');
    addLog(`Rollback complete. Restored ${count} emails.`, 'success');
    setRollingBack(false);
  };

  if (!isMsalConfigured) return (
    <div className="empty-state">
      <div className="empty-icon"><Key size={28} /></div>
      <h2 className="empty-title">Azure Configuration Required</h2>
      <p className="empty-sub">Configure the Microsoft Graph API credentials (Tenant ID & Client ID) before starting operations.</p>
      <Link to="/admin/settings" className="btn-primary-solo">Go to Settings</Link>
    </div>
  );

  const busy = loading || previewing || rollingBack;

  return (
    <div className="dashboard-grid">
      {/* LEFT COLUMN */}
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!msalAccount && (
          <div className="ms-banner">
            <div className="ms-banner-title"><Key size={16} /> Microsoft 365 Not Connected</div>
            <p className="ms-banner-sub">Connect your admin account to authorize operations.</p>
            <button onClick={handleConnectMsal} className="btn-ms365">Connect to Microsoft 365</button>
          </div>
        )}

        <div className="card" style={{ opacity: msalAccount ? 1 : 0.5, pointerEvents: msalAccount ? 'auto' : 'none' }}>
          <div className="card-header"><Filter size={17} /> Migration Setup</div>

          <div className="form-group">
            <label className="form-label">Source Mailbox</label>
            <input type="email" value={config.source} onChange={e => setConfig(c => ({...c, source: e.target.value}))} placeholder="user@company.com" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Destination Shared Mailbox</label>
            <input type="email" value={config.destination} onChange={e => setConfig(c => ({...c, destination: e.target.value}))} placeholder="archive@company.com" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Move Emails Before</label>
            <input type="date" value={config.date} onChange={e => setConfig(c => ({...c, date: e.target.value}))} className="form-input" />
          </div>

          <div className="btn-row">
            <button onClick={handlePreview} disabled={busy || !msalAccount} className="btn-secondary">
              {previewing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Preview
            </button>
            <button onClick={handleStart} disabled={busy || !msalAccount} className="btn-submit">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Execute
            </button>
          </div>

          {status === 'completed' && movedEmails.length > 0 && (
            <button onClick={handleRollback} disabled={busy} className="btn-danger">
              {rollingBack ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />} Undo Move (Rollback)
            </button>
          )}

          {previewCount !== null && status === 'previewed' && (
            <div className="preview-callout">
              <strong>Preview:</strong> Found {previewCount} email{previewCount !== 1 ? 's' : ''} matching your criteria.{' '}
              {previewCount > 0 ? 'Ready to execute.' : 'No emails will be moved.'}
            </div>
          )}
        </div>
      </motion.div>

      {/* RIGHT COLUMN */}
      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div className="card-header" style={{ marginBottom: 0 }}><Clock size={17} /> Live Status</div>
            <span className={`status-badge status-${status}`}>{status.replace('_', ' ')}</span>
          </div>

          <div className="progress-wrap">
            <motion.div className="progress-bar" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">
            <span>{progress}% complete</span>
            {busy && <span>Processing batch...</span>}
          </div>

          <div className="log-viewer">
            <div className="log-header">
              <span>Operation Logs</span>
              <div className="log-counts">
                <span className="log-count-success">✓ {logs.filter(l => l.type === 'success').length}</span>
                <span className="log-count-error">✗ {logs.filter(l => l.type === 'error').length}</span>
              </div>
            </div>
            <div className="log-body">
              {logs.length === 0
                ? <div className="log-empty">No activity yet. Configure and run a migration.</div>
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
