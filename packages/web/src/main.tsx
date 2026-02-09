import { createWebAPIs } from './api';
import { registerSW } from 'virtual:pwa-register';

import type { RuntimeAPIs } from '@openchamber/ui/lib/api/types';
import '@openchamber/ui/index.css';
import '@openchamber/ui/styles/fonts';

declare global {
  interface Window {
    __OPENCHAMBER_RUNTIME_APIS__?: RuntimeAPIs;
  }
}

window.__OPENCHAMBER_RUNTIME_APIS__ = createWebAPIs();
// Default UI config (visible tabs, hidden UI, added UI). 
// These are overridden by settings.json simplechamber.* values if present.
const win = window as Window & { __OPENCHAMBER_UI_CONFIG__?: { visibleTabs?: string[]; hiddenUI?: string[]; customUI?: string[] } };
if (win.__OPENCHAMBER_UI_CONFIG__ === undefined) {
  win.__OPENCHAMBER_UI_CONFIG__ = {
    visibleTabs: ['chat', 'plan', 'terminal', 'files'],
    hiddenUI: [
      'git', // also hides: git-identities, session-header-actions
      'multi-run',
      'about',
      'message-fork',
      'message-new-session',
      'diff-view-tabs',
      'keyboard-shortcuts',
    ],
    customUI: [
      'search-session-input',
      'new-session-button',
    ],
  };
}

registerSW({
  onRegistered(registration: ServiceWorkerRegistration | undefined) {
    if (!registration) {
      return;
    }

    // Periodic update check (best-effort)
    setInterval(() => {
      void registration.update();
    }, 60 * 60 * 1000);
  },
  onRegisterError(error: unknown) {
    console.warn('[PWA] service worker registration failed:', error);
  },
});

import('@openchamber/ui/main');

// Session search - DOM-based filtering (no changes to main components)
import('./session-search');
