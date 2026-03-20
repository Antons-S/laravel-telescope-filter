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

  // Version info
  const CURRENT_VERSION = '1.0.18';
  const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/Antons-S/laravel-telescope-filter/refs/heads/main/version.txt';
  let latestVersion = null;

  // LocalStorage keys
  const STORAGE_KEY_PREFIX = 'telescope_filter_';
  const STORAGE_ENABLED_KEY = 'telescope_filter_enabled';
  const STORAGE_TELESCOPE_LINKS_KEY = 'telescope_links';
  const STORAGE_POSITION_KEY = 'telescope_filter_position';
  const STORAGE_CUSTOM_POS_KEY = 'telescope_filter_custom_pos';
  const STORAGE_SETTINGS_KEY = 'telescope_filter_settings';
  const STORAGE_SEARCH_VALUE_KEY = 'telescope_filter_search_value';

  // Page configurations for all 18 Telescope pages
  const PAGE_CONFIGS = {
    requests: {
      name: 'Requests',
      url: '/telescope/requests',
      filters: [
        { type: 'select', id: 'method', label: 'Method', options: ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { type: 'text', id: 'path', label: 'Path Contains', placeholder: 'e.g. /api/v1/users' },
        { type: 'text', id: 'path_not', label: 'Path Not Contains', placeholder: 'Exclude e.g. /health' },
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
        const pathNotMatch = (!state.path_not || !path.toLowerCase().includes(state.path_not.toLowerCase()));

        return methodMatch && statusMatch && durationMatch && pathMatch && pathNotMatch;
      }
    },

    'client-requests': {
      name: 'HTTP Client',
      url: '/telescope/client-requests',
      filters: [
        { type: 'select', id: 'method', label: 'Method', options: ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { type: 'text', id: 'status', label: 'Status', placeholder: 'e.g. 200, 404' },
        { type: 'duration', id: 'duration', label: 'Duration (ms)', placeholder: 'e.g. 1000' },
        { type: 'text', id: 'uri', label: 'URI Contains', placeholder: 'e.g. api/models' },
        { type: 'text', id: 'uri_not', label: 'URI Not Contains', placeholder: 'Exclude e.g. api/health' }
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
        const uriNotMatch = (!state.uri_not || !uri.toLowerCase().includes(state.uri_not.toLowerCase()));

        return methodMatch && statusMatch && durationMatch && uriMatch && uriNotMatch;
      }
    },

    jobs: {
      name: 'Jobs',
      url: '/telescope/jobs',
      filters: [
        { type: 'text', id: 'jobName', label: 'Job Name', placeholder: 'e.g. SendEmailJob' },
        { type: 'text', id: 'jobName_not', label: 'Job Name Not Contains', placeholder: 'Exclude e.g. PruneJob' },
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
        const jobNotMatch = (!state.jobName_not || !job.toLowerCase().includes(state.jobName_not.toLowerCase()));
        const statusMatch = (!state.status || status.toLowerCase().includes(state.status.toLowerCase()));
        const connectionMatch = (!state.connection || meta.toLowerCase().includes(state.connection.toLowerCase()));
        const queueMatch = (!state.queue || meta.toLowerCase().includes(state.queue.toLowerCase()));

        return jobMatch && jobNotMatch && statusMatch && connectionMatch && queueMatch;
      }
    },

    cache: {
      name: 'Cache',
      url: '/telescope/cache',
      filters: [
        { type: 'text', id: 'key', label: 'Key Contains', placeholder: 'e.g. user_' },
        { type: 'text', id: 'key_not', label: 'Key Not Contains', placeholder: 'Exclude e.g. temp_' },
        { type: 'text', id: 'action', label: 'Action', placeholder: 'e.g. hit, missed, set' }
      ],
      filterFn: (row, state) => {
        const keyTd = row.querySelectorAll('td')[0];
        const actionBadge = row.querySelectorAll('td')[1]?.querySelector('.badge');

        if (!keyTd || !actionBadge) return true;

        const key = keyTd.textContent.trim();
        const action = actionBadge.textContent.trim();

        const keyMatch = (!state.key || key.toLowerCase().includes(state.key.toLowerCase()));
        const keyNotMatch = (!state.key_not || !key.toLowerCase().includes(state.key_not.toLowerCase()));
        const actionMatch = (!state.action || action.toLowerCase().includes(state.action.toLowerCase()));

        return keyMatch && keyNotMatch && actionMatch;
      }
    },

    queries: {
      name: 'Queries',
      url: '/telescope/queries',
      filters: [
        { type: 'text', id: 'query', label: 'Query Contains', placeholder: 'e.g. SELECT, users' },
        { type: 'text', id: 'query_not', label: 'Query Not Contains', placeholder: 'Exclude e.g. telescope' },
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
        const queryNotMatch = (!state.query_not || !query.toLowerCase().includes(state.query_not.toLowerCase()));
        const durationMatch = (!state.duration || durationValue >= parseInt(state.duration));

        return queryMatch && queryNotMatch && durationMatch;
      }
    },

    events: {
      name: 'Events',
      url: '/telescope/events',
      filters: [
        { type: 'text', id: 'name', label: 'Event Name', placeholder: 'e.g. UserRegistered' },
        { type: 'text', id: 'name_not', label: 'Event Name Not Contains', placeholder: 'Exclude e.g. Heartbeat' },
        { type: 'text', id: 'listeners', label: 'Listeners', placeholder: 'e.g. SendWelcomeEmail' }
      ],
      filterFn: (row, state) => {
        const nameTd = row.querySelectorAll('td')[0];
        const listenersTd = row.querySelectorAll('td')[1];

        if (!nameTd) return true;

        const name = nameTd.textContent.trim();
        const listeners = listenersTd ? listenersTd.textContent.trim() : '';

        const nameMatch = (!state.name || name.toLowerCase().includes(state.name.toLowerCase()));
        const nameNotMatch = (!state.name_not || !name.toLowerCase().includes(state.name_not.toLowerCase()));
        const listenersMatch = (!state.listeners || listeners.toLowerCase().includes(state.listeners.toLowerCase()));

        return nameMatch && nameNotMatch && listenersMatch;
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
        { type: 'text', id: 'message_not', label: 'Message Not Contains', placeholder: 'Exclude e.g. deprecated' },
        { type: 'text', id: 'level', label: 'Level', placeholder: 'e.g. error, warning, info' }
      ],
      filterFn: (row, state) => {
        const messageTd = row.querySelectorAll('td')[0];
        const levelBadge = row.querySelectorAll('td')[1]?.querySelector('.badge');

        if (!messageTd || !levelBadge) return true;

        const message = messageTd.textContent.trim();
        const level = levelBadge.textContent.trim();

        const messageMatch = (!state.message || message.toLowerCase().includes(state.message.toLowerCase()));
        const messageNotMatch = (!state.message_not || !message.toLowerCase().includes(state.message_not.toLowerCase()));
        const levelMatch = (!state.level || level.toLowerCase().includes(state.level.toLowerCase()));

        return messageMatch && messageNotMatch && levelMatch;
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
        { type: 'text', id: 'name_not', label: 'View Name Not Contains', placeholder: 'Exclude e.g. partials' },
        { type: 'text', id: 'composers', label: 'Composers', placeholder: 'e.g. ProfileComposer' }
      ],
      filterFn: (row, state) => {
        const nameTd = row.querySelectorAll('td')[0];
        const composersTd = row.querySelectorAll('td')[1];

        if (!nameTd) return true;

        const name = nameTd.textContent.trim();
        const composers = composersTd ? composersTd.textContent.trim() : '';

        const nameMatch = (!state.name || name.toLowerCase().includes(state.name.toLowerCase()));
        const nameNotMatch = (!state.name_not || !name.toLowerCase().includes(state.name_not.toLowerCase()));
        const composersMatch = (!state.composers || composers.toLowerCase().includes(state.composers.toLowerCase()));

        return nameMatch && nameNotMatch && composersMatch;
      }
    },

    commands: {
      name: 'Commands',
      url: '/telescope/commands',
      filters: [
        { type: 'text', id: 'command', label: 'Command Name', placeholder: 'e.g. migrate, queue:work' },
        { type: 'text', id: 'command_not', label: 'Command Name Not Contains', placeholder: 'Exclude e.g. schedule:run' },
        { type: 'text', id: 'exitCode', label: 'Exit Code', placeholder: 'e.g. 0, 1' }
      ],
      filterFn: (row, state) => {
        const commandTd = row.querySelectorAll('td')[0];
        const exitCodeTd = row.querySelectorAll('td')[1];

        if (!commandTd || !exitCodeTd) return true;

        const command = commandTd.textContent.trim();
        const exitCode = exitCodeTd.textContent.trim();

        const commandMatch = (!state.command || command.toLowerCase().includes(state.command.toLowerCase()));
        const commandNotMatch = (!state.command_not || !command.toLowerCase().includes(state.command_not.toLowerCase()));
        const exitCodeMatch = (!state.exitCode || exitCode.includes(state.exitCode));

        return commandMatch && commandNotMatch && exitCodeMatch;
      }
    },

    exceptions: {
      name: 'Exceptions',
      url: '/telescope/exceptions',
      filters: [
        { type: 'text', id: 'type', label: 'Exception Type', placeholder: 'e.g. ErrorException' },
        { type: 'text', id: 'type_not', label: 'Exception Type Not Contains', placeholder: 'Exclude e.g. Notice' },
        { type: 'text', id: 'message', label: 'Message Contains', placeholder: 'e.g. file not found' },
        { type: 'text', id: 'message_not', label: 'Message Not Contains', placeholder: 'Exclude e.g. deprecated' },
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
        const typeNotMatch = (!state.type_not || (!typeTitle.toLowerCase().includes(state.type_not.toLowerCase()) && !typeText.toLowerCase().includes(state.type_not.toLowerCase())));
        const messageMatch = (!state.message || typeText.toLowerCase().includes(state.message.toLowerCase()));
        const messageNotMatch = (!state.message_not || !typeText.toLowerCase().includes(state.message_not.toLowerCase()));
        const countMatch = (!state.count || count >= parseInt(state.count));

        return typeMatch && typeNotMatch && messageMatch && messageNotMatch && countMatch;
      }
    },

    mail: {
      name: 'Mail',
      url: '/telescope/mail',
      filters: [
        { type: 'text', id: 'mailable', label: 'Mailable', placeholder: 'e.g. UserVerification' },
        { type: 'text', id: 'subject', label: 'Subject', placeholder: 'e.g. Welcome' },
        { type: 'checkbox', id: 'queuedOnly', label: 'Queued Only' }
      ],
      filterFn: (row, state) => {
        const mailableTd = row.querySelectorAll('td')[0];
        if (!mailableTd) return true;

        const mailableSpan = mailableTd.querySelector('span[title]');
        const mailable = mailableSpan ? (mailableSpan.getAttribute('title') || mailableSpan.textContent.trim()) : '';

        const subjectSmall = mailableTd.querySelector('small.text-muted');
        const subject = subjectSmall ? subjectSmall.textContent.replace(/^Subject:\s*/i, '').trim() : '';

        const queuedBadge = mailableTd.querySelector('.badge');
        const isQueued = queuedBadge && queuedBadge.textContent.trim().toLowerCase() === 'queued';

        const mailableMatch = (!state.mailable || mailable.toLowerCase().includes(state.mailable.toLowerCase()));
        const subjectMatch = (!state.subject || subject.toLowerCase().includes(state.subject.toLowerCase()));
        const queuedMatch = (!state.queuedOnly || state.queuedOnly === 'false' || isQueued);

        return mailableMatch && subjectMatch && queuedMatch;
      }
    },

    // Pages with TODO messages (empty or disabled)
    schedule: { name: 'Schedule', url: '/telescope/schedule', todo: true },
    batches: { name: 'Batches', url: '/telescope/batches', todo: true },
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
   * Position localStorage functions
   */
  function loadPosition() {
    const saved = localStorage.getItem(STORAGE_POSITION_KEY);
    return saved || 'top-right';
  }

  function savePosition(position) {
    localStorage.setItem(STORAGE_POSITION_KEY, position);
  }

  function getPositionStyles(position) {
    const positions = {
      'top-right': 'top:20px;right:20px;bottom:auto;left:auto',
      'top-left': 'top:20px;left:20px;bottom:auto;right:auto',
      'bottom-right': 'bottom:20px;right:20px;top:auto;left:auto',
      'bottom-left': 'bottom:20px;left:20px;top:auto;right:auto'
    };
    return positions[position] || positions['top-right'];
  }

  function loadCustomPosition() {
    const saved = localStorage.getItem(STORAGE_CUSTOM_POS_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  function saveCustomPosition(x, y) {
    localStorage.setItem(STORAGE_CUSTOM_POS_KEY, JSON.stringify({ x, y }));
  }

  function clearCustomPosition() {
    localStorage.removeItem(STORAGE_CUSTOM_POS_KEY);
  }

  /**
   * Settings localStorage functions
   */
  function loadSettings() {
    const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
    return saved ? JSON.parse(saved) : {};
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  }

  function updateSetting(key, value) {
    const settings = loadSettings();
    settings[key] = value;
    saveSettings(settings);
  }

  /**
   * Persistent search tag functions
   */
  function isSearchPersistenceEnabled() {
    const settings = loadSettings();
    return settings.persistentSearchTag === true;
  }

  function setSearchPersistenceEnabled(enabled) {
    updateSetting('persistentSearchTag', enabled);
    if (!enabled) {
      clearSavedSearch();
    }
  }

  function saveSearchValue(value) {
    if (isSearchPersistenceEnabled()) {
      localStorage.setItem(STORAGE_SEARCH_VALUE_KEY, value);
    }
  }

  function loadSearchValue() {
    if (isSearchPersistenceEnabled()) {
      return localStorage.getItem(STORAGE_SEARCH_VALUE_KEY) || '';
    }
    return '';
  }

  function clearSavedSearch() {
    localStorage.removeItem(STORAGE_SEARCH_VALUE_KEY);
  }

  /**
   * Get the Telescope native search input
   */
  function getTelescopeSearchInput() {
    return doc.querySelector('input#searchInput, input[placeholder*="Search Tag"], input.form-control[placeholder*="Tag"]');
  }

  /**
   * Restore search value to Telescope search input
   */
  function restoreSearchValue() {
    if (!isSearchPersistenceEnabled()) return;

    const savedValue = loadSearchValue();
    if (!savedValue) return;

    const searchInput = getTelescopeSearchInput();
    if (searchInput && searchInput.value !== savedValue) {
      searchInput.value = savedValue;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Track the last monitored search input element and its value
  let lastMonitoredSearchInput = null;
  let lastKnownSearchValue = '';

  /**
   * Setup search input monitoring
   */
  function setupSearchMonitoring() {
    const searchInput = getTelescopeSearchInput();
    if (!searchInput) return;

    // Check if this is a new/different input element
    if (searchInput === lastMonitoredSearchInput) {
      // Same input - check for programmatic value changes (e.g., clicking tags)
      if (isSearchPersistenceEnabled() && searchInput.value !== lastKnownSearchValue) {
        lastKnownSearchValue = searchInput.value;
        saveSearchValue(searchInput.value);
      }
      return;
    }
    lastMonitoredSearchInput = searchInput;
    lastKnownSearchValue = searchInput.value;

    const saveIfChanged = () => {
      if (isSearchPersistenceEnabled() && searchInput.value !== lastKnownSearchValue) {
        lastKnownSearchValue = searchInput.value;
        saveSearchValue(searchInput.value);
      }
    };

    searchInput.addEventListener('input', saveIfChanged);
    searchInput.addEventListener('change', saveIfChanged);
    searchInput.addEventListener('blur', saveIfChanged);
    searchInput.addEventListener('keyup', saveIfChanged);

    restoreSearchValue();
    injectClearButtonInSearch(searchInput);
    setupTagClickListener();
  }

  /**
   * Listen for clicks on tag badges to capture tag values
   */
  function setupTagClickListener() {
    if (doc._tfTagListenerAdded) return;
    doc._tfTagListenerAdded = true;

    doc.addEventListener('click', (e) => {
      if (!isSearchPersistenceEnabled()) return;

      const badge = e.target.closest('a.badge.badge-info, a.badge-info');
      if (!badge) return;

      const href = badge.getAttribute('href');
      if (!href || !href.includes('tag=')) return;

      const tagMatch = href.match(/[?&]tag=([^&]+)/);
      if (tagMatch) {
        const tagValue = decodeURIComponent(tagMatch[1]);
        lastKnownSearchValue = tagValue;
        saveSearchValue(tagValue);
      }
    });
  }

  /**
   * Inject clear button inside the search input
   */
  function injectClearButtonInSearch(searchInput) {
    if (!searchInput || searchInput._tfClearInjected) return;
    searchInput._tfClearInjected = true;

    const parent = searchInput.parentElement;
    if (!parent) return;

    const wrapper = doc.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;width:100%';

    searchInput.parentNode.insertBefore(wrapper, searchInput);
    wrapper.appendChild(searchInput);

    const clearBtn = doc.createElement('button');
    clearBtn.type = 'button';
    clearBtn.innerHTML = '×';
    clearBtn.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;display:none';
    clearBtn.title = 'Clear search';

    function updateClearBtnVisibility() {
      clearBtn.style.display = searchInput.value ? 'block' : 'none';
    }

    searchInput.addEventListener('input', updateClearBtnVisibility);
    updateClearBtnVisibility();

    clearBtn.onclick = () => {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      clearSavedSearch();
      clearBtn.style.display = 'none';
      searchInput.focus();
    };

    wrapper.appendChild(clearBtn);
    searchInput.style.paddingRight = '30px';
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
   * Check for latest version from GitHub
   */
  function checkLatestVersion() {
    fetch(VERSION_CHECK_URL)
      .then(res => {
        if (!res.ok) {
          console.error('Telescope Filter: Version check failed - HTTP', res.status);
          return null;
        }
        return res.text();
      })
      .then(version => {
        if (version) {
          latestVersion = version.trim();
          updateVersionDisplay();
        }
      })
      .catch(err => {
        console.error('Telescope Filter: Version check failed -', err.message);
        // Silently fail - version display will show current only
      });
  }

  /**
   * Compare two version strings (e.g., "1.0.12" vs "1.0.11")
   */
  function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  /**
   * Update version display in footer
   */
  function updateVersionDisplay() {
    const versionEl = doc.getElementById('tfVersionDisplay');
    if (!versionEl) return;

    if (latestVersion && latestVersion !== CURRENT_VERSION) {
      const comparison = compareVersions(latestVersion, CURRENT_VERSION);

      if (comparison > 0) {
        // Latest is newer - update available
        versionEl.innerHTML = `
          <div style="color:#6b7280;font-size:10px;margin-top:4px">
            v${CURRENT_VERSION} <span style="color:#f59e0b;font-weight:600">(v${latestVersion} available!)</span>
          </div>
        `;
      } else {
        // Current is newer or equal - show as up to date
        versionEl.innerHTML = `
          <div style="color:#6b7280;font-size:10px;margin-top:4px">v${CURRENT_VERSION} <span style="color:#10b981">✓</span></div>
        `;
      }
    } else if (latestVersion) {
      // Up to date
      versionEl.innerHTML = `
        <div style="color:#6b7280;font-size:10px;margin-top:4px">v${CURRENT_VERSION} <span style="color:#10b981">✓</span></div>
      `;
    } else {
      // Still checking or failed
      versionEl.innerHTML = `
        <div style="color:#6b7280;font-size:10px;margin-top:4px">v${CURRENT_VERSION}</div>
      `;
    }
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
          <input type="text" id="tf_${filter.id}" placeholder="${filter.placeholder}" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb;margin-bottom:6px">
          <div style="display:flex;gap:4px">
            <button class="tf_${filter.id}_inc" data-amount="100" style="flex:1;padding:6px;background:#f59e0b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:11px">+100ms</button>
            <button class="tf_${filter.id}_inc" data-amount="1000" style="flex:1;padding:6px;background:#f59e0b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:11px">+1sec</button>
            <button class="tf_${filter.id}_inc" data-amount="10000" style="flex:1;padding:6px;background:#f59e0b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:11px">+10sec</button>
          </div>
        </div>
      `;
    } else if (filter.type === 'checkbox') {
      return `
        <div style="margin-bottom:12px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#9ca3af;font-size:13px;font-weight:600">
            <input type="checkbox" id="tf_${filter.id}" style="cursor:pointer;width:16px;height:16px">
            <span>${filter.label}</span>
          </label>
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
    const customPos = loadCustomPosition();
    let positionStyles;

    if (customPos) {
      positionStyles = `top:${customPos.y}px;left:${customPos.x}px;bottom:auto;right:auto`;
    } else {
      const position = loadPosition();
      positionStyles = getPositionStyles(position);
    }

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
        <div id="tfResultCount" style="text-align:center;color:#9ca3af;font-size:12px;margin-bottom:8px"></div>
      `;
    }

    return `
      <div id="tfDialog" style="position:fixed;${positionStyles};background:#1f2937;padding:20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:10000;width:280px;font-family:sans-serif;border:1px solid #374151">
        <div id="tfHeader" style="margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #374151;display:flex;align-items:center;justify-content:space-between;cursor:move">
          <h2 id="tfActiveTab" style="margin:0;color:#3b82f6;font-size:16px;font-weight:600;user-select:none;flex:1">${config.name}</h2>
          <button id="tfSettingsBtn" style="background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:20px;padding:4px 8px;line-height:1;margin:0" title="Settings">⚙</button>
        </div>

        <div id="tfContent">${contentHTML}</div>

        <div style="margin-bottom:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <label style="font-weight:600;color:#9ca3af;font-size:13px">Load More:</label>
            <button id="tfStopLoadMore" style="display:none;padding:4px 8px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600" title="Stop loading">✕ Stop</button>
          </div>
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

        <div style="padding-top:8px;border-top:1px solid #374151">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <button class="tfPositionBtn" data-position="top-left" style="padding:4px 8px;background:#374151;color:#9ca3af;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1" title="Top Left">↖</button>
            <a href="https://github.com/Antons-S/laravel-telescope-filter" target="_blank" style="color:#9ca3af;font-size:11px;text-decoration:none">Latest version on GitHub</a>
            <button class="tfPositionBtn" data-position="top-right" style="padding:4px 8px;background:#374151;color:#9ca3af;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1" title="Top Right">↗</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <button class="tfPositionBtn" data-position="bottom-left" style="padding:4px 8px;background:#374151;color:#9ca3af;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1" title="Bottom Left">↙</button>
            <div id="tfVersionDisplay" style="color:#6b7280;font-size:10px;text-align:center">v${CURRENT_VERSION}</div>
            <button class="tfPositionBtn" data-position="bottom-right" style="padding:4px 8px;background:#374151;color:#9ca3af;border:none;border-radius:4px;cursor:pointer;font-size:14px;line-height:1" title="Bottom Right">↘</button>
          </div>
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

            <div style="display:flex;align-items:center;gap:12px;margin:20px 0;cursor:pointer" id="tfAddLinkBtn">
              <div style="flex:1;height:1px;background:#374151"></div>
              <span style="color:#9ca3af;font-size:13px;white-space:nowrap">+ Add Link</span>
              <div style="flex:1;height:1px;background:#374151"></div>
            </div>

            <button id="tfSaveLinksBtn" style="width:100%;padding:12px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:14px;margin-bottom:20px">Save Changes</button>

            <div style="border-top:1px solid #374151;padding-top:20px;margin-bottom:20px">
              <h3 style="margin:0 0 10px;color:#f9fafb;font-size:16px;font-weight:600">Options</h3>
              <div style="display:flex;align-items:center;gap:8px">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#9ca3af;font-size:13px;flex:1">
                  <input type="checkbox" id="tfSearchPersistEnabled" style="cursor:pointer;width:16px;height:16px" ${isSearchPersistenceEnabled() ? 'checked' : ''}>
                  <span>Persistent search tag</span>
                </label>
                <button id="tfClearSearchBtn" style="padding:4px 10px;background:#6b7280;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px" title="Clear saved search value">Clear</button>
              </div>
              <p style="margin:8px 0 0;color:#6b7280;font-size:12px">When enabled, the search tag input will be saved and restored across page refreshes and tab switches.</p>
            </div>

            <div style="border-top:1px solid #374151;padding-top:20px">
              <h3 style="margin:0 0 10px;color:#f9fafb;font-size:16px;font-weight:600">Backup & Restore</h3>
              <p style="margin:0 0 15px;color:#9ca3af;font-size:13px">Export your settings as JSON to backup, or import previously exported settings.</p>

              <button id="tfExportBtn" style="width:100%;padding:10px;background:#6b7280;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;margin-bottom:10px">Export Settings</button>

              <div id="tfExportArea" style="display:none;margin-bottom:15px">
                <textarea id="tfExportText" readonly style="width:100%;height:120px;padding:10px;border:1px solid #374151;border-radius:4px;font-size:12px;font-family:monospace;background:#111827;color:#f9fafb;box-sizing:border-box;resize:vertical"></textarea>
                <p style="margin:8px 0 0;color:#6b7280;font-size:11px">Copy this JSON to backup your settings</p>
              </div>

              <button id="tfImportBtn" style="width:100%;padding:10px;background:#6b7280;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;margin-bottom:10px">Import Settings</button>

              <div id="tfImportArea" style="display:none;margin-bottom:10px">
                <textarea id="tfImportText" placeholder="Paste your exported JSON here..." style="width:100%;height:120px;padding:10px;border:1px solid #374151;border-radius:4px;font-size:12px;font-family:monospace;background:#111827;color:#f9fafb;box-sizing:border-box;resize:vertical"></textarea>
                <button id="tfApplyImportBtn" style="width:100%;padding:8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;margin-top:8px">Apply Imported Settings</button>
              </div>
            </div>
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

    // Export button
    doc.getElementById('tfExportBtn').onclick = () => {
      const exportArea = doc.getElementById('tfExportArea');
      const importArea = doc.getElementById('tfImportArea');
      const exportText = doc.getElementById('tfExportText');

      if (exportArea.style.display === 'none') {
        const exportData = {
          telescopeLinks: loadTelescopeLinks(),
          position: loadPosition(),
          customPosition: loadCustomPosition(),
          settings: loadSettings(),
          version: CURRENT_VERSION
        };
        exportText.value = JSON.stringify(exportData, null, 2);
        exportArea.style.display = 'block';
        importArea.style.display = 'none';
        exportText.select();
      } else {
        exportArea.style.display = 'none';
      }
    };

    // Import button
    doc.getElementById('tfImportBtn').onclick = () => {
      const importArea = doc.getElementById('tfImportArea');
      const exportArea = doc.getElementById('tfExportArea');

      if (importArea.style.display === 'none') {
        importArea.style.display = 'block';
        exportArea.style.display = 'none';
      } else {
        importArea.style.display = 'none';
      }
    };

    // Apply import button
    doc.getElementById('tfApplyImportBtn').onclick = () => {
      const importText = doc.getElementById('tfImportText');
      const jsonStr = importText.value.trim();

      if (!jsonStr) {
        alert('Please paste your exported settings JSON');
        return;
      }

      try {
        const settings = JSON.parse(jsonStr);

        if (!settings || typeof settings !== 'object') {
          throw new Error('Invalid settings format');
        }

        if (settings.telescopeLinks && Array.isArray(settings.telescopeLinks)) {
          saveTelescopeLinks(settings.telescopeLinks);
          if (settings.position) {
            savePosition(settings.position);
          }
          if (settings.customPosition) {
            saveCustomPosition(settings.customPosition.x, settings.customPosition.y);
          }
          if (settings.settings) {
            saveSettings(settings.settings);
          }
          alert('Settings imported successfully! Refreshing...');
          doc.getElementById('tfSettingsModal').remove();
          setTimeout(() => showSettings(), 100);
        } else {
          throw new Error('No telescope links found in settings');
        }
      } catch (err) {
        alert('Invalid JSON format. Please check your exported settings.\n\nError: ' + err.message);
        console.error('Import error:', err);
      }
    };

    // Persistent search tag checkbox
    const searchPersistCheckbox = doc.getElementById('tfSearchPersistEnabled');
    if (searchPersistCheckbox) {
      searchPersistCheckbox.onchange = () => {
        setSearchPersistenceEnabled(searchPersistCheckbox.checked);
        if (searchPersistCheckbox.checked) {
          const searchInput = getTelescopeSearchInput();
          if (searchInput && searchInput.value) {
            saveSearchValue(searchInput.value);
          }
        }
      };
    }

    // Clear search button in settings
    const clearSearchBtn = doc.getElementById('tfClearSearchBtn');
    if (clearSearchBtn) {
      clearSearchBtn.onclick = () => {
        clearSavedSearch();
        const searchInput = getTelescopeSearchInput();
        if (searchInput) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
    }
  }

  /**
   * Check if we're on a request detail page (has UUID in URL)
   * Returns { type: 'requests' | 'client-requests', uuid: string } or null
   */
  function getDetailPageInfo() {
    const requestMatch = window.location.pathname.match(/\/telescope\/requests\/([a-f0-9-]{36})$/i);
    if (requestMatch) return { type: 'requests', uuid: requestMatch[1] };

    const clientMatch = window.location.pathname.match(/\/telescope\/client-requests\/([a-f0-9-]{36})$/i);
    if (clientMatch) return { type: 'client-requests', uuid: clientMatch[1] };

    return null;
  }

  /**
   * Build cURL command from Telescope request data (incoming requests)
   */
  function buildCurlFromRequest(content) {
    const method = content.method;
    const host = content.headers.host;
    const proto = content.headers['x-forwarded-proto'] || 'https';
    const url = `${proto}://${host}${content.uri}`;

    let curl = `curl -X ${method} '${url}'`;

    const skipHeaders = [
      'cf-timezone', 'cf-region-code', 'cf-region', 'cf-postal-code',
      'cf-iplongitude', 'cf-iplatitude', 'cf-ipcontinent', 'cf-ipcity',
      'cf-visitor', 'cf-ipcountry', 'cf-connecting-ip', 'cdn-loop',
      'cf-ray', 'x-forwarded-for', 'x-real-ip', 'x-forwarded-proto',
      'host', 'connection', 'accept-encoding'
    ];

    for (const [key, value] of Object.entries(content.headers)) {
      if (skipHeaders.includes(key.toLowerCase())) continue;
      const escaped = value.replace(/'/g, "'\\''");
      curl += ` \\\n  -H '${key}: ${escaped}'`;
    }

    if (['POST', 'PUT', 'PATCH'].includes(method) && content.payload && Object.keys(content.payload).length > 0) {
      const contentType = content.headers['content-type'] || '';
      let body;
      if (contentType.includes('application/x-www-form-urlencoded')) {
        body = Object.entries(content.payload)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
      } else {
        body = JSON.stringify(content.payload);
      }
      curl += ` \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
    }

    return curl;
  }

  /**
   * Build cURL command from Telescope HTTP client data (outgoing requests)
   */
  function buildCurlFromHttpClient(content) {
    const method = content.method;
    const url = content.uri;

    let curl = `curl -X ${method} '${url}'`;

    if (content.headers && typeof content.headers === 'object') {
      for (const [key, value] of Object.entries(content.headers)) {
        const headerValue = Array.isArray(value) ? value.join(', ') : value;
        const escaped = String(headerValue).replace(/'/g, "'\\''");
        curl += ` \\\n  -H '${key}: ${escaped}'`;
      }
    }

    if (['POST', 'PUT', 'PATCH'].includes(method) && content.payload) {
      const contentType = content.headers && content.headers['Content-Type']
        ? (Array.isArray(content.headers['Content-Type']) ? content.headers['Content-Type'][0] : content.headers['Content-Type'])
        : '';
      let body;
      if (typeof content.payload === 'string') {
        body = content.payload;
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        body = Object.entries(content.payload)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
      } else {
        body = JSON.stringify(content.payload);
      }
      curl += ` \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
    }

    return curl;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return Promise.resolve();
    } catch (e) {
      document.body.removeChild(textarea);
      return Promise.reject(e);
    }
  }

  /**
   * Copy request as cURL command
   */
  function copyRequestAsCurl(btn) {
    const pageInfo = getDetailPageInfo();
    if (!pageInfo) {
      console.error('No request UUID found in URL');
      return;
    }

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/telescope\/(requests|client-requests).*/, '');
    const apiUrl = `${baseUrl}/telescope/telescope-api/${pageInfo.type}/${pageInfo.uuid}`;

    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        const content = data.entry.content;
        const curl = pageInfo.type === 'requests'
          ? buildCurlFromRequest(content)
          : buildCurlFromHttpClient(content);
        copyToClipboard(curl).then(() => {
          btn.textContent = '✓';
          btn.style.background = '#10b981';
        }).catch(() => {
          console.log('cURL command:\n' + curl);
          btn.textContent = '⚠';
          btn.style.background = '#f59e0b';
        });
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '#6366f1';
          btn.disabled = false;
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to fetch request details:', err);
        btn.textContent = '✕';
        btn.style.background = '#ef4444';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '#6366f1';
          btn.disabled = false;
        }, 1500);
      });
  }

  /**
   * Apply filters to table rows
   */
  function updateResultCount() {
    const counter = doc.getElementById('tfResultCount');
    if (!counter) return;
    const rows = doc.querySelectorAll('#indexScreen tbody tr:not(.dontanimate)');
    const visible = Array.from(rows).filter(r => r.style.display !== 'none').length;
    counter.textContent = `Filtered ${visible} / ${rows.length}`;
  }

  function applyFilters() {
    if (!currentPage) return;

    const config = PAGE_CONFIGS[currentPage];
    if (!config.filterFn) return;

    const rows = doc.querySelectorAll('#indexScreen tbody tr:not(.dontanimate)');
    rows.forEach(row => {
      row.style.display = config.filterFn(row, filterState) ? '' : 'none';
    });

    updateResultCount();
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
    let isCancelled = false;

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

    // Show stop button
    const stopBtn = doc.getElementById('tfStopLoadMore');
    if (stopBtn) {
      stopBtn.style.display = 'block';
      stopBtn.onclick = () => {
        isCancelled = true;
        console.log('Load more cancelled by user');
        finish();
      };
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
      if (isCancelled) {
        return;
      }

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
        console.log(`Loading... waiting for more entries to appear`);
        setTimeout(loadMore, LOAD_MORE_DELAY);
      } else {
        console.log(`Stopped after ${successCount} successful clicks. No more entries available.`);
        finish();
      }
    }

    function finish() {
      allLoadBtns.forEach(btn => btn.disabled = false);
      btnElement.textContent = originalText;
      spinnerStyle.remove();
      if (stopBtn) stopBtn.style.display = 'none';
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

    // Reset search input tracking for fresh monitoring
    lastMonitoredSearchInput = null;

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

    // Check for latest version
    checkLatestVersion();

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

        // Setup increment buttons for duration filters
        if (filter.type === 'duration') {
          doc.querySelectorAll(`.tf_${filter.id}_inc`).forEach(btn => {
            btn.onclick = () => {
              const amount = parseInt(btn.getAttribute('data-amount')) || 1000;
              const current = parseInt(input.value) || 0;
              input.value = current + amount;
            };
          });
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
      const filterConfig = config.filters.find(f => f.id === key);
      if (input && savedFilters[key]) {
        if (filterConfig && filterConfig.type === 'checkbox') {
          input.checked = savedFilters[key] === 'true';
        } else {
          input.value = savedFilters[key];
        }
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
            if (input) {
              const val = filter.type === 'checkbox' ? input.checked.toString() : input.value;
              if (val && val !== 'false') {
                currentFilters[filter.id] = val;
              }
            }
          });
          saveFilters(currentPage, currentFilters);
        }
      };
    }

    // Setup search monitoring for persistent search tag
    setupSearchMonitoring();

    // Apply button
    doc.getElementById('tfFilter').onclick = () => {
      filterState = {};
      config.filters.forEach(filter => {
        const input = inputs[filter.id];
        if (input) {
          filterState[filter.id] = filter.type === 'checkbox' ? input.checked.toString() : input.value;
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
          if (filter.type === 'checkbox') {
            input.checked = false;
          } else if (filter.type === 'select') {
            input.value = filter.options[0];
          } else {
            input.value = '';
          }
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

    // Position buttons
    doc.querySelectorAll('.tfPositionBtn').forEach(btn => {
      const position = btn.getAttribute('data-position');
      if (position === loadPosition()) {
        btn.style.background = '#3b82f6';
        btn.style.color = '#fff';
      }
      btn.onclick = () => {
        clearCustomPosition();
        savePosition(position);
        const dialog = doc.getElementById('tfDialog');

        dialog.style.top = 'auto';
        dialog.style.right = 'auto';
        dialog.style.bottom = 'auto';
        dialog.style.left = 'auto';

        if (position === 'top-right') {
          dialog.style.top = '20px';
          dialog.style.right = '20px';
        } else if (position === 'top-left') {
          dialog.style.top = '20px';
          dialog.style.left = '20px';
        } else if (position === 'bottom-right') {
          dialog.style.bottom = '20px';
          dialog.style.right = '20px';
        } else if (position === 'bottom-left') {
          dialog.style.bottom = '20px';
          dialog.style.left = '20px';
        }

        doc.querySelectorAll('.tfPositionBtn').forEach(b => {
          b.style.background = '#374151';
          b.style.color = '#9ca3af';
        });
        btn.style.background = '#3b82f6';
        btn.style.color = '#fff';
      };
    });

    // Close button
    doc.getElementById('tfClose').onclick = () => {
      if (filterInterval) clearInterval(filterInterval);
      container.remove();
    };

    // Drag functionality
    const header = doc.getElementById('tfHeader');
    const dialog = doc.getElementById('tfDialog');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.onmousedown = (e) => {
      if (e.target.id === 'tfSettingsBtn' || e.target.id === 'tfCurlBtn') return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = dialog.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      dialog.style.right = 'auto';
      dialog.style.bottom = 'auto';

      e.preventDefault();
    };

    doc.onmousemove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newLeft = startLeft + deltaX;
      const newTop = startTop + deltaY;

      const maxX = window.innerWidth - dialog.offsetWidth;
      const maxY = window.innerHeight - dialog.offsetHeight;

      const boundedLeft = Math.max(0, Math.min(newLeft, maxX));
      const boundedTop = Math.max(0, Math.min(newTop, maxY));

      dialog.style.left = boundedLeft + 'px';
      dialog.style.top = boundedTop + 'px';
    };

    doc.onmouseup = () => {
      if (isDragging) {
        isDragging = false;
        const rect = dialog.getBoundingClientRect();
        saveCustomPosition(rect.left, rect.top);
      }
    };

    // Keep dialog in bounds on window resize
    function ensureInBounds() {
      const rect = dialog.getBoundingClientRect();
      const maxX = window.innerWidth - dialog.offsetWidth;
      const maxY = window.innerHeight - dialog.offsetHeight;

      let newLeft = rect.left;
      let newTop = rect.top;
      let needsUpdate = false;

      if (rect.left < 0) {
        newLeft = 0;
        needsUpdate = true;
      } else if (rect.left > maxX) {
        newLeft = maxX;
        needsUpdate = true;
      }

      if (rect.top < 0) {
        newTop = 0;
        needsUpdate = true;
      } else if (rect.top > maxY) {
        newTop = maxY;
        needsUpdate = true;
      }

      if (needsUpdate) {
        dialog.style.left = newLeft + 'px';
        dialog.style.top = newTop + 'px';
        dialog.style.right = 'auto';
        dialog.style.bottom = 'auto';
        saveCustomPosition(newLeft, newTop);
      }
    }

    window.addEventListener('resize', ensureInBounds);
    ensureInBounds();

    // cURL button for request/http-client detail page
    function updateCurlButton() {
      const header = doc.getElementById('tfHeader');
      if (!header) return;

      let curlBtn = doc.getElementById('tfCurlBtn');
      const pageInfo = getDetailPageInfo();

      if (pageInfo && !curlBtn) {
        curlBtn = document.createElement('button');
        curlBtn.id = 'tfCurlBtn';
        curlBtn.style.cssText = 'padding:4px 10px;background:#6366f1;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;margin-right:10px';
        curlBtn.textContent = '⧉ cURL';
        curlBtn.onclick = () => copyRequestAsCurl(curlBtn);
        header.insertBefore(curlBtn, header.firstChild);
      } else if (!pageInfo && curlBtn) {
        curlBtn.remove();
      }
    }

    updateCurlButton();

    // URL change detection for SPA navigation
    let lastUrl = location.pathname;
    setInterval(() => {
      if (location.pathname !== lastUrl) {
        lastUrl = location.pathname;
        updateCurlButton();
        const newPage = detectCurrentPage();
        if (newPage !== currentPage) {
          if (filterInterval) clearInterval(filterInterval);
          container.remove();
          setTimeout(init, 100);
        } else {
          // Same page type but URL changed - restore search
          setTimeout(() => {
            setupSearchMonitoring();
            restoreSearchValue();
          }, 200);
        }
      }
      // Periodically check for search input (Telescope loads content dynamically)
      setupSearchMonitoring();
      updateResultCount();
    }, REFRESH_INTERVAL);
  }

  // Start the application
  // Check if we should redirect to Telescope
  if (!checkAndRedirect()) {
    // No redirect happened, show the dialog
    init();
  }
})();
