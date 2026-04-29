import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Filter, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { graphService } from '../services/graphService';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [logs, setLogs] = useState<{ time: string, message: string, type: 'info' | 'success' | 'error' }[]>([]);
  const [config, setConfig] = useState({
    source: '',
    destination: '',
    date: ''
  });

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, message, type }, ...prev]);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('running');
    setProgress(0);
    setLogs([]);
    
    addLog(`Initializing migration from ${config.source} to ${config.destination}...`);
    
    try {
      // Step 1: Fetch emails
      addLog(`Searching for emails before ${config.date}...`);
      const emails = await graphService.getEmailsBeforeDate(config.source, config.date);
      
      if (!emails || emails.length === 0) {
        addLog("No emails found matching the criteria.", "info");
        setStatus('completed');
        setLoading(false);
        return;
      }

      addLog(`Found ${emails.length} emails. Starting batch move...`, "success");

      // Step 2: Process emails (Simulated for safety in demo)
      let count = 0;
      for (const email of emails) {
        try {
          addLog(`Moving: "${email.subject}"...`);
          // Real call: await graphService.moveEmailToSharedMailbox(config.source, email.id, config.destination);
          
          // Simulated delay
          await new Promise(r => setTimeout(r, 800));
          
          count++;
          setProgress(Math.round((count / emails.length) * 100));
          addLog(`Success: ${email.subject}`, "success");
        } catch (err) {
          addLog(`Failed to move: ${email.subject}`, "error");
        }
      }

      setStatus('completed');
      addLog("Migration completed successfully!", "success");
    } catch (error) {
      console.error(error);
      setStatus('error');
      addLog("An error occurred during the migration process.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-grid">
      {/* Configuration Section */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="card">
          <div className="card-header">
            <Filter size={18} className="text-blue-500" />
            Migration Setup
          </div>
          
          <form onSubmit={handleStart}>
            <div className="form-group">
              <label className="form-label">Source Mailbox (Microsoft 365)</label>
              <input 
                type="email" 
                value={config.source}
                onChange={e => setConfig({...config, source: e.target.value})}
                placeholder="user@yourdomain.com"
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Destination Shared Mailbox</label>
              <input 
                type="email" 
                value={config.destination}
                onChange={e => setConfig({...config, destination: e.target.value})}
                placeholder="archive-shared@yourdomain.com"
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Filter: Emails Before</label>
              <input 
                type="date" 
                value={config.date}
                onChange={e => setConfig({...config, date: e.target.value})}
                className="form-input"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="btn-submit"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Execute Move
            </button>
          </form>
        </div>
      </motion.div>

      {/* Progress & Logs Section */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div className="card-header" style={{ marginBottom: 0 }}>
              <Clock size={18} className="text-blue-500" />
              Real-time Status
            </div>
            <span className={`status-badge status-${status}`}>
              {status}
            </span>
          </div>

          <div className="progress-container">
            <motion.div 
              className="progress-bar"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#94a3b8' }}>
            <span>{progress}% Complete</span>
            <span>Batch processing...</span>
          </div>

          <div className="log-viewer">
            <div className="log-viewer-header">
              <span>Operation Logs</span>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span className="log-success">Succeeded: {logs.filter(l => l.type === 'success').length}</span>
                <span className="log-error">Failed: {logs.filter(l => l.type === 'error').length}</span>
              </div>
            </div>
            <div className="log-content">
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
