import type { MainTab } from '@/stores/useUIStore';

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
}

declare global {
  interface Window {
    __OPENCHAMBER_UI_CONFIG__?: UIConfig;
  }
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
