import { useState, useEffect } from 'react';

export interface AppSettings {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const STORAGE_KEY = 'zimMailShift_settings';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  return { settings, saveSettings, loading };
};
