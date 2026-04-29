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
    const newSettings = {
      tenantId,
      clientId,
      redirectUri: window.location.origin
    };
    saveSettings(newSettings);
    initializeMsal(newSettings); // Initialize MSAL with new settings
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="text-slate-400 p-8 text-center">Loading settings...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-6 border-b border-slate-800 bg-slate-800/20 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">System Configuration</h2>
            <p className="text-sm text-slate-400">Configure Microsoft Graph API credentials for the tenant.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {saved && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={18} />
              Settings saved and MSAL initialized successfully.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                <Globe size={16} className="text-slate-500" /> Tenant ID
              </label>
              <input 
                type="text" 
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                placeholder="e.g. 8eaef023-..."
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
              <p className="text-xs text-slate-500 mt-1">The Directory (tenant) ID from Azure Active Directory.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                <Key size={16} className="text-slate-500" /> Client ID
              </label>
              <input 
                type="text" 
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="e.g. d3b5c6..."
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
              <p className="text-xs text-slate-500 mt-1">The Application (client) ID from your Azure App Registration.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center gap-2"
            >
              <Save size={18} />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
