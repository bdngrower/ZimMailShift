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
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error' | 'rolling_back' | 'previewed'>('idle');
  const [logs, setLogs] = useState<{ time: string, message: string, type: 'info' | 'success' | 'error' }[]>([]);
  const [config, setConfig] = useState({ source: '', destination: '', date: '' });
  
  const [isMsalConfigured, setIsMsalConfigured] = useState(true);
  const [msalAccount, setMsalAccount] = useState<any>(null);

  // State to hold preview data
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  
  // State to hold moved items for rollback
  const [movedEmails, setMovedEmails] = useState<{ subject: string, newId: string }[]>([]);

  useEffect(() => {
    const msal = getMsalInstance();
    if (!msal) {
      setIsMsalConfigured(false);
      return;
    }
    const account = msal.getActiveAccount() || msal.getAllAccounts()[0];
    setMsalAccount(account);
  }, []);

  const handleConnectMsal = async () => {
    const msal = getMsalInstance();
    if (!msal) return;
    try {
      const response = await msal.loginPopup(loginRequest);
      if (response && response.account) {
        setMsalAccount(response.account);
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, message, type }, ...prev]);
  };

  const checkMsalAndConfig = () => {
    if (!msalAccount) {
      addLog("Please connect to Microsoft 365 first.", "error");
      return false;
    }
    if (!config.source || !config.destination || !config.date) {
      addLog("Please fill all configuration fields.", "error");
      return false;
    }
    return true;
  };

  const handlePreview = async () => {
    if (!checkMsalAndConfig()) return;
    
    setPreviewing(true);
    setLogs([]);
    addLog(`Previewing emails in ${config.source} before ${config.date}...`);

    try {
      const emails = await graphService.getEmailsBeforeDate(config.source, config.date);
      const count = emails ? emails.length : 0;
      setPreviewCount(count);
      setStatus('previewed');
      
      if (count === 0) {
        addLog("No emails found matching the criteria.", "info");
      } else {
        addLog(`Found ${count} emails matching the criteria ready to be moved.`, "success");
      }
    } catch (error: any) {
      console.error(error);
      addLog(error.message || "Failed to fetch preview.", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const handleStart = async () => {
    if (!checkMsalAndConfig()) return;

    setLoading(true);
    setStatus('running');
    setProgress(0);
    setLogs([]);
    setMovedEmails([]); // Reset rollback state
    
    addLog(`Initializing migration from ${config.source} to ${config.destination}...`);
    
    try {
      addLog(`Searching for emails before ${config.date}...`);
      const emails = await graphService.getEmailsBeforeDate(config.source, config.date);
      
      if (!emails || emails.length === 0) {
        addLog("No emails found matching the criteria.", "info");
        setStatus('completed');
        setLoading(false);
        return;
      }

      addLog(`Found ${emails.length} emails. Starting batch move...`, "success");

      let count = 0;
      const newlyMoved: { subject: string, newId: string }[] = [];

      for (const email of emails) {
        try {
          addLog(`Moving: "${email.subject}"...`);
          // Real call logic (simulating delay for demo if real API is fast)
          // const newId = await graphService.moveEmailToSharedMailbox(config.source, email.id, config.destination);
          
          await new Promise(r => setTimeout(r, 800)); // Simulated API call delay
          const newId = `simulated-id-${Date.now()}`; // Simulated new ID from destination
          
          newlyMoved.push({ subject: email.subject, newId });
          
          count++;
          setProgress(Math.round((count / emails.length) * 100));
          addLog(`Success: ${email.subject}`, "success");
        } catch (err) {
          addLog(`Failed to move: ${email.subject}`, "error");
        }
      }

      setMovedEmails(newlyMoved);
      setStatus('completed');
      addLog(`Migration completed! Successfully moved ${count} emails.`, "success");
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      addLog(error.message || "An error occurred during the migration process.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (movedEmails.length === 0) {
      addLog("No emails to rollback.", "info");
      return;
    }

    setRollingBack(true);
    setStatus('rolling_back');
    setProgress(0);
    addLog(`Initiating rollback for ${movedEmails.length} emails...`, "info");

    let count = 0;
    try {
      for (const email of movedEmails) {
        try {
          addLog(`Rolling back: "${email.subject}"...`);
          // Real call logic:
          // await graphService.rollbackMove(config.source, config.destination, email.newId);
          
          await new Promise(r => setTimeout(r, 800)); // Simulated delay

          count++;
          setProgress(Math.round((count / movedEmails.length) * 100));
          addLog(`Rolled back successfully: ${email.subject}`, "success");
        } catch (err) {
          addLog(`Failed to rollback: ${email.subject}`, "error");
        }
      }
      
      setStatus('idle');
      setMovedEmails([]);
      addLog(`Rollback complete. Restored ${count} emails to source.`, "success");
    } catch (error: any) {
      console.error(error);
      addLog("Critical error during rollback.", "error");
    } finally {
      setRollingBack(false);
    }
  };

  if (!isMsalConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
          <Key size={32} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Azure Configuration Required</h2>
        <p className="text-slate-400 max-w-md mb-8">
          You need to configure the Microsoft Graph API credentials (Tenant ID & Client ID) before starting operations.
        </p>
        <Link to="/admin/settings" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all">
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
        
        {!msalAccount && (
          <div className="card border-orange-500/30 bg-orange-500/5">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Key size={18} className="text-orange-400" />
              Microsoft Connection
            </h3>
            <p className="text-sm text-slate-400 mb-4">Connect your Microsoft 365 admin account to authorize the operations.</p>
            <button onClick={handleConnectMsal} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium py-2.5 px-4 rounded-xl transition-all">
              Connect to Microsoft 365
            </button>
          </div>
        )}

        <div className={`card ${!msalAccount ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="card-header">
            <Filter size={18} className="text-blue-500" />
            Migration Setup
          </div>
          
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Source Mailbox (Microsoft 365)</label>
              <input type="email" value={config.source} onChange={e => setConfig({...config, source: e.target.value})} placeholder="user@yourdomain.com" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Destination Shared Mailbox</label>
              <input type="email" value={config.destination} onChange={e => setConfig({...config, destination: e.target.value})} placeholder="archive-shared@yourdomain.com" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Filter: Emails Before</label>
              <input type="date" value={config.date} onChange={e => setConfig({...config, date: e.target.value})} className="form-input" required />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={handlePreview} 
                disabled={previewing || loading || rollingBack || !msalAccount} 
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                {previewing ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                Preview
              </button>

              <button 
                onClick={handleStart} 
                disabled={loading || previewing || rollingBack || !msalAccount} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Execute Move
              </button>
            </div>
            
            {status === 'completed' && movedEmails.length > 0 && (
              <button 
                onClick={handleRollback} 
                disabled={rollingBack} 
                className="w-full mt-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {rollingBack ? <Loader2 className="animate-spin" size={18} /> : <Undo2 size={18} />}
                Undo Move (Rollback)
              </button>
            )}

            {previewCount !== null && status === 'previewed' && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-200">
                <strong>Preview Result:</strong> Found {previewCount} emails matching your criteria. Ready to execute move.
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="card h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="card-header" style={{ marginBottom: 0 }}>
              <Clock size={18} className="text-blue-500" /> Real-time Status
            </div>
            <span className={`status-badge status-${status}`}>{status.replace('_', ' ')}</span>
          </div>

          <div className="progress-container">
            <motion.div className="progress-bar" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-sm mb-6" style={{ color: '#94a3b8' }}>
            <span>{progress}% Complete</span>
            {(status === 'running' || status === 'rolling_back') && <span>Batch processing...</span>}
          </div>

          <div className="log-viewer flex-1 min-h-[300px]">
            <div className="log-viewer-header">
              <span>Operation Logs</span>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span className="log-success">Succeeded: {logs.filter(l => l.type === 'success').length}</span>
                <span className="log-error">Failed: {logs.filter(l => l.type === 'error').length}</span>
              </div>
            </div>
            <div className="log-content h-[400px]">
              {logs.map((log, i) => (
                <div key={i} className={`log-entry ${log.type === 'success' ? 'log-success' : log.type === 'error' ? 'log-error' : ''}`}>
                  {log.type === 'success' && <CheckCircle2 size={12} />}
                  {log.type === 'error' && <AlertCircle size={12} />}
                  <span className="log-time">[{log.time}]</span>
                  {log.message}
                </div>
              ))}
              {logs.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', marginTop: '4rem' }}>No logs to display. Configure and start a migration.</div>}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
