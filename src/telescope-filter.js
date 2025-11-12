(function() {
  'use strict';

  // Constants
  const doc = document;
  const REFRESH_INTERVAL = 500;
  const LOAD_MORE_DELAY = 300;

  // State
  let filterInterval = null;
  let currentPage = null;
  let filterState = {};

  // LocalStorage keys
  const STORAGE_KEY_PREFIX = 'telescope_filter_';
  const STORAGE_ENABLED_KEY = 'telescope_filter_enabled';
  const STORAGE_TELESCOPE_LINKS_KEY = 'telescope_links';

  // Page configurations for all 18 Telescope pages
  const PAGE_CONFIGS = {
    requests: {
      name: 'Requests',
      url: '/telescope/requests',
      filters: [
        { type: 'select', id: 'method', label: 'Method', options: ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { type: 'text', id: 'path', label: 'Path Contains', placeholder: 'e.g. /api/v1/users' },
        { type: 'duration', id: 'duration', label: 'Duration (ms)', placeholder: 'e.g. 1000' },
        { type: 'text', id: 'status', label: 'Status', placeholder: 'e.g. 200, 404' }
      ],
      filterFn: (row, state) => {
        const methodBadge = row.querySelector('.badge');
        const statusBadge = row.querySelectorAll('td')[2]?.querySelector('.badge');
        const durationText = row.querySelectorAll('td')[3]?.querySelector('span');
        const pathTd = row.querySelectorAll('td')[1];

        if (!methodBadge || !pathTd || !statusBadge || !durationText) return true;

        const method = methodBadge.textContent.trim();
        const status = statusBadge.textContent.trim();
        const duration = durationText.textContent.trim();
        const path = pathTd.getAttribute('title') || pathTd.textContent.trim();
        const durationValue = parseInt(duration.replace('ms', ''));

        const methodMatch = (!state.method || state.method === 'ALL' || method === state.method);
        const statusMatch = (!state.status || status.includes(state.status));
        const durationMatch = (!state.duration || durationValue >= parseInt(state.duration));
        const pathMatch = (!state.path || path.toLowerCase().includes(state.path.toLowerCase()));

        return methodMatch && statusMatch && durationMatch && pathMatch;
      }
    },

    'client-requests': {
      name: 'HTTP Client',
      url: '/telescope/client-requests',
      filters: [
        { type: 'select', id: 'method', label: 'Method', options: ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { type: 'text', id: 'status', label: 'Status', placeholder: 'e.g. 200, 404' },
        { type: 'duration', id: 'duration', label: 'Duration (ms)', placeholder: 'e.g. 1000' },
        { type: 'text', id: 'uri', label: 'URI Contains', placeholder: 'e.g. api/models' }
      ],
      filterFn: (row, state) => {
        const methodBadge = row.querySelector('.badge');
        const statusBadge = row.querySelectorAll('td')[2]?.querySelector('.badge');
        const durationText = row.querySelectorAll('td')[3]?.querySelector('span');
        const uriTd = row.querySelectorAll('td')[1];

        if (!methodBadge || !uriTd || !statusBadge) return true;

        const method = methodBadge.textContent.trim();
        const status = statusBadge.textContent.trim();
        const uri = uriTd.getAttribute('title') || uriTd.textContent.trim();
        const duration = durationText ? durationText.textContent.trim() : '0ms';
        const durationValue = parseInt(duration.replace('ms', '')) || 0;

        const methodMatch = (!state.method || state.method === 'ALL' || method === state.method);
        const statusMatch = (!state.status || status.includes(state.status));
        const durationMatch = (!state.duration || durationValue >= parseInt(state.duration));
        const uriMatch = (!state.uri || uri.toLowerCase().includes(state.uri.toLowerCase()));

        return methodMatch && statusMatch && durationMatch && uriMatch;
      }
    },

    jobs: {
      name: 'Jobs',
      url: '/telescope/jobs',
      filters: [
        { type: 'text', id: 'jobName', label: 'Job Name', placeholder: 'e.g. SendEmailJob' },
        { type: 'text', id: 'status', label: 'Status', placeholder: 'e.g. pending, completed' },
        { type: 'text', id: 'connection', label: 'Connection', placeholder: 'e.g. redis' },
        { type: 'text', id: 'queue', label: 'Queue', placeholder: 'e.g. default' }
      ],
      filterFn: (row, state) => {
        const jobTitle = row.querySelector('td span[title]');
        const statusBadge = row.querySelectorAll('td')[1]?.querySelector('.badge');
        const metaSmall = row.querySelector('td small.text-muted');

        if (!jobTitle || !statusBadge) return true;

        const job = jobTitle.getAttribute('title') || jobTitle.textContent.trim();
        const status = statusBadge.textContent.trim();
        const meta = metaSmall ? metaSmall.textContent.trim() : '';

        const jobMatch = (!state.jobName || job.toLowerCase().includes(state.jobName.toLowerCase()));
        const statusMatch = (!state.status || status.toLowerCase().includes(state.status.toLowerCase()));
        const connectionMatch = (!state.connection || meta.toLowerCase().includes(state.connection.toLowerCase()));
        const queueMatch = (!state.queue || meta.toLowerCase().includes(state.queue.toLowerCase()));

        return jobMatch && statusMatch && connectionMatch && queueMatch;
      }
    },

    cache: {
      name: 'Cache',
      url: '/telescope/cache',
      filters: [
        { type: 'text', id: 'key', label: 'Key Contains', placeholder: 'e.g. user_' },
        { type: 'text', id: 'action', label: 'Action', placeholder: 'e.g. hit, missed, set' }
      ],
      filterFn: (row, state) => {
        const keyTd = row.querySelectorAll('td')[0];
        const actionBadge = row.querySelectorAll('td')[1]?.querySelector('.badge');

        if (!keyTd || !actionBadge) return true;

        const key = keyTd.textContent.trim();
        const action = actionBadge.textContent.trim();

        const keyMatch = (!state.key || key.toLowerCase().includes(state.key.toLowerCase()));
        const actionMatch = (!state.action || action.toLowerCase().includes(state.action.toLowerCase()));

        return keyMatch && actionMatch;
      }
    },

    queries: {
      name: 'Queries',
      url: '/telescope/queries',
      filters: [
        { type: 'text', id: 'query', label: 'Query Contains', placeholder: 'e.g. SELECT, users' },
        { type: 'duration', id: 'duration', label: 'Duration (ms)', placeholder: 'e.g. 100' }
      ],
      filterFn: (row, state) => {
        const queryTd = row.querySelectorAll('td')[0];
        const durationText = row.querySelectorAll('td')[1]?.querySelector('span');

        if (!queryTd) return true;

        const query = queryTd.textContent.trim();
        const duration = durationText ? durationText.textContent.trim() : '0ms';
        const durationValue = parseInt(duration.replace('ms', '')) || 0;

        const queryMatch = (!state.query || query.toLowerCase().includes(state.query.toLowerCase()));
        const durationMatch = (!state.duration || durationValue >= parseInt(state.duration));

        return queryMatch && durationMatch;
      }
    },

    events: {
      name: 'Events',
      url: '/telescope/events',
      filters: [
        { type: 'text', id: 'name', label: 'Event Name', placeholder: 'e.g. UserRegistered' },
        { type: 'text', id: 'listeners', label: 'Listeners', placeholder: 'e.g. SendWelcomeEmail' }
      ],
      filterFn: (row, state) => {
        const nameTd = row.querySelectorAll('td')[0];
        const listenersTd = row.querySelectorAll('td')[1];

        if (!nameTd) return true;

        const name = nameTd.textContent.trim();
        const listeners = listenersTd ? listenersTd.textContent.trim() : '';

        const nameMatch = (!state.name || name.toLowerCase().includes(state.name.toLowerCase()));
        const listenersMatch = (!state.listeners || listeners.toLowerCase().includes(state.listeners.toLowerCase()));

        return nameMatch && listenersMatch;
      }
    },

    gates: {
      name: 'Gates',
      url: '/telescope/gates',
      filters: [
        { type: 'text', id: 'ability', label: 'Ability', placeholder: 'e.g. update-post' },
        { type: 'text', id: 'result', label: 'Result', placeholder: 'e.g. allowed, denied' }
      ],
      filterFn: (row, state) => {
        const abilityTd = row.querySelectorAll('td')[0];
        const resultBadge = row.querySelectorAll('td')[1]?.querySelector('.badge');

        if (!abilityTd || !resultBadge) return true;

        const ability = abilityTd.textContent.trim();
        const result = resultBadge.textContent.trim();

        const abilityMatch = (!state.ability || ability.toLowerCase().includes(state.ability.toLowerCase()));
        const resultMatch = (!state.result || result.toLowerCase().includes(state.result.toLowerCase()));

        return abilityMatch && resultMatch;
      }
    },

    logs: {
      name: 'Logs',
      url: '/telescope/logs',
      filters: [
        { type: 'text', id: 'message', label: 'Message Contains', placeholder: 'e.g. error, user' },
        { type: 'text', id: 'level', label: 'Level', placeholder: 'e.g. error, warning, info' }
      ],
      filterFn: (row, state) => {
        const messageTd = row.querySelectorAll('td')[0];
        const levelBadge = row.querySelectorAll('td')[1]?.querySelector('.badge');

        if (!messageTd || !levelBadge) return true;

        const message = messageTd.textContent.trim();
        const level = levelBadge.textContent.trim();

        const messageMatch = (!state.message || message.toLowerCase().includes(state.message.toLowerCase()));
        const levelMatch = (!state.level || level.toLowerCase().includes(state.level.toLowerCase()));

        return messageMatch && levelMatch;
      }
    },

    models: {
      name: 'Models',
      url: '/telescope/models',
      filters: [
        { type: 'text', id: 'model', label: 'Model', placeholder: 'e.g. User, Post' },
        { type: 'text', id: 'action', label: 'Action', placeholder: 'e.g. created, updated' }
      ],
      filterFn: (row, state) => {
        const modelTd = row.querySelectorAll('td')[0];
        const actionBadge = row.querySelectorAll('td')[1]?.querySelector('.badge');

        if (!modelTd || !actionBadge) return true;

        const model = modelTd.textContent.trim();
        const action = actionBadge.textContent.trim();

        const modelMatch = (!state.model || model.toLowerCase().includes(state.model.toLowerCase()));
        const actionMatch = (!state.action || action.toLowerCase().includes(state.action.toLowerCase()));

        return modelMatch && actionMatch;
      }
    },

    redis: {
      name: 'Redis',
      url: '/telescope/redis',
      filters: [
        { type: 'text', id: 'command', label: 'Command', placeholder: 'e.g. GET, SET' },
        { type: 'duration', id: 'duration', label: 'Duration (ms)', placeholder: 'e.g. 10' }
      ],
      filterFn: (row, state) => {
        const commandTd = row.querySelectorAll('td')[0];
        const durationText = row.querySelectorAll('td')[1]?.querySelector('span');

        if (!commandTd) return true;

        const command = commandTd.textContent.trim();
        const duration = durationText ? durationText.textContent.trim() : '0ms';
        const durationValue = parseInt(duration.replace('ms', '')) || 0;

        const commandMatch = (!state.command || command.toLowerCase().includes(state.command.toLowerCase()));
        const durationMatch = (!state.duration || durationValue >= parseInt(state.duration));

        return commandMatch && durationMatch;
      }
    },

    views: {
      name: 'Views',
      url: '/telescope/views',
      filters: [
        { type: 'text', id: 'name', label: 'View Name', placeholder: 'e.g. welcome, dashboard' },
        { type: 'text', id: 'composers', label: 'Composers', placeholder: 'e.g. ProfileComposer' }
      ],
      filterFn: (row, state) => {
        const nameTd = row.querySelectorAll('td')[0];
        const composersTd = row.querySelectorAll('td')[1];

        if (!nameTd) return true;

        const name = nameTd.textContent.trim();
        const composers = composersTd ? composersTd.textContent.trim() : '';

        const nameMatch = (!state.name || name.toLowerCase().includes(state.name.toLowerCase()));
        const composersMatch = (!state.composers || composers.toLowerCase().includes(state.composers.toLowerCase()));

        return nameMatch && composersMatch;
      }
    },

    commands: {
      name: 'Commands',
      url: '/telescope/commands',
      filters: [
        { type: 'text', id: 'command', label: 'Command Name', placeholder: 'e.g. migrate, queue:work' },
        { type: 'text', id: 'exitCode', label: 'Exit Code', placeholder: 'e.g. 0, 1' }
      ],
      filterFn: (row, state) => {
        const commandTd = row.querySelectorAll('td')[0];
        const exitCodeTd = row.querySelectorAll('td')[1];

        if (!commandTd || !exitCodeTd) return true;

        const command = commandTd.textContent.trim();
        const exitCode = exitCodeTd.textContent.trim();

        const commandMatch = (!state.command || command.toLowerCase().includes(state.command.toLowerCase()));
        const exitCodeMatch = (!state.exitCode || exitCode.includes(state.exitCode));

        return commandMatch && exitCodeMatch;
      }
    },

    exceptions: {
      name: 'Exceptions',
      url: '/telescope/exceptions',
      filters: [
        { type: 'text', id: 'type', label: 'Exception Type', placeholder: 'e.g. ErrorException' },
        { type: 'text', id: 'message', label: 'Message Contains', placeholder: 'e.g. file not found' },
        { type: 'text', id: 'count', label: 'Min Occurrences', placeholder: 'e.g. 5' }
      ],
      filterFn: (row, state) => {
        const typeTd = row.querySelectorAll('td')[0];
        const countTd = row.querySelectorAll('td')[1];

        if (!typeTd || !countTd) return true;

        const typeTitle = typeTd.getAttribute('title') || '';
        const typeText = typeTd.textContent.trim();
        const count = parseInt(countTd.textContent.trim()) || 0;

        const typeMatch = (!state.type || typeTitle.toLowerCase().includes(state.type.toLowerCase()) || typeText.toLowerCase().includes(state.type.toLowerCase()));
        const messageMatch = (!state.message || typeText.toLowerCase().includes(state.message.toLowerCase()));
        const countMatch = (!state.count || count >= parseInt(state.count));

        return typeMatch && messageMatch && countMatch;
      }
    },

    // Pages with TODO messages (empty or disabled)
    schedule: { name: 'Schedule', url: '/telescope/schedule', todo: true },
    batches: { name: 'Batches', url: '/telescope/batches', todo: true },
    mail: { name: 'Mail', url: '/telescope/mail', todo: true },
    notifications: { name: 'Notifications', url: '/telescope/notifications', todo: true },
    dumps: { name: 'Dumps', url: '/telescope/dumps', todo: true }
  };

  /**
   * LocalStorage functions
   */
  function isStorageEnabled() {
    return localStorage.getItem(STORAGE_ENABLED_KEY) === 'true';
  }

  function setStorageEnabled(enabled) {
    localStorage.setItem(STORAGE_ENABLED_KEY, enabled.toString());
    if (!enabled) {
      // Clear all saved filters when disabled
      clearAllFilters();
    }
  }

  function saveFilters(pageKey, filters) {
    if (isStorageEnabled()) {
      const key = STORAGE_KEY_PREFIX + pageKey;
      localStorage.setItem(key, JSON.stringify(filters));
    }
  }

  function loadFilters(pageKey) {
    if (isStorageEnabled()) {
      const key = STORAGE_KEY_PREFIX + pageKey;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  }

  function clearAllFilters() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }

  /**
   * Telescope Links localStorage functions
   */
  function loadTelescopeLinks() {
    const saved = localStorage.getItem(STORAGE_TELESCOPE_LINKS_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  function saveTelescopeLinks(links) {
    localStorage.setItem(STORAGE_TELESCOPE_LINKS_KEY, JSON.stringify(links));
  }

  /**
   * Check current URL and redirect to Telescope if needed
   */
  function checkAndRedirect() {
    const currentUrl = window.location.href;

    // If already on telescope, don't redirect
    if (currentUrl.toLowerCase().includes('telescope')) {
      return false;
    }

    // Load telescope links from localStorage
    const links = loadTelescopeLinks();

    // Check if current URL matches any site URL
    for (const link of links) {
      if (link.siteUrl && link.telescopeUrl && currentUrl.includes(link.siteUrl)) {
        // Open telescope in new tab
        window.open(link.telescopeUrl, '_blank');
        return true; // Opened in new tab
      }
    }

    // No matching link found
    return false;
  }

  /**
   * Detect current page from URL
   */
  function detectCurrentPage() {
    const url = window.location.pathname;
    for (const [key, config] of Object.entries(PAGE_CONFIGS)) {
      if (url.includes(config.url)) {
        return key;
      }
    }
    return null;
  }

  /**
   * Generate filter input HTML based on filter type
   */
  function generateFilterInput(filter) {
    const commonStyle = 'width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb';

    if (filter.type === 'select') {
      const options = filter.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
      return `
        <div style="margin-bottom:12px">
          <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">${filter.label}:</label>
          <select id="tf_${filter.id}" style="${commonStyle}">${options}</select>
        </div>
      `;
    } else if (filter.type === 'duration') {
      return `
        <div style="margin-bottom:12px">
          <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">${filter.label}:</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="tf_${filter.id}" placeholder="${filter.placeholder}" style="flex:1;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
            <button id="tf_${filter.id}_inc" style="padding:8px 12px;background:#f59e0b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">+1sec</button>
          </div>
        </div>
      `;
    } else {
      return `
        <div style="margin-bottom:12px">
          <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">${filter.label}:</label>
          <input type="text" id="tf_${filter.id}" placeholder="${filter.placeholder}" style="${commonStyle}">
        </div>
      `;
    }
  }

  /**
   * Generate HTML for the filter dialog
   */
  function generateDialogHTML(pageKey) {
    const config = PAGE_CONFIGS[pageKey];

    let contentHTML = '';

    if (config.todo) {
      contentHTML = `
        <div style="text-align:center;padding:40px 20px;color:#9ca3af">
          <p style="font-size:48px;margin:0 0 10px">🚧</p>
          <p style="font-size:14px;margin:0">TODO: Filters not yet implemented</p>
          <p style="font-size:12px;margin:10px 0 0;color:#6b7280">This page type will be supported in a future update</p>
        </div>
      `;
    } else {
      const filtersHTML = config.filters.map(f => generateFilterInput(f)).join('');
      contentHTML = `
        <h3 style="margin:0 0 15px;color:#f9fafb;font-size:16px">Filter ${config.name}</h3>
        ${filtersHTML}
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button id="tfFilter" style="flex:1;padding:8px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">Apply</button>
          <button id="tfReset" style="flex:1;padding:8px;background:#6b7280;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">Reset</button>
        </div>
      `;
    }

    return `
      <div id="tfDialog" style="position:fixed;top:20px;right:20px;background:#1f2937;padding:20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:10000;width:280px;font-family:sans-serif;border:1px solid #374151">
        <div style="margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #374151;display:flex;align-items:center;justify-content:space-between">
          <h2 id="tfActiveTab" style="margin:0;color:#3b82f6;font-size:16px;font-weight:600;flex:1;text-align:center">${config.name}</h2>
          <button id="tfSettingsBtn" style="background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:18px;padding:4px 8px;line-height:1;margin:0" title="Settings">⚙</button>
        </div>

        <div id="tfContent">${contentHTML}</div>

        <div style="margin-bottom:8px">
          <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Load More:</label>
          <div style="display:flex;gap:6px">
            <button class="tfLoadMoreBtn" data-count="1" style="flex:1;padding:8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">1</button>
            <button class="tfLoadMoreBtn" data-count="10" style="flex:1;padding:8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">10</button>
            <button class="tfLoadMoreBtn" data-count="100" style="flex:1;padding:8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">100</button>
            <button class="tfLoadMoreBtn" data-count="1000" style="flex:1;padding:8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">1000</button>
          </div>
        </div>
        <button id="tfClose" style="width:100%;padding:8px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;margin-bottom:12px">Close</button>

        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#9ca3af;font-size:12px;margin-bottom:12px">
          <input type="checkbox" id="tfStorageEnabled" style="cursor:pointer;width:14px;height:14px">
          <span>Remember filters</span>
        </label>

        <div style="text-align:center;padding-top:8px;border-top:1px solid #374151">
          <a href="https://github.com/Antons-S/laravel-telescope-filter" target="_blank" style="color:#9ca3af;font-size:11px;text-decoration:none">Latest version on GitHub</a>
          <div style="color:#6b7280;font-size:10px;margin-top:4px">v1.0.8</div>
        </div>
      </div>
    `;
  }

  /**
   * Generate settings modal HTML
   */
  function generateSettingsHTML() {
    const links = loadTelescopeLinks();
    const currentUrl = window.location.origin + window.location.pathname;

    let linksHTML = '';
    if (links.length === 0) {
      linksHTML = `
        <div id="tfLinksContainer">
          <div class="tfLinkRow" style="display:flex;gap:8px;margin-bottom:8px">
            <input type="text" class="tfSiteUrl" value="${currentUrl}" placeholder="example.com" style="flex:1;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;background:#111827;color:#f9fafb">
            <input type="text" class="tfTelescopeUrl" placeholder="example.com/telescope" style="flex:1;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;background:#111827;color:#f9fafb">
            <button class="tfRemoveLinkBtn" style="padding:8px 12px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px">×</button>
          </div>
        </div>
      `;
    } else {
      linksHTML = '<div id="tfLinksContainer">';
      links.forEach((link) => {
        linksHTML += `
          <div class="tfLinkRow" style="display:flex;gap:8px;margin-bottom:8px">
            <input type="text" class="tfSiteUrl" value="${link.siteUrl || ''}" placeholder="example.com" style="flex:1;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;background:#111827;color:#f9fafb">
            <input type="text" class="tfTelescopeUrl" value="${link.telescopeUrl || ''}" placeholder="example.com/telescope" style="flex:1;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;background:#111827;color:#f9fafb">
            <button class="tfRemoveLinkBtn" style="padding:8px 12px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px">×</button>
          </div>
        `;
      });
      linksHTML += '</div>';
    }

    return `
      <div id="tfSettingsModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;font-family:sans-serif">
        <div style="background:#1f2937;border-radius:8px;width:90%;max-width:700px;max-height:90vh;overflow:auto;border:1px solid #374151">
          <div style="padding:20px;border-bottom:1px solid #374151;display:flex;align-items:center;justify-content:space-between">
            <h2 style="margin:0;color:#f9fafb;font-size:18px;font-weight:600">Settings</h2>
            <button id="tfSettingsClose" style="background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:24px;padding:0;line-height:1" title="Close">×</button>
          </div>

          <div style="padding:20px">
            <h3 style="margin:0 0 15px;color:#f9fafb;font-size:16px;font-weight:600">Telescope Links</h3>
            <p style="margin:0 0 15px;color:#9ca3af;font-size:13px">Map site URLs to their Telescope links. When you open the bookmarklet on a matching site, it will open Telescope in a new tab.</p>
            <p style="margin:0 0 15px;color:#6b7280;font-size:12px;font-style:italic">Note: Settings are stored in localStorage and are domain-specific. Each domain maintains its own list of telescope links.</p>

            <div style="margin-bottom:15px">
              <div style="display:flex;gap:8px;margin-bottom:8px">
                <div style="flex:1;font-weight:600;color:#9ca3af;font-size:13px">Site URL Pattern</div>
                <div style="flex:1;font-weight:600;color:#9ca3af;font-size:13px">Telescope URL</div>
                <div style="width:44px"></div>
              </div>
              ${linksHTML}
            </div>

            <button id="tfAddLinkBtn" style="width:100%;padding:10px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;margin-bottom:15px">+ Add Link</button>

            <button id="tfSaveLinksBtn" style="width:100%;padding:10px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:14px">Save</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show settings modal
   */
  function showSettings() {
    // Remove existing modal if any
    const existingModal = doc.getElementById('tfSettingsModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create and append modal
    const modalContainer = doc.createElement('div');
    modalContainer.innerHTML = generateSettingsHTML();
    doc.body.appendChild(modalContainer.firstElementChild);

    // Setup event listeners
    setupSettingsListeners();
  }

  /**
   * Setup settings modal event listeners
   */
  function setupSettingsListeners() {
    // Close button
    doc.getElementById('tfSettingsClose').onclick = () => {
      doc.getElementById('tfSettingsModal').remove();
    };

    // Add link button
    doc.getElementById('tfAddLinkBtn').onclick = () => {
      const container = doc.getElementById('tfLinksContainer');
      const currentUrl = window.location.origin + window.location.pathname;
      const newRow = doc.createElement('div');
      newRow.className = 'tfLinkRow';
      newRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';
      newRow.innerHTML = `
        <input type="text" class="tfSiteUrl" value="${currentUrl}" placeholder="example.com" style="flex:1;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;background:#111827;color:#f9fafb">
        <input type="text" class="tfTelescopeUrl" placeholder="example.com/telescope" style="flex:1;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;background:#111827;color:#f9fafb">
        <button class="tfRemoveLinkBtn" style="padding:8px 12px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px">×</button>
      `;
      container.appendChild(newRow);

      // Setup remove button for new row
      newRow.querySelector('.tfRemoveLinkBtn').onclick = () => {
        newRow.remove();
      };
    };

    // Remove link buttons
    doc.querySelectorAll('.tfRemoveLinkBtn').forEach(btn => {
      btn.onclick = () => {
        btn.parentElement.remove();
      };
    });

    // Save button
    doc.getElementById('tfSaveLinksBtn').onclick = () => {
      const rows = doc.querySelectorAll('.tfLinkRow');
      const links = [];

      rows.forEach(row => {
        const siteUrl = row.querySelector('.tfSiteUrl').value.trim();
        const telescopeUrl = row.querySelector('.tfTelescopeUrl').value.trim();

        if (siteUrl && telescopeUrl) {
          links.push({ siteUrl, telescopeUrl });
        }
      });

      saveTelescopeLinks(links);
      alert('Telescope links saved successfully!');
      doc.getElementById('tfSettingsModal').remove();
    };
  }

  /**
   * Apply filters to table rows
   */
  function applyFilters() {
    if (!currentPage) return;

    const config = PAGE_CONFIGS[currentPage];
    if (!config.filterFn) return;

    const rows = doc.querySelectorAll('#indexScreen tbody tr:not(.dontanimate)');
    rows.forEach(row => {
      row.style.display = config.filterFn(row, filterState) ? '' : 'none';
    });
  }

  /**
   * Handle Load More button
   */
  function handleLoadMore(iterations, btnElement) {
    const autoLoadBtn = Array.from(document.querySelectorAll('button[title="Auto load entries"]'))
      .find(btn => btn.classList.contains('active'));

    if (autoLoadBtn) {
      autoLoadBtn.click();
      console.log('Disabled auto-load button');
    }

    const originalText = btnElement.textContent;
    let successCount = 0;


    // Add spinner style
    const spinnerStyle = doc.createElement('style');
    spinnerStyle.textContent = `
      @keyframes tfSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .tf-spinner { display: inline-block; animation: tfSpin 1s linear infinite; }
    `;
    doc.head.appendChild(spinnerStyle);

    // Update button to show spinner and count
    function updateButtonText() {
      btnElement.innerHTML = `<span class="tf-spinner">⟳</span> ${successCount}`;
    }

    // Disable all load more buttons during operation
    const allLoadBtns = doc.querySelectorAll('.tfLoadMoreBtn');
    allLoadBtns.forEach(btn => btn.disabled = true);
    updateButtonText();

    function isLoading() {
      const loadingCells = Array.from(document.querySelectorAll('td[colspan="100"]'))
        .filter(td => td.textContent.includes('Loading...'));
      return loadingCells.length > 0;
    }

    function loadMore() {
      const btns = Array.from(document.querySelectorAll('a'))
        .filter(e => e.textContent.trim() === "Load Older Entries");
      const btn = btns[btns.length - 1];

      if (btn) {
        btn.click();
        successCount++;
        updateButtonText();
        console.log(`Clicked ${successCount}/${iterations}`);

        if (successCount < iterations) {
          setTimeout(loadMore, LOAD_MORE_DELAY);
        } else {
          console.log(`Completed ${successCount} clicks.`);
          finish();
        }
      } else if (isLoading()) {
        // Still loading, wait and retry indefinitely
        console.log(`Loading... waiting for more entries to appear`);
        setTimeout(loadMore, LOAD_MORE_DELAY);
      } else {
        // Button not found and not loading - no more entries available
        console.log(`Stopped after ${successCount} successful clicks. No more entries available.`);
        finish();
      }
    }

    function finish() {
      // Re-enable all buttons and restore text
      allLoadBtns.forEach(btn => btn.disabled = false);
      btnElement.textContent = originalText;
      spinnerStyle.remove();
    }

    loadMore();
  }

  /**
   * Initialize the filter dialog
   */
  function init() {
    // Remove any existing dialog first
    const existingContainer = doc.getElementById('tfContainer');
    if (existingContainer) {
      if (filterInterval) clearInterval(filterInterval);
      filterInterval = null;
      existingContainer.remove();
    }

    currentPage = detectCurrentPage();
    if (!currentPage) {
      // Not on a telescope page - show settings to add telescope link
      showSettings();
      return;
    }

    const config = PAGE_CONFIGS[currentPage];

    // Create dialog
    const container = doc.createElement('div');
    container.id = 'tfContainer';
    container.innerHTML = generateDialogHTML(currentPage);
    doc.body.appendChild(container);

    // Setup event listeners for TODO pages
    if (config.todo) {
      const loadMoreButtons = doc.querySelectorAll('.tfLoadMoreBtn');
      loadMoreButtons.forEach(btn => {
        btn.onclick = () => handleLoadMore(parseInt(btn.getAttribute('data-count')), btn);
      });
      doc.getElementById('tfClose').onclick = () => {
        if (filterInterval) clearInterval(filterInterval);
        container.remove();
      };
      return;
    }

    // Setup filter input references and handlers
    const inputs = {};
    config.filters.forEach(filter => {
      const input = doc.getElementById(`tf_${filter.id}`);
      if (input) {
        inputs[filter.id] = input;

        // Setup +1sec button for duration filters
        if (filter.type === 'duration') {
          const incButton = doc.getElementById(`tf_${filter.id}_inc`);
          if (incButton) {
            incButton.onclick = () => {
              const current = parseInt(input.value) || 0;
              input.value = current + 1000;
            };
          }
        }

        // Enter key support
        input.onkeypress = (e) => {
          if (e.key === 'Enter') doc.getElementById('tfFilter').click();
        };
      }
    });

    // Load saved filters from localStorage
    const savedFilters = loadFilters(currentPage);
    const hasSavedFilters = Object.keys(savedFilters).length > 0;
    Object.keys(savedFilters).forEach(key => {
      const input = inputs[key];
      if (input && savedFilters[key]) {
        input.value = savedFilters[key];
      }
    });

    // Auto-apply saved filters if they exist
    if (hasSavedFilters) {
      filterState = savedFilters;
      filterInterval = setInterval(applyFilters, REFRESH_INTERVAL);
      applyFilters();
    }

    // Setup storage checkbox
    const storageCheckbox = doc.getElementById('tfStorageEnabled');
    if (storageCheckbox) {
      storageCheckbox.checked = isStorageEnabled();
      storageCheckbox.onchange = () => {
        setStorageEnabled(storageCheckbox.checked);
        if (storageCheckbox.checked) {
          // Save current filters when enabled
          const currentFilters = {};
          config.filters.forEach(filter => {
            const input = inputs[filter.id];
            if (input && input.value) {
              currentFilters[filter.id] = input.value;
            }
          });
          saveFilters(currentPage, currentFilters);
        }
      };
    }

    // Apply button
    doc.getElementById('tfFilter').onclick = () => {
      filterState = {};
      config.filters.forEach(filter => {
        const input = inputs[filter.id];
        if (input) {
          filterState[filter.id] = input.value;
        }
      });

      // Save to localStorage if enabled
      saveFilters(currentPage, filterState);

      if (filterInterval) clearInterval(filterInterval);
      filterInterval = setInterval(applyFilters, REFRESH_INTERVAL);
      applyFilters();
    };

    // Reset button
    doc.getElementById('tfReset').onclick = () => {
      if (filterInterval) clearInterval(filterInterval);
      filterInterval = null;
      filterState = {};

      config.filters.forEach(filter => {
        const input = inputs[filter.id];
        if (input) {
          input.value = filter.type === 'select' ? filter.options[0] : '';
        }
      });

      // Clear saved filters from localStorage
      if (isStorageEnabled()) {
        const key = STORAGE_KEY_PREFIX + currentPage;
        localStorage.removeItem(key);
      }

      applyFilters();
    };

    // Load More buttons
    const loadMoreButtons = doc.querySelectorAll('.tfLoadMoreBtn');
    loadMoreButtons.forEach(btn => {
      btn.onclick = () => handleLoadMore(parseInt(btn.getAttribute('data-count')), btn);
    });

    // Settings button
    doc.getElementById('tfSettingsBtn').onclick = () => {
      showSettings();
    };

    // Close button
    doc.getElementById('tfClose').onclick = () => {
      if (filterInterval) clearInterval(filterInterval);
      container.remove();
    };

    // URL change detection for SPA navigation
    let lastUrl = location.pathname;
    setInterval(() => {
      if (location.pathname !== lastUrl) {
        lastUrl = location.pathname;
        const newPage = detectCurrentPage();
        if (newPage !== currentPage) {
          if (filterInterval) clearInterval(filterInterval);
          container.remove();
          setTimeout(init, 100);
        }
      }
    }, REFRESH_INTERVAL);
  }

  // Start the application
  // Check if we should redirect to Telescope
  if (!checkAndRedirect()) {
    // No redirect happened, show the dialog
    init();
  }
})();
