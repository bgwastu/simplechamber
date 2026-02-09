import type { MainTab } from '@/stores/useUIStore';
import type { SimpleChamberSettings } from '@/lib/api/types';

const ALL_TABS: readonly MainTab[] = [
  'chat',
  'plan',
  'git',
  'diff',
  'terminal',
  'files',
] as const;

export interface UIConfig {
  /** Tab IDs to show in the header; if absent, all tabs are visible. */
  visibleTabs?: readonly MainTab[];
  /** Feature IDs to hide (e.g. 'rate-limits', 'command-palette'). */
  hiddenUI?: readonly string[];
  /** Custom UI feature IDs to enable (e.g. 'search-session-input', 'new-session-button'). */
  customUI?: readonly string[];
}

const DEFAULT_UI_CONFIG: UIConfig = {};

declare global {
  interface Window {
    __OPENCHAMBER_UI_CONFIG__?: UIConfig;
    __SIMPLECHAMBER_SETTINGS_LOADED__?: boolean;
  }
}

// Cache for settings loaded from API
let settingsCache: SimpleChamberSettings | null = null;
let settingsLoadPromise: Promise<SimpleChamberSettings> | null = null;

/**
 * Load SimpleChamber settings from the settings API.
 * Returns cached settings if already loaded.
 */
export async function loadSimpleChamberSettings(): Promise<SimpleChamberSettings> {
  if (settingsCache !== null) {
    return settingsCache;
  }

  if (settingsLoadPromise !== null) {
    return settingsLoadPromise;
  }

  settingsLoadPromise = (async () => {
    try {
      const response = await fetch('/api/config/settings', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return {};
      }
      const data = await response.json();
      const simplechamber = data?.simplechamber;
      if (simplechamber && typeof simplechamber === 'object') {
        settingsCache = {
          hiddenUI: Array.isArray(simplechamber.hiddenUI) ? simplechamber.hiddenUI : undefined,
          customUI: Array.isArray(simplechamber.customUI) ? simplechamber.customUI : undefined,
          visibleTabs: Array.isArray(simplechamber.visibleTabs) ? simplechamber.visibleTabs : undefined,
        };
        return settingsCache;
      }
      settingsCache = {};
      return settingsCache;
    } catch {
      settingsCache = {};
      return settingsCache;
    }
  })();

  return settingsLoadPromise;
}

/**
 * Initialize SimpleChamber settings from the API and merge with window config.
 * Call this early in app startup.
 */
export async function initSimpleChamberConfig(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.__SIMPLECHAMBER_SETTINGS_LOADED__) {
    return;
  }

  const apiSettings = await loadSimpleChamberSettings();

  // Merge: API settings override defaults
  const mergedConfig: UIConfig = {
    visibleTabs: apiSettings.visibleTabs?.length
      ? (apiSettings.visibleTabs as MainTab[])
      : DEFAULT_UI_CONFIG.visibleTabs,
    hiddenUI: apiSettings.hiddenUI?.length
      ? apiSettings.hiddenUI
      : DEFAULT_UI_CONFIG.hiddenUI,
    customUI: apiSettings.customUI?.length
      ? apiSettings.customUI
      : DEFAULT_UI_CONFIG.customUI,
  };

  window.__OPENCHAMBER_UI_CONFIG__ = mergedConfig;
  window.__SIMPLECHAMBER_SETTINGS_LOADED__ = true;
}

function getUIConfig(): UIConfig {
  if (typeof window === 'undefined') {
    return {};
  }
  return window.__OPENCHAMBER_UI_CONFIG__ ?? {};
}

/**
 * Returns the list of main tab IDs that should be visible.
 * If not configured, returns all tabs (upstream default).
 */
export function getVisibleTabs(): readonly MainTab[] {
  const config = getUIConfig();
  const visible = config.visibleTabs;
  if (!visible || visible.length === 0) {
    return ALL_TABS;
  }
  return visible;
}

/**
 * Returns true if the given UI feature ID is configured as hidden.
 */
export function isUIHidden(featureId: string): boolean {
  const config = getUIConfig();
  const hidden = config.hiddenUI;
  if (!hidden) {
    return false;
  }
  return hidden.includes(featureId);
}

/**
 * Returns true if the given custom UI feature ID is enabled.
 */
export function hasCustomUI(featureId: string): boolean {
  const config = getUIConfig();
  const customUI = config.customUI;
  if (!customUI) {
    return false;
  }
  return customUI.includes(featureId);
}
