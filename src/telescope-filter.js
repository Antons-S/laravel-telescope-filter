(function() {
  'use strict';

  // Constants
  const doc = document;
  const REFRESH_INTERVAL = 500;
  const LOAD_MORE_COUNT = 100;
  const LOAD_MORE_DELAY = 300;

  // State
  let filterInterval = null;
  let currentPage = null;
  let filterState = {};

  // Page configurations for all 18 Telescope pages
  const PAGE_CONFIGS = {
    requests: {
      name: 'Requests',
      url: '/telescope/requests',
      filters: [
        { type: 'select', id: 'method', label: 'Method', options: ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { type: 'text', id: 'status', label: 'Status', placeholder: 'e.g. 200, 404' },
        { type: 'duration', id: 'duration', label: 'Duration (ms)', placeholder: 'e.g. 1000' },
        { type: 'text', id: 'path', label: 'Path Contains', placeholder: 'e.g. /api/v1/users' }
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

    // Pages with TODO messages (empty or disabled)
    commands: { name: 'Commands', url: '/telescope/commands', todo: true },
    schedule: { name: 'Schedule', url: '/telescope/schedule', todo: true },
    batches: { name: 'Batches', url: '/telescope/batches', todo: true },
    exceptions: { name: 'Exceptions', url: '/telescope/exceptions', todo: true },
    mail: { name: 'Mail', url: '/telescope/mail', todo: true },
    notifications: { name: 'Notifications', url: '/telescope/notifications', todo: true },
    dumps: { name: 'Dumps', url: '/telescope/dumps', todo: true }
  };

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
        <div style="margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #374151">
          <h2 id="tfActiveTab" style="margin:0;color:#3b82f6;font-size:16px;font-weight:600;text-align:center">${config.name}</h2>
        </div>

        <div id="tfContent">${contentHTML}</div>

        <button id="tfLoadMore" style="width:100%;padding:8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;margin-bottom:8px">Load More</button>
        <button id="tfClose" style="width:100%;padding:8px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;margin-bottom:12px">Close</button>

        <div style="text-align:center;padding-top:8px;border-top:1px solid #374151">
          <a href="https://github.com/Antons-S/laravel-telescope-filter" target="_blank" style="color:#9ca3af;font-size:11px;text-decoration:none">Latest version on GitHub</a>
        </div>
      </div>
    `;
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
  function handleLoadMore() {
    const autoLoadBtn = Array.from(document.querySelectorAll('button[title="Auto load entries"]'))
      .find(btn => btn.classList.contains('active'));

    if (autoLoadBtn) {
      autoLoadBtn.click();
      console.log('Disabled auto-load button');
    }

    let count = 0;
    function loadMore() {
      const btns = Array.from(document.querySelectorAll('a'))
        .filter(e => e.textContent.trim() === "Load Older Entries");
      const btn = btns[btns.length - 1];

      if (btn) {
        btn.click();
        console.log(`Clicked ${count + 1}/${LOAD_MORE_COUNT}`);
      } else {
        console.log(`Button not found, retrying... (${count + 1}/${LOAD_MORE_COUNT})`);
      }

      count++;
      if (count < LOAD_MORE_COUNT) {
        setTimeout(loadMore, LOAD_MORE_DELAY);
      } else {
        console.log('Completed 100 steps.');
      }
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
      alert('Telescope Filter: Unknown page type');
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
      doc.getElementById('tfLoadMore').onclick = handleLoadMore;
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

    // Apply button
    doc.getElementById('tfFilter').onclick = () => {
      filterState = {};
      config.filters.forEach(filter => {
        const input = inputs[filter.id];
        if (input) {
          filterState[filter.id] = input.value;
        }
      });

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

      applyFilters();
    };

    // Load More button
    doc.getElementById('tfLoadMore').onclick = handleLoadMore;

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
  init();
})();
