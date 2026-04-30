import { useState, useEffect } from 'react';

export interface AppSettings {
  id: string;
  name: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const STORAGE_KEY = 'zimMailShift_profiles';
const ACTIVE_KEY = 'zimMailShift_activeProfileId';

export const useSettings = () => {
  const [profiles, setProfiles] = useState<AppSettings[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedProfiles = localStorage.getItem(STORAGE_KEY);
    const storedActive = localStorage.getItem(ACTIVE_KEY);
    
    if (storedProfiles) {
      try {
        setProfiles(JSON.parse(storedProfiles));
      } catch (e) {
        console.error("Failed to parse profiles", e);
      }
    } else {
      // Legacy fallback
      const legacy = localStorage.getItem('zimMailShift_settings');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed.tenantId) {
            const legacyProfile = { id: 'default', name: 'Perfil Padrão', ...parsed };
            setProfiles([legacyProfile]);
            setActiveProfileId('default');
            localStorage.setItem(STORAGE_KEY, JSON.stringify([legacyProfile]));
            localStorage.setItem(ACTIVE_KEY, 'default');
          }
        } catch(e) {}
      }
    }
    
    if (storedActive) {
      setActiveProfileId(storedActive);
    }
    
    setLoading(false);
  }, []);

  const saveProfile = (profile: AppSettings) => {
    setProfiles(prev => {
      const updated = [...prev];
      const index = updated.findIndex(p => p.id === profile.id);
      if (index >= 0) updated[index] = profile;
      else updated.push(profile);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    
    if (!activeProfileId || activeProfileId === profile.id) {
      setActiveProfileId(profile.id);
      localStorage.setItem(ACTIVE_KEY, profile.id);
    }
  };

  const deleteProfile = (id: string) => {
    setProfiles(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      if (activeProfileId === id) {
        const nextId = updated.length > 0 ? updated[0].id : null;
        setActiveProfileId(nextId);
        if (nextId) localStorage.setItem(ACTIVE_KEY, nextId);
        else localStorage.removeItem(ACTIVE_KEY);
      }
      return updated;
    });
  };

  const switchActiveProfile = (id: string) => {
    setActiveProfileId(id);
    localStorage.setItem(ACTIVE_KEY, id);
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  return { profiles, activeProfile, activeProfileId, saveProfile, deleteProfile, switchActiveProfile, loading };
};
