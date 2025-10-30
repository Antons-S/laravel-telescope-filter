(function() {
  'use strict';

  // Constants
  const doc = document;
  const methods = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const REFRESH_INTERVAL = 500;
  const LOAD_MORE_COUNT = 100;
  const LOAD_MORE_DELAY = 300;

  // State variables
  let filterInterval = null;
  let activeTab = 'requests';

  // Request filters
  let activeReqMethod = '';
  let activeReqStatus = '';
  let activeReqDuration = '';
  let activeReqUrl = '';

  // HTTP filters
  let activeHttpMethod = '';
  let activeHttpStatus = '';
  let activeHttpDuration = '';
  let activeHttpUri = '';

  // Job filters
  let activeJobName = '';
  let activeJobStatus = '';
  let activeConnection = '';
  let activeQueue = '';

  /**
   * Generate HTML for the filter dialog
   */
  function generateDialogHTML() {
    let html = `
      <div id="tfDialog" style="position:fixed;top:20px;right:20px;background:#1f2937;padding:20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:10000;width:280px;font-family:sans-serif;border:1px solid #374151">
        <!-- Tab Navigation -->
        <div style="display:flex;gap:8px;margin-bottom:15px;border-bottom:2px solid #374151">
          <button id="tfTabReq" style="flex:1;padding:8px;background:transparent;color:#3b82f6;border:none;border-bottom:2px solid #3b82f6;cursor:pointer;font-weight:600;font-size:14px">Requests</button>
          <button id="tfTabHttp" style="flex:1;padding:8px;background:transparent;color:#9ca3af;border:none;border-bottom:2px solid transparent;cursor:pointer;font-weight:600;font-size:14px">HTTP</button>
          <button id="tfTabJobs" style="flex:1;padding:8px;background:transparent;color:#9ca3af;border:none;border-bottom:2px solid transparent;cursor:pointer;font-weight:600;font-size:14px">Jobs</button>
        </div>

        <!-- Requests Panel -->
        <div id="tfReqPanel">
          <h3 style="margin:0 0 15px;color:#f9fafb;font-size:16px">Filter Requests</h3>

          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Method:</label>
            <select id="tfMethod" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;background:#111827;color:#f9fafb">
              ${methods.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>

          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Status:</label>
            <input type="text" id="tfStatus" placeholder="e.g. 200, 404" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
          </div>

          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Duration (ms):</label>
            <div style="display:flex;gap:8px">
              <input type="text" id="tfDuration" placeholder="e.g. 1000" style="flex:1;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
              <button id="tfSlow" style="padding:8px 12px;background:#f59e0b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">+1sec</button>
            </div>
          </div>

          <div style="margin-bottom:15px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">URL Contains:</label>
            <input type="text" id="tfUrl" placeholder="e.g. /api/v1/users" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
          </div>
        </div>

        <!-- HTTP Panel -->
        <div id="tfHttpPanel" style="display:none">
          <h3 style="margin:0 0 15px;color:#f9fafb;font-size:16px">Filter HTTP</h3>

          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Method:</label>
            <select id="tfHttpMethod" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;background:#111827;color:#f9fafb">
              ${methods.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>

          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Status:</label>
            <input type="text" id="tfHttpStatus" placeholder="e.g. 200, 404" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
          </div>

          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Duration (ms):</label>
            <div style="display:flex;gap:8px">
              <input type="text" id="tfHttpDuration" placeholder="e.g. 1000" style="flex:1;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
              <button id="tfHttpSlow" style="padding:8px 12px;background:#f59e0b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">+1sec</button>
            </div>
          </div>

          <div style="margin-bottom:15px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">URI Contains:</label>
            <input type="text" id="tfHttpUri" placeholder="e.g. api/models" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
          </div>
        </div>

        <!-- Jobs Panel -->
        <div id="tfJobsPanel" style="display:none">
          <h3 style="margin:0 0 15px;color:#f9fafb;font-size:16px">Filter Jobs</h3>

          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Job Name:</label>
            <input type="text" id="tfJobName" placeholder="e.g. PipedriveUserSyncListener" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
          </div>

          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Status:</label>
            <input type="text" id="tfJobStatus" placeholder="e.g. pending, completed" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
          </div>

          <div style="margin-bottom:12px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Connection:</label>
            <input type="text" id="tfConnection" placeholder="e.g. redis" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
          </div>

          <div style="margin-bottom:15px">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#9ca3af;font-size:13px">Queue:</label>
            <input type="text" id="tfQueue" placeholder="e.g. queues:default" style="width:100%;padding:8px;border:1px solid #374151;border-radius:4px;font-size:13px;box-sizing:border-box;background:#111827;color:#f9fafb">
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button id="tfFilter" style="flex:1;padding:8px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">Apply</button>
          <button id="tfReset" style="flex:1;padding:8px;background:#6b7280;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px">Reset</button>
        </div>

        <button id="tfLoadMore" style="width:100%;padding:8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;margin-bottom:8px">Load More</button>
        <button id="tfClose" style="width:100%;padding:8px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;margin-bottom:12px">Close</button>

        <!-- Version Link -->
        <div style="text-align:center;padding-top:8px;border-top:1px solid #374151">
          <a href="https://github.com/Antons-S/laravel-telescope-filter" target="_blank" style="color:#9ca3af;font-size:11px;text-decoration:none">You can find latest version here</a>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Detect which tab should be active based on current URL
   */
  function detectTabFromUrl() {
    const url = window.location.pathname;
    if (url.includes('/telescope/client-requests')) return 'http';
    if (url.includes('/telescope/jobs')) return 'jobs';
    return 'requests';
  }

  /**
   * Switch between tabs
   */
  function switchTab(tab) {
    activeTab = tab;

    const reqPanel = doc.getElementById('tfReqPanel');
    const httpPanel = doc.getElementById('tfHttpPanel');
    const jobsPanel = doc.getElementById('tfJobsPanel');
    const tabReq = doc.getElementById('tfTabReq');
    const tabHttp = doc.getElementById('tfTabHttp');
    const tabJobs = doc.getElementById('tfTabJobs');

    if (tab === 'requests') {
      reqPanel.style.display = 'block';
      httpPanel.style.display = 'none';
      jobsPanel.style.display = 'none';
      tabReq.style.color = '#3b82f6';
      tabReq.style.borderBottomColor = '#3b82f6';
      tabHttp.style.color = '#9ca3af';
      tabHttp.style.borderBottomColor = 'transparent';
      tabJobs.style.color = '#9ca3af';
      tabJobs.style.borderBottomColor = 'transparent';
    } else if (tab === 'http') {
      reqPanel.style.display = 'none';
      httpPanel.style.display = 'block';
      jobsPanel.style.display = 'none';
      tabReq.style.color = '#9ca3af';
      tabReq.style.borderBottomColor = 'transparent';
      tabHttp.style.color = '#3b82f6';
      tabHttp.style.borderBottomColor = '#3b82f6';
      tabJobs.style.color = '#9ca3af';
      tabJobs.style.borderBottomColor = 'transparent';
    } else {
      reqPanel.style.display = 'none';
      httpPanel.style.display = 'none';
      jobsPanel.style.display = 'block';
      tabReq.style.color = '#9ca3af';
      tabReq.style.borderBottomColor = 'transparent';
      tabHttp.style.color = '#9ca3af';
      tabHttp.style.borderBottomColor = 'transparent';
      tabJobs.style.color = '#3b82f6';
      tabJobs.style.borderBottomColor = '#3b82f6';
    }
  }

  /**
   * Filter Requests table rows
   */
  function filterRequests() {
    const rows = doc.querySelectorAll('#indexScreen tbody tr:not(.dontanimate)');

    rows.forEach(row => {
      const methodBadge = row.querySelector('.badge');
      const statusBadge = row.querySelectorAll('td')[2]?.querySelector('.badge');
      const durationText = row.querySelectorAll('td')[3]?.querySelector('span');
      const pathTd = row.querySelectorAll('td')[1];

      if (!methodBadge || !pathTd || !statusBadge || !durationText) return;

      const method = methodBadge.textContent.trim();
      const status = statusBadge.textContent.trim();
      const duration = durationText.textContent.trim();
      const path = pathTd.getAttribute('title') || pathTd.textContent.trim();
      const durationValue = parseInt(duration.replace('ms', ''));

      const methodMatch = (activeReqMethod === 'ALL' || !activeReqMethod || method === activeReqMethod);
      const statusMatch = !activeReqStatus || status.includes(activeReqStatus);
      const durationMatch = !activeReqDuration || durationValue >= parseInt(activeReqDuration);
      const pathMatch = !activeReqUrl || path.toLowerCase().includes(activeReqUrl.toLowerCase());

      row.style.display = (methodMatch && statusMatch && durationMatch && pathMatch) ? '' : 'none';
    });
  }

  /**
   * Filter HTTP Client table rows
   */
  function filterHttp() {
    const rows = doc.querySelectorAll('#indexScreen tbody tr:not(.dontanimate)');

    rows.forEach(row => {
      const methodBadge = row.querySelector('.badge');
      const statusBadge = row.querySelectorAll('td')[2]?.querySelector('.badge');
      const durationText = row.querySelectorAll('td')[3]?.querySelector('span');
      const uriTd = row.querySelectorAll('td')[1];

      if (!methodBadge || !uriTd || !statusBadge) return;

      const method = methodBadge.textContent.trim();
      const status = statusBadge.textContent.trim();
      const uri = uriTd.getAttribute('title') || uriTd.textContent.trim();
      const duration = durationText ? durationText.textContent.trim() : '0ms';
      const durationValue = parseInt(duration.replace('ms', '')) || 0;

      const methodMatch = (activeHttpMethod === 'ALL' || !activeHttpMethod || method === activeHttpMethod);
      const statusMatch = !activeHttpStatus || status.includes(activeHttpStatus);
      const durationMatch = !activeHttpDuration || durationValue >= parseInt(activeHttpDuration);
      const uriMatch = !activeHttpUri || uri.toLowerCase().includes(activeHttpUri.toLowerCase());

      row.style.display = (methodMatch && statusMatch && durationMatch && uriMatch) ? '' : 'none';
    });
  }

  /**
   * Filter Jobs table rows
   */
  function filterJobs() {
    const rows = doc.querySelectorAll('#indexScreen tbody tr:not(.dontanimate)');

    rows.forEach(row => {
      const jobTitle = row.querySelector('td span[title]');
      const statusBadge = row.querySelectorAll('td')[1]?.querySelector('.badge');
      const metaSmall = row.querySelector('td small.text-muted');

      if (!jobTitle || !metaSmall || !statusBadge) return;

      const job = jobTitle.getAttribute('title') || jobTitle.textContent.trim();
      const status = statusBadge.textContent.trim();
      const meta = metaSmall.textContent.trim();

      const jobMatch = !activeJobName || job.toLowerCase().includes(activeJobName.toLowerCase());
      const statusMatch = !activeJobStatus || status.toLowerCase().includes(activeJobStatus.toLowerCase());
      const connectionMatch = !activeConnection || meta.toLowerCase().includes(activeConnection.toLowerCase());
      const queueMatch = !activeQueue || meta.toLowerCase().includes(activeQueue.toLowerCase());

      row.style.display = (jobMatch && statusMatch && connectionMatch && queueMatch) ? '' : 'none';
    });
  }

  /**
   * Apply filters based on active tab
   */
  function applyFilter() {
    if (activeTab === 'requests') {
      filterRequests();
    } else if (activeTab === 'http') {
      filterHttp();
    } else {
      filterJobs();
    }
  }

  /**
   * Handle Load More button click
   * Disables auto-load and clicks "Load Older Entries" button multiple times
   */
  function handleLoadMore() {
    // Disable auto-load if it's active
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
        console.log(`Button not found, retrying... (${count + 1}/${LOAD_MORE_COUNT}`);
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
    // Create dialog container
    const container = doc.createElement('div');
    container.innerHTML = generateDialogHTML();
    doc.body.appendChild(container);

    // Get element references
    const dialog = doc.getElementById('tfDialog');
    const tabReq = doc.getElementById('tfTabReq');
    const tabHttp = doc.getElementById('tfTabHttp');
    const tabJobs = doc.getElementById('tfTabJobs');

    // Request filter inputs
    const methodSelect = doc.getElementById('tfMethod');
    const statusInput = doc.getElementById('tfStatus');
    const durationInput = doc.getElementById('tfDuration');
    const slowButton = doc.getElementById('tfSlow');
    const urlInput = doc.getElementById('tfUrl');

    // HTTP filter inputs
    const httpMethodSelect = doc.getElementById('tfHttpMethod');
    const httpStatusInput = doc.getElementById('tfHttpStatus');
    const httpDurationInput = doc.getElementById('tfHttpDuration');
    const httpSlowButton = doc.getElementById('tfHttpSlow');
    const httpUriInput = doc.getElementById('tfHttpUri');

    // Job filter inputs
    const jobNameInput = doc.getElementById('tfJobName');
    const jobStatusInput = doc.getElementById('tfJobStatus');
    const connectionInput = doc.getElementById('tfConnection');
    const queueInput = doc.getElementById('tfQueue');

    // Action buttons
    const filterButton = doc.getElementById('tfFilter');
    const resetButton = doc.getElementById('tfReset');
    const loadMoreButton = doc.getElementById('tfLoadMore');
    const closeButton = doc.getElementById('tfClose');

    // Set up URL change detection
    let lastUrl = location.pathname;
    const checkUrlChange = () => {
      if (location.pathname !== lastUrl) {
        lastUrl = location.pathname;
        const newTab = detectTabFromUrl();
        if (newTab !== activeTab) {
          switchTab(newTab);
          if (filterInterval) {
            clearInterval(filterInterval);
            filterInterval = null;
          }
        }
      }
    };
    setInterval(checkUrlChange, REFRESH_INTERVAL);

    // Initialize tab based on URL
    switchTab(detectTabFromUrl());

    // Tab switching handlers
    tabReq.onclick = () => switchTab('requests');
    tabHttp.onclick = () => switchTab('http');
    tabJobs.onclick = () => switchTab('jobs');

    // +1sec button handlers
    slowButton.onclick = () => {
      const current = parseInt(durationInput.value) || 0;
      durationInput.value = current + 1000;
    };

    httpSlowButton.onclick = () => {
      const current = parseInt(httpDurationInput.value) || 0;
      httpDurationInput.value = current + 1000;
    };

    // Filter button handler
    filterButton.onclick = () => {
      if (activeTab === 'requests') {
        activeReqMethod = methodSelect.value;
        activeReqStatus = statusInput.value;
        activeReqDuration = durationInput.value;
        activeReqUrl = urlInput.value;
      } else if (activeTab === 'http') {
        activeHttpMethod = httpMethodSelect.value;
        activeHttpStatus = httpStatusInput.value;
        activeHttpDuration = httpDurationInput.value;
        activeHttpUri = httpUriInput.value;
      } else {
        activeJobName = jobNameInput.value;
        activeJobStatus = jobStatusInput.value;
        activeConnection = connectionInput.value;
        activeQueue = queueInput.value;
      }

      if (filterInterval) clearInterval(filterInterval);
      filterInterval = setInterval(applyFilter, REFRESH_INTERVAL);
      applyFilter();
    };

    // Reset button handler
    resetButton.onclick = () => {
      if (filterInterval) clearInterval(filterInterval);
      filterInterval = null;

      if (activeTab === 'requests') {
        methodSelect.value = 'ALL';
        statusInput.value = '';
        durationInput.value = '';
        urlInput.value = '';
        activeReqMethod = '';
        activeReqStatus = '';
        activeReqDuration = '';
        activeReqUrl = '';
      } else if (activeTab === 'http') {
        httpMethodSelect.value = 'ALL';
        httpStatusInput.value = '';
        httpDurationInput.value = '';
        httpUriInput.value = '';
        activeHttpMethod = '';
        activeHttpStatus = '';
        activeHttpDuration = '';
        activeHttpUri = '';
      } else {
        jobNameInput.value = '';
        jobStatusInput.value = '';
        connectionInput.value = '';
        queueInput.value = '';
        activeJobName = '';
        activeJobStatus = '';
        activeConnection = '';
        activeQueue = '';
      }

      applyFilter();
    };

    // Load More button handler
    loadMoreButton.onclick = handleLoadMore;

    // Close button handler
    closeButton.onclick = () => {
      if (filterInterval) clearInterval(filterInterval);
      container.remove();
    };

    // Enter key handlers for all inputs
    const inputs = [
      urlInput, statusInput, durationInput,
      httpUriInput, httpStatusInput, httpDurationInput,
      jobNameInput, jobStatusInput, connectionInput, queueInput
    ];

    inputs.forEach(input => {
      input.onkeypress = (e) => {
        if (e.key === 'Enter') filterButton.click();
      };
    });
  }

  // Start the application
  init();
})();
