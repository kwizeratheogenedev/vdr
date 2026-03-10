import { useState, useEffect } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState({
    cookieBrowser: '',
    referer: '',
    userAgent: '',
    customHeaders: ''
  });

  const loadSettings = async () => {
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
  };

  const updateSettings = async (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    if (window.electronAPI?.updateSettings) {
      await window.electronAPI.updateSettings(updatedSettings);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return { settings, updateSettings, loadSettings };
}
