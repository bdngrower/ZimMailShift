import { useState, useEffect } from 'react';

export interface AppSettings {
  tenantId: string;
  clientId: string;
  redirectUri: string;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, load from localStorage to ensure it works without a DB table.
    // In the future, this can be swapped to fetch from Supabase.
    const stored = localStorage.getItem('zimMailShift_settings');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setLoading(false);
  }, []);

  const saveSettings = (newSettings: AppSettings) => {
    localStorage.setItem('zimMailShift_settings', JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  return { settings, saveSettings, loading };
};
