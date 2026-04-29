import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Settings, Key, Globe, CheckCircle2, LogIn, Loader2,
  Shield, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, User
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { initializeMsal } from '../lib/msal';
import { PublicClientApplication } from '@azure/msal-browser';

// A temporary MSAL instance using common tenant just for the Global Admin login step
const tempMsal = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_MS_CLIENT_ID || 'placeholder',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'sessionStorage' }
});

const GLOBAL_ADMIN_SCOPES = ['User.Read', 'Directory.Read.All'];

export const AdminSettings: React.FC = () => {
  const { settings, saveSettings, loading } = useSettings();
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [saved, setSaved] = useState(false);

  // Step 1: Global Admin auth
  const [adminUser, setAdminUser] = useState<{ name: string; email: string; tenantId: string } | null>(null);
  const [adminLogging, setAdminLogging] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Guide accordion
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    tempMsal.initialize().catch(() => {});
    if (settings) {
      setTenantId(settings.tenantId || '');
      setClientId(settings.clientId || '');
    }
  }, [settings]);

  const handleAdminLogin = async () => {
    setAdminLogging(true);
    setAdminError(null);
    try {
      await tempMsal.initialize();
      const res = await tempMsal.loginPopup({ scopes: GLOBAL_ADMIN_SCOPES });
      if (res?.account) {
        const claims = res.idTokenClaims as any;
        setAdminUser({
          name: res.account.name || res.account.username,
          email: res.account.username,
          tenantId: claims?.tid || res.tenantId || '',
        });
        // Auto-fill tenant id from token
        if (claims?.tid) setTenantId(claims.tid);
      }
    } catch (e: any) {
      if (e.errorCode !== 'user_cancelled') {
        setAdminError('Login failed. Make sure you are signing in with a Global Administrator account.');
      }
    } finally {
      setAdminLogging(false);
    }
  };

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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '680px' }}>

      {/* ── STEP 1: Admin Login ── */}
      <div className="settings-card">
        <div className="settings-header">
          <div className="settings-icon"><Shield size={20} /></div>
          <div>
            <div className="settings-title">Step 1 — Global Administrator Login</div>
            <div className="settings-subtitle">Sign in with a Microsoft Global Admin account to authorize configuration</div>
          </div>
        </div>
        <div className="settings-body">
          {!adminUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {adminError && (
                <div className="login-error" style={{ marginBottom: 0 }}>
                  <AlertTriangle size={14} /> {adminError}
                </div>
              )}
              <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                You must authenticate with a <strong style={{ color: '#94a3b8' }}>Microsoft 365 Global Administrator</strong> account before configuring the tenant settings. This ensures only authorized personnel can modify the integration.
              </p>
              <button onClick={handleAdminLogin} disabled={adminLogging} className="btn-ms365" style={{ width: 'fit-content' }}>
                {adminLogging ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {adminLogging ? 'Opening login...' : 'Sign in with Global Admin Account'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', flexShrink: 0 }}>
                <User size={20} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{adminUser.name}</div>
                <div style={{ color: '#475569', fontSize: '0.78rem' }}>{adminUser.email}</div>
              </div>
              <div className="success-banner" style={{ margin: 0, padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                <CheckCircle2 size={13} /> Verified
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STEP 2: App Registration Guide ── */}
      <div className="settings-card">
        <button
          onClick={() => setGuideOpen(v => !v)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div className="settings-header" style={{ margin: 0 }}>
            <div className="settings-icon" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>
              <ExternalLink size={18} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div className="settings-title">Step 2 — Azure App Registration Guide</div>
              <div className="settings-subtitle">Required permissions and configuration in Azure Portal</div>
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

                  {/* Step A */}
                  <GuideStep number="A" title="Create an App Registration">
                    <p>Go to <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="guide-link">Azure Portal → App Registrations <ExternalLink size={11} /></a> and click <strong>New registration</strong>.</p>
                    <ul>
                      <li>Name: <code>ZimMailShift</code></li>
                      <li>Supported account types: <strong>Accounts in this organizational directory only</strong></li>
                      <li>Redirect URI: <strong>Single Page Application (SPA)</strong> → <code>{window.location.origin}</code></li>
                    </ul>
                  </GuideStep>

                  {/* Step B */}
                  <GuideStep number="B" title="Copy the IDs">
                    <p>After creating, from the <strong>Overview</strong> page copy:</p>
                    <ul>
                      <li><strong>Application (client) ID</strong> → paste in Client ID field below</li>
                      <li><strong>Directory (tenant) ID</strong> → paste in Tenant ID field below</li>
                    </ul>
                  </GuideStep>

                  {/* Step C */}
                  <GuideStep number="C" title="Configure API Permissions" highlight>
                    <p>Go to <strong>API permissions → Add a permission → Microsoft Graph → Delegated permissions</strong> and add:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.5rem 0' }}>
                      {['User.Read','Mail.Read','Mail.ReadWrite','Mail.ReadWrite.Shared','Mail.Send','Directory.Read.All'].map(p => (
                        <code key={p} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.78rem', color: '#a5b4fc' }}>{p}</code>
                      ))}
                    </div>
                    <p style={{ color: '#fb923c' }}>⚠ After adding, click <strong>"Grant admin consent for [your tenant]"</strong> — this is required for shared mailbox access.</p>
                  </GuideStep>

                  {/* Step D */}
                  <GuideStep number="D" title="Authentication Settings">
                    <p>In <strong>Authentication</strong>, ensure:</p>
                    <ul>
                      <li>Platform: <strong>Single-page application</strong></li>
                      <li>Redirect URI includes: <code>{window.location.origin}</code></li>
                      <li>Enable <strong>Access tokens</strong> and <strong>ID tokens</strong> under Implicit grant</li>
                    </ul>
                  </GuideStep>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── STEP 3: Configuration Fields ── */}
      <div className="settings-card" style={{ opacity: adminUser ? 1 : 0.4, pointerEvents: adminUser ? 'auto' : 'none' }}>
        {!adminUser && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.8rem', background: '#0b1221', padding: '0.5rem 1rem', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.06)' }}>
              <Shield size={14} /> Complete Step 1 to unlock
            </div>
          </div>
        )}
        <div className="settings-header" style={{ position: 'relative' }}>
          <div className="settings-icon"><Settings size={20} /></div>
          <div>
            <div className="settings-title">Step 3 — Tenant Configuration</div>
            <div className="settings-subtitle">Enter the IDs from your Azure App Registration</div>
          </div>
        </div>
        <form onSubmit={handleSave} style={{ position: 'relative' }}>
          <div className="settings-body">
            {saved && (
              <div className="success-banner">
                <CheckCircle2 size={16} /> Settings saved and MSAL initialized successfully.
              </div>
            )}
            <div className="settings-fields">
              <div>
                <div className="settings-input-icon"><Globe size={14} /> Tenant ID (Directory ID)</div>
                <input type="text" value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="form-input" required />
                <div className="settings-hint">Auto-filled from your admin login. Verify it matches Azure Portal.</div>
              </div>
              <div>
                <div className="settings-input-icon"><Key size={14} /> Client ID (Application ID)</div>
                <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="form-input" required />
                <div className="settings-hint">Found in App Registration → Overview → Application (client) ID.</div>
              </div>
            </div>
          </div>
          <div className="settings-footer">
            <button type="submit" className="settings-save" disabled={!adminUser}>
              <Save size={16} /> Save Configuration
            </button>
          </div>
        </form>
      </div>

    </motion.div>
  );
};

// Helper component for guide steps
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
