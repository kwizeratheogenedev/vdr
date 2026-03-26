import { useState, useEffect, useCallback, useRef } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState({
    cookieBrowser: '',
    referer: '',
    userAgent: '',
    customHeaders: ''
  });

  // Use ref to avoid stale closure issues
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const loadSettings = useCallback(async () => {
    if (window.electronAPI?.getSettings) {
      const loadedSettings = await window.electronAPI.getSettings();
      if (loadedSettings) {
        setSettings({
          cookieBrowser: loadedSettings.cookieBrowser || '',
          referer: loadedSettings.referer || '',
          userAgent: loadedSettings.userAgent || '',
          customHeaders: loadedSettings.customHeaders || ''
        });
      }
    }
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    // Use functional update to avoid stale closure
    setSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      // Save to backend asynchronously (don't wait)
      if (window.electronAPI?.updateSettings) {
        window.electronAPI.updateSettings(updatedSettings).catch(err => {
          console.error('Failed to save settings:', err);
        });
      }
      return updatedSettings;
    });
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, updateSettings, loadSettings };
}
