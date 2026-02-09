/**
 * Session Search - DOM-based session filtering for OpenChamber
 * This script injects a search input into the sidebar and filters sessions by title.
 * Zero changes required to the main SessionSidebar component.
 */

const SEARCH_CONTAINER_ID = 'oc-session-search';
const SEARCH_INPUT_ID = 'oc-session-search-input';
const HIDDEN_CLASS = 'oc-search-hidden';

// CSS to hide filtered sessions
const styles = `
  .${HIDDEN_CLASS} {
    display: none !important;
  }
  #${SEARCH_CONTAINER_ID} {
    padding: 0.25rem 0.25rem 0;
  }
  #${SEARCH_CONTAINER_ID} .search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  #${SEARCH_CONTAINER_ID} .search-icon {
    position: absolute;
    left: 0.5rem;
    width: 0.875rem;
    height: 0.875rem;
    color: var(--muted-foreground, #888);
    pointer-events: none;
  }
  #${SEARCH_CONTAINER_ID} input {
    height: 2rem;
    width: 100%;
    border-radius: 0.375rem;
    border: 1px solid var(--border, #333);
    background: transparent;
    padding-left: 1.75rem;
    padding-right: 1.75rem;
    font-size: 0.875rem;
    color: var(--foreground, #fff);
    outline: none;
  }
  #${SEARCH_CONTAINER_ID} input::placeholder {
    color: var(--muted-foreground, #888);
  }
  #${SEARCH_CONTAINER_ID} input:focus {
    box-shadow: 0 0 0 2px rgba(var(--primary-rgb, 99, 102, 241), 0.5);
  }
  #${SEARCH_CONTAINER_ID} .clear-btn {
    position: absolute;
    right: 0.375rem;
    display: none;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    border: none;
    background: transparent;
    color: var(--muted-foreground, #888);
    cursor: pointer;
  }
  #${SEARCH_CONTAINER_ID} .clear-btn:hover {
    color: var(--foreground, #fff);
  }
  #${SEARCH_CONTAINER_ID} .clear-btn.visible {
    display: inline-flex;
  }
`;

function injectStyles(): void {
  if (document.getElementById('oc-session-search-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'oc-session-search-styles';
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

function createSearchUI(): HTMLElement {
  const container = document.createElement('div');
  container.id = SEARCH_CONTAINER_ID;
  container.innerHTML = `
    <div class="search-wrapper">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
      </svg>
      <input type="text" id="${SEARCH_INPUT_ID}" placeholder="Search sessions..." autocomplete="off" />
      <button type="button" class="clear-btn" aria-label="Clear search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </button>
    </div>
  `;
  return container;
}

function getSessionItems(): NodeListOf<Element> {
  // Session items are inside .oc-group-body, each session is a div with specific structure
  // The session title is in a div with class containing "typography-ui-label"
  return document.querySelectorAll('.oc-group-body > div, .oc-group > .oc-group-body > div');
}

function getSessionTitle(sessionEl: Element): string {
  const titleEl = sessionEl.querySelector('.typography-ui-label');
  return titleEl?.textContent?.toLowerCase().trim() || '';
}

// Track if we expanded groups due to search
let expandedBySearch = false;

function expandAllSessionGroups(): void {
  // Click all "Show X more sessions" buttons to reveal all sessions
  document.querySelectorAll('.oc-group-body > button').forEach((btn) => {
    const text = btn.textContent || '';
    if (text.includes('more session')) {
      (btn as HTMLButtonElement).click();
    }
  });
  expandedBySearch = true;
}

function filterSessions(query: string): void {
  const normalizedQuery = query.toLowerCase().trim();

  // When starting to search, expand all groups first to load all sessions into DOM
  if (normalizedQuery && !expandedBySearch) {
    expandAllSessionGroups();
    // Re-run filter after a short delay to let DOM update
    setTimeout(() => filterSessions(query), 50);
    return;
  }

  // Reset expanded state when search is cleared
  if (!normalizedQuery) {
    expandedBySearch = false;
  }

  const sessionItems = getSessionItems();

  sessionItems.forEach((item) => {
    if (!normalizedQuery) {
      item.classList.remove(HIDDEN_CLASS);
      return;
    }
    const title = getSessionTitle(item);
    if (title.includes(normalizedQuery)) {
      item.classList.remove(HIDDEN_CLASS);
    } else {
      item.classList.add(HIDDEN_CLASS);
    }
  });

  // Also hide empty groups (groups where all sessions are hidden)
  document.querySelectorAll('.oc-group').forEach((group) => {
    const body = group.querySelector('.oc-group-body');
    if (!body) return;
    const visibleSessions = body.querySelectorAll(`& > div:not(.${HIDDEN_CLASS})`);
    if (normalizedQuery && visibleSessions.length === 0) {
      group.classList.add(HIDDEN_CLASS);
    } else {
      group.classList.remove(HIDDEN_CLASS);
    }
  });

  // Hide "Show X more sessions" / "Show fewer sessions" buttons when searching
  document.querySelectorAll('.oc-group-body > button').forEach((btn) => {
    const text = btn.textContent || '';
    if (text.includes('more session') || text.includes('fewer session')) {
      if (normalizedQuery) {
        btn.classList.add(HIDDEN_CLASS);
      } else {
        btn.classList.remove(HIDDEN_CLASS);
      }
    }
  });
}

function findInsertionPoint(): Element | null {
  // Find the sidebar header area - look for the directory controls container
  // The structure is: aside > div > div.border-b (header area)
  const sidebar = document.querySelector('aside');
  if (!sidebar) return null;

  // Look for the header div with border-b class that contains the project dropdown
  const headerDiv = sidebar.querySelector('.border-b.border-border\\/60');
  return headerDiv || null;
}

function initSessionSearch(): void {
  // Check if search is disabled via config
  const config = (window as Window & { __OPENCHAMBER_UI_CONFIG__?: { hiddenUI?: string[] } }).__OPENCHAMBER_UI_CONFIG__;
  if (config?.hiddenUI?.includes('session-search')) return;

  // Don't initialize twice
  if (document.getElementById(SEARCH_CONTAINER_ID)) return;

  injectStyles();

  const observer = new MutationObserver(() => {
    const insertionPoint = findInsertionPoint();
    if (!insertionPoint || document.getElementById(SEARCH_CONTAINER_ID)) return;

    const searchUI = createSearchUI();
    insertionPoint.appendChild(searchUI);

    const input = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement;
    const clearBtn = searchUI.querySelector('.clear-btn') as HTMLButtonElement;

    if (input && clearBtn) {
      input.addEventListener('input', () => {
        filterSessions(input.value);
        clearBtn.classList.toggle('visible', input.value.length > 0);
      });

      clearBtn.addEventListener('click', () => {
        input.value = '';
        filterSessions('');
        clearBtn.classList.remove('visible');
        input.focus();
      });

      // Re-filter when sessions change
      const sessionObserver = new MutationObserver(() => {
        if (input.value) {
          filterSessions(input.value);
        }
      });

      const scrollableArea = document.querySelector('aside .flex-1.min-h-0');
      if (scrollableArea) {
        sessionObserver.observe(scrollableArea, { childList: true, subtree: true });
      }
    }

    // Stop observing once we've injected
    observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSessionSearch);
} else {
  initSessionSearch();
}

export { initSessionSearch };
