import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Settings, Key, Globe, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { initializeMsal } from '../lib/msal';

export const AdminSettings: React.FC = () => {
  const { settings, saveSettings, loading } = useSettings();
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setTenantId(settings.tenantId || '');
      setClientId(settings.clientId || '');
    }
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings = { tenantId, clientId, redirectUri: window.location.origin };
    saveSettings(newSettings);
    initializeMsal(newSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div style={{ color: '#475569', padding: '2rem' }}>Loading settings...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="settings-card">
        <div className="settings-header">
          <div className="settings-icon"><Settings size={20} /></div>
          <div>
            <div className="settings-title">System Configuration</div>
            <div className="settings-subtitle">Configure Microsoft Graph API credentials for the tenant</div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="settings-body">
            {saved && (
              <div className="success-banner">
                <CheckCircle2 size={16} />
                Settings saved and MSAL initialized successfully.
              </div>
            )}

            <div className="settings-fields">
              <div>
                <div className="settings-input-icon"><Globe size={14} /> Tenant ID</div>
                <input
                  type="text"
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  placeholder="e.g. 8eaef023-2d3b-4e8f-a3b2-..."
                  className="form-input"
                  required
                />
                <div className="settings-hint">Directory (tenant) ID from Azure Active Directory.</div>
              </div>

              <div>
                <div className="settings-input-icon"><Key size={14} /> Client ID</div>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="e.g. d3b5c6a1-9e4f-..."
                  className="form-input"
                  required
                />
                <div className="settings-hint">Application (client) ID from your Azure App Registration.</div>
              </div>
            </div>
          </div>

          <div className="settings-footer">
            <button type="submit" className="settings-save">
              <Save size={16} />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
