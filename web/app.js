const state = {
  view: 'overview',
  resultTab: 'table',
  databases: [],
  overview: null,
  schema: null,
  schemaDetails: null,
  graph: { nodes: [], edges: [] },
  exploreResult: null,
  queryResult: null,
  tutorialsData: null,
  tutorials: [],
  tutorialTopics: [],
  tutorialSearch: '',
  tutorialTopicFilter: 'all',
  selectedTutorialId: null,
  tutorialBusy: null,
  practiceResult: null,
  practiceError: null,
  practiceTab: 'table',
  logs: [],
  selectedSchema: null,
  selectedId: null,
  graphViews: {},
  serviceErrors: {},
};

const views = {
  overview: 'Overview',
  databases: 'Databases',
  schema: 'Schema',
  query: 'Query',
  learn: 'Learn & Practice',
  explore: 'Explore Graph',
  import: 'Import Data',
  logs: 'Jobs / Logs',
  settings: 'Settings',
};

const nodeOrder = ['Document', 'Chunk', 'Entity', 'Topic'];
const savedQueryKey = 'kuzu-console-saved-queries';
const defaultTutorialTopics = [
  'Getting Started',
  'Data Import',
  'Cypher Basics',
  'Graph Modeling',
  'Network Analysis',
  'Python',
  'JavaScript / Node.js',
  'Marimo / Notebook',
  'Advanced Queries',
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  toast: $('#toast'),
  loginView: $('#loginView'),
  appView: $('#appView'),
  loginForm: $('#loginForm'),
  logoutButton: $('#logoutButton'),
  refreshButton: $('#refreshButton'),
  globalSearch: $('#globalSearch'),
  searchResults: $('#searchResults'),
  viewTitle: $('#viewTitle'),
  sidebarDatabase: $('#sidebarDatabase'),
  databaseStatusBadge: $('#databaseStatusBadge'),
  overviewKpiGrid: $('#overviewKpiGrid'),
  overviewInstanceStatus: $('#overviewInstanceStatus'),
  overviewInstance: $('#overviewInstance'),
  activityPreview: $('#activityPreview'),
  topicTable: $('#topicTable'),
  topicCount: $('#topicCount'),
  databaseCards: $('#databaseCards'),
  schemaKpiGrid: $('#schemaKpiGrid'),
  schemaTableCount: $('#schemaTableCount'),
  schemaTableList: $('#schemaTableList'),
  schemaDetailTitle: $('#schemaDetailTitle'),
  schemaDetailType: $('#schemaDetailType'),
  schemaDetails: $('#schemaDetails'),
  schemaQueries: $('#schemaQueries'),
  cypherInput: $('#cypherInput'),
  runCypherButton: $('#runCypherButton'),
  formatCypherButton: $('#formatCypherButton'),
  saveQueryButton: $('#saveQueryButton'),
  stopQueryButton: $('#stopQueryButton'),
  queryMeta: $('#queryMeta'),
  cypherResults: $('#cypherResults'),
  queryGraphSvg: $('#queryGraphSvg'),
  jsonResults: $('#jsonResults'),
  rawResults: $('#rawResults'),
  queryHistoryList: $('#queryHistoryList'),
  savedQueriesList: $('#savedQueriesList'),
  learnProgress: $('#learnProgress'),
  tutorialSearch: $('#tutorialSearch'),
  tutorialTopicFilter: $('#tutorialTopicFilter'),
  tutorialCount: $('#tutorialCount'),
  tutorialCatalog: $('#tutorialCatalog'),
  tutorialDifficulty: $('#tutorialDifficulty'),
  tutorialDetail: $('#tutorialDetail'),
  practiceStatus: $('#practiceStatus'),
  practiceSteps: $('#practiceSteps'),
  practiceQueries: $('#practiceQueries'),
  practiceQueryInput: $('#practiceQueryInput'),
  copyPracticeQueryButton: $('#copyPracticeQueryButton'),
  resetPracticeButton: $('#resetPracticeButton'),
  loadPracticeDataButton: $('#loadPracticeDataButton'),
  runPracticeQueryButton: $('#runPracticeQueryButton'),
  practiceMeta: $('#practiceMeta'),
  practiceResults: $('#practiceResults'),
  practiceGraphSvg: $('#practiceGraphSvg'),
  practiceJsonResults: $('#practiceJsonResults'),
  practiceLogs: $('#practiceLogs'),
  tutorialDataManager: $('#tutorialDataManager'),
  exploreTable: $('#exploreTable'),
  exploreDepth: $('#exploreDepth'),
  exploreLimit: $('#exploreLimit'),
  runExploreButton: $('#runExploreButton'),
  fitGraphButton: $('#fitGraphButton'),
  resetGraphButton: $('#resetGraphButton'),
  exploreMeta: $('#exploreMeta'),
  exploreWarning: $('#exploreWarning'),
  exploreGraphSvg: $('#exploreGraphSvg'),
  selectionDetails: $('#selectionDetails'),
  importForm: $('#importForm'),
  suggestButton: $('#suggestButton'),
  previewImportButton: $('#previewImportButton'),
  importPreview: $('#importPreview'),
  logsTable: $('#logsTable'),
  clearLogsButton: $('#clearLogsButton'),
  settingsStatus: $('#settingsStatus'),
  settingsContent: $('#settingsContent'),
  answerCount: $('#answerCount'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncate(value, length = 100) {
  const text = String(value ?? '');
  return text.length <= length ? text : `${text.slice(0, length - 1)}...`;
}

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => elements.toast.classList.remove('visible'), 3400);
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/session') {
      showLogin();
    }
    throw new Error(data.error || `Request failed with ${response.status}`);
  }
  return data;
}

function messageFromError(error) {
  return error instanceof Error ? error.message : String(error);
}

function serviceErrorMessage(name, error) {
  const message = messageFromError(error);
  if (name === 'tutorials' && /API route not found|404/i.test(message)) {
    return 'Tutorial API route is missing on the running backend. Restart the Kuzu Graph Console server after rebuilding so /api/tutorials is available.';
  }
  return message;
}

async function loadService(name, request, fallback) {
  try {
    const data = await request;
    delete state.serviceErrors[name];
    return data;
  } catch (error) {
    state.serviceErrors[name] = serviceErrorMessage(name, error);
    return fallback;
  }
}

function statusClass(status) {
  if (status === 'connected' || status === 'success' || status === 'ok') {
    return 'success';
  }
  if (status === 'error') {
    return 'danger';
  }
  return 'neutral';
}

function setStatusBadge(element, label, status) {
  element.className = `status-chip ${statusClass(status)}`;
  element.textContent = label;
}

function showLogin() {
  elements.loginView.hidden = false;
  elements.appView.hidden = true;
}

function showApp() {
  elements.loginView.hidden = true;
  elements.appView.hidden = false;
}

async function boot() {
  try {
    const session = await api('/api/session');
    if (session.authenticated) {
      showApp();
      await refreshAll();
      return;
    }
  } catch {
    // Login is the fallback state.
  }
  showLogin();
}

async function refreshAll() {
  const [overview, databases, schemaDetails, graph, logs, tutorials] = await Promise.all([
    loadService('overview', api('/api/overview'), state.overview ?? { nodeCounts: {}, relationshipCounts: {}, topicCoverage: [] }),
    loadService('databases', api('/api/databases'), { databases: state.databases }),
    loadService(
      'schema',
      api('/api/schema-details'),
      state.schemaDetails ?? { nodeTables: [], relationshipTables: [], summary: { nodeTableCount: 0, relationshipTableCount: 0, propertyCount: 0 }, generatedQueries: [] },
    ),
    loadService('graph', api('/api/graph?limit=500'), state.graph),
    loadService('logs', api('/api/logs'), { logs: state.logs }),
    loadService('tutorials', api('/api/tutorials'), state.tutorialsData ?? { tutorials: [], topics: [], progress: {} }),
  ]);

  state.overview = overview;
  state.databases = databases.databases ?? [];
  state.schemaDetails = schemaDetails;
  state.graph = normalizeGraph(graph);
  state.logs = logs.logs ?? [];
  state.tutorialsData = tutorials;
  state.tutorials = tutorials.tutorials ?? [];
  state.tutorialTopics = tutorials.topics?.length ? tutorials.topics : defaultTutorialTopics;
  state.selectedTutorialId ??= state.tutorials[0]?.id ?? null;
  state.selectedSchema ??= firstSchemaTable()?.key ?? null;

  renderAll();

  const failedServices = Object.keys(state.serviceErrors);
  if (failedServices.length > 0) {
    toast(`Some services did not load: ${failedServices.join(', ')}`);
  }
}

function renderAll() {
  renderHeader();
  renderOverview();
  renderDatabases();
  renderSchema();
  renderExplore();
  renderQueryResult();
  renderQueryLists();
  renderLearn();
  renderLogs();
  renderSettings();
}

function activeDatabase() {
  return state.databases[0] ?? null;
}

function renderHeader() {
  const database = activeDatabase();
  elements.sidebarDatabase.textContent = database?.name ?? 'No database';
  setStatusBadge(elements.databaseStatusBadge, database?.status ?? 'Disconnected', database?.status ?? 'neutral');
}

function switchView(view) {
  state.view = view;
  elements.viewTitle.textContent = views[view];
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  $$('.view-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `${view}Panel`));

  if (view === 'explore') {
    renderExplore();
  }
  if (view === 'learn') {
    renderLearn();
  }
  if (view === 'logs') {
    loadLogs().catch((error) => toast(error.message));
  }
}

function renderOverview() {
  const overview = state.overview ?? {};
  const database = activeDatabase();
  const nodeCounts = overview.nodeCounts ?? {};
  const relCounts = overview.relationshipCounts ?? {};
  const totalNodes = Object.values(nodeCounts).reduce((sum, value) => sum + Number(value ?? 0), 0);
  const totalRels = Object.values(relCounts).reduce((sum, value) => sum + Number(value ?? 0), 0);
  const kpis = [
    ['Database status', database?.status ?? 'Disconnected'],
    ['Node records', totalNodes],
    ['Relationship records', totalRels],
    ['Tables', `${database?.nodeTableCount ?? 0} node / ${database?.relationshipTableCount ?? 0} rel`],
  ];

  elements.overviewKpiGrid.innerHTML = kpis
    .map(([label, value]) => `<article class="kpi-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join('');

  setStatusBadge(elements.overviewInstanceStatus, database?.status ?? 'Disconnected', database?.status ?? 'neutral');
  elements.overviewInstance.innerHTML = database
    ? `
      <div class="details-row"><span>Name</span><strong>${escapeHtml(database.name)}</strong></div>
      <div class="details-row"><span>Storage</span><strong>${escapeHtml(database.storage)}</strong></div>
      <div class="details-row"><span>Mode</span><strong>${escapeHtml(database.mode)}</strong></div>
      <div class="details-row"><span>Last opened</span><strong>${escapeHtml(formatDate(database.lastOpenedAt))}</strong></div>
      <div class="button-row left">
        <button class="ghost-action" type="button" data-database-action="open">Open</button>
        <button class="ghost-action" type="button" data-view-link="query">Query</button>
        <button class="ghost-action" type="button" data-view-link="explore">Explore</button>
      </div>
    `
    : '<p class="empty-state">No configured database.</p>';

  const topics = overview.topicCoverage ?? [];
  elements.topicCount.textContent = `${topics.length} rows`;
  renderTable(
    elements.topicTable,
    topics.map((row) => ({
      topic: row.name,
      document: row.documentTitle,
      weight: row.weight,
      description: row.description,
    })),
  );

  elements.activityPreview.innerHTML =
    state.serviceErrors.overview
      ? `<p class="warning-text">Overview service failed: ${escapeHtml(state.serviceErrors.overview)}</p>`
      : state.logs.length === 0
      ? '<p class="empty-state">No activity yet.</p>'
      : state.logs
          .slice(0, 5)
          .map(
            (log) => `
              <article class="activity-item">
                <span class="status-dot ${statusClass(log.status)}"></span>
                <div>
                  <strong>${escapeHtml(log.label)}</strong>
                  <p>${escapeHtml(formatDate(log.createdAt))} · ${escapeHtml(log.durationMs)} ms</p>
                </div>
              </article>
            `,
          )
          .join('');
}

function renderDatabases() {
  elements.databaseCards.innerHTML =
    state.serviceErrors.databases && state.databases.length === 0
      ? `<p class="warning-text">Database service failed: ${escapeHtml(state.serviceErrors.databases)}</p>`
      : state.databases.length === 0
      ? '<p class="empty-state">No configured database.</p>'
      : state.databases
          .map(
            (database) => `
              <article class="database-card">
                <div class="database-card-header">
                  <div>
                    <h3>${escapeHtml(database.name)}</h3>
                    <p>${escapeHtml(database.storage)}</p>
                  </div>
                  <span class="status-chip ${statusClass(database.status)}">${escapeHtml(database.status)}</span>
                </div>
                <div class="database-stats">
                  <span><strong>${escapeHtml(database.nodeTableCount)}</strong> node tables</span>
                  <span><strong>${escapeHtml(database.relationshipTableCount)}</strong> relationship tables</span>
                  <span><strong>${escapeHtml(database.mode)}</strong> mode</span>
                  <span><strong>${escapeHtml(formatDate(database.lastOpenedAt))}</strong> opened</span>
                </div>
                <div class="button-row left">
                  <button class="primary-action" type="button" data-database-action="open">Open</button>
                  <button class="ghost-action" type="button" data-view-link="query">Query</button>
                  <button class="ghost-action" type="button" data-view-link="explore">Explore</button>
                  <button class="ghost-action" type="button" data-view-link="schema">View schema</button>
                  <button class="ghost-action" type="button" data-database-action="disconnect">Disconnect</button>
                </div>
              </article>
            `,
          )
          .join('');
}

function firstSchemaTable() {
  const details = state.schemaDetails;
  const node = details?.nodeTables?.[0];
  if (node) {
    return { key: `node:${node.name}`, type: 'node', table: node };
  }
  const relationship = details?.relationshipTables?.[0];
  return relationship ? { key: `relationship:${relationship.name}`, type: 'relationship', table: relationship } : null;
}

function schemaTables() {
  const details = state.schemaDetails ?? {};
  return [
    ...(details.nodeTables ?? []).map((table) => ({ key: `node:${table.name}`, type: 'node', table })),
    ...(details.relationshipTables ?? []).map((table) => ({ key: `relationship:${table.name}`, type: 'relationship', table })),
  ];
}

function renderSchema() {
  const details = state.schemaDetails;
  if (state.serviceErrors.schema && (!details || schemaTables().length === 0)) {
    elements.schemaKpiGrid.innerHTML = '';
    elements.schemaTableCount.textContent = 'Unavailable';
    elements.schemaTableList.innerHTML = `<p class="warning-text">Schema service failed: ${escapeHtml(state.serviceErrors.schema)}</p>`;
    elements.schemaDetailTitle.textContent = 'Table Details';
    elements.schemaDetailType.textContent = 'Unavailable';
    elements.schemaDetails.innerHTML = '<p class="empty-state">Schema details are unavailable.</p>';
    elements.schemaQueries.innerHTML = '';
    return;
  }

  if (!details) {
    elements.schemaDetails.innerHTML = '<p class="empty-state">Schema has not loaded.</p>';
    return;
  }

  const summary = details.summary ?? {};
  const kpis = [
    ['Node tables', summary.nodeTableCount ?? 0],
    ['Relationship tables', summary.relationshipTableCount ?? 0],
    ['Properties', summary.propertyCount ?? 0],
  ];
  elements.schemaKpiGrid.innerHTML = kpis
    .map(([label, value]) => `<article class="kpi-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join('');

  const tables = schemaTables();
  elements.schemaTableCount.textContent = `${tables.length} tables`;
  elements.schemaTableList.innerHTML = tables
    .map(
      (item) => `
        <button class="schema-table-button ${state.selectedSchema === item.key ? 'active' : ''}" type="button" data-schema-key="${escapeHtml(item.key)}">
          <strong>${escapeHtml(item.table.name)}</strong>
          <span>${escapeHtml(item.type === 'node' ? 'Node table' : `${item.table.from} -> ${item.table.to}`)}</span>
        </button>
      `,
    )
    .join('');

  const selected = tables.find((item) => item.key === state.selectedSchema) ?? firstSchemaTable();
  if (!selected) {
    return;
  }

  state.selectedSchema = selected.key;
  elements.schemaDetailTitle.textContent = selected.table.name;
  elements.schemaDetailType.textContent = selected.type === 'node' ? 'Node table' : `${selected.table.from} -> ${selected.table.to}`;
  elements.schemaDetails.innerHTML = `
    <p class="schema-description">${escapeHtml(selected.table.description)}</p>
    <div class="data-table">
      <table>
        <thead>
          <tr><th>Property</th><th>Type</th><th>Key</th></tr>
        </thead>
        <tbody>
          ${(selected.table.properties ?? [])
            .map(
              (property) => `
                <tr>
                  <td>${escapeHtml(property.name)}</td>
                  <td>${escapeHtml(property.type)}</td>
                  <td>${property.primaryKey ? 'Primary' : ''}</td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  const queries = selected.table.sampleQueries ?? details.generatedQueries ?? [];
  elements.schemaQueries.innerHTML = queries
    .map(
      (query) => `
        <article class="query-snippet">
          <code>${escapeHtml(query)}</code>
          <button class="ghost-action" type="button" data-use-query="${escapeHtml(query)}">Use</button>
        </article>
      `,
    )
    .join('');

  if (elements.exploreTable.options.length === 0) {
    elements.exploreTable.innerHTML = (details.nodeTables ?? []).map((table) => `<option value="${escapeHtml(table.name)}">${escapeHtml(table.name)}</option>`).join('');
  }
}

function renderQueryLists() {
  const queryLogs = state.logs.filter((log) => log.kind === 'query');
  elements.queryHistoryList.innerHTML =
    queryLogs.length === 0
      ? '<p class="empty-state tight">No query history.</p>'
      : queryLogs
          .slice(0, 8)
          .map(
            (log) => `
              <button class="history-item" type="button" data-use-query="${escapeHtml(log.query ?? '')}">
                <strong>${escapeHtml(log.status)} · ${escapeHtml(log.rowCount ?? 0)} rows</strong>
                <span>${escapeHtml(truncate(log.query ?? '', 80))}</span>
              </button>
            `,
          )
          .join('');

  const saved = getSavedQueries();
  elements.savedQueriesList.innerHTML =
    saved.length === 0
      ? '<p class="empty-state tight">No saved queries.</p>'
      : saved
          .map(
            (query) => `
              <button class="history-item" type="button" data-use-query="${escapeHtml(query)}">
                <strong>Saved query</strong>
                <span>${escapeHtml(truncate(query, 80))}</span>
              </button>
            `,
          )
          .join('');
}

function renderQueryResult() {
  const result = state.queryResult;
  $$('.tab-button').forEach((button) => button.classList.toggle('active', button.dataset.resultTab === state.resultTab));
  $$('.result-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `${state.resultTab}ResultPanel`));

  if (!result) {
    elements.queryMeta.textContent = 'No query run';
    elements.cypherResults.innerHTML = '<p class="empty-state">Run a query to see rows.</p>';
    elements.jsonResults.textContent = '';
    elements.rawResults.textContent = '';
    renderGraphCanvas(elements.queryGraphSvg, { nodes: [], edges: [] }, { detailMode: 'toast' });
    return;
  }

  elements.queryMeta.textContent = `${result.rowCount ?? 0} rows · ${result.executionMs ?? 0} ms`;
  renderTable(elements.cypherResults, result.rows ?? []);
  elements.jsonResults.textContent = JSON.stringify(result.rows ?? [], null, 2);
  elements.rawResults.textContent = JSON.stringify(result, null, 2);
  renderGraphCanvas(elements.queryGraphSvg, normalizeGraph(result.graph ?? { nodes: [], edges: [] }), { detailMode: 'toast' });
}

function renderExplore() {
  if (state.serviceErrors.graph && state.graph.nodes.length === 0 && !state.exploreResult) {
    elements.exploreMeta.textContent = 'Unavailable';
    elements.exploreWarning.hidden = false;
    elements.exploreWarning.textContent = `Graph service failed: ${state.serviceErrors.graph}`;
    renderGraphCanvas(elements.exploreGraphSvg, { nodes: [], edges: [] }, { detailMode: 'panel' });
    return;
  }

  if (elements.exploreTable.options.length === 0 && state.schemaDetails?.nodeTables) {
    elements.exploreTable.innerHTML = state.schemaDetails.nodeTables.map((table) => `<option value="${escapeHtml(table.name)}">${escapeHtml(table.name)}</option>`).join('');
  }

  const graph = normalizeGraph(state.exploreResult ?? state.graph);
  const counts = state.exploreResult?.counts ?? graph.counts ?? { nodes: graph.nodes.length, edges: graph.edges.length };
  elements.exploreMeta.textContent = `${counts.nodes ?? graph.nodes.length} nodes · ${counts.edges ?? graph.edges.length} edges`;
  elements.exploreWarning.hidden = !state.exploreResult?.warning;
  elements.exploreWarning.textContent = state.exploreResult?.warning ?? '';
  renderGraphCanvas(elements.exploreGraphSvg, graph, { detailMode: 'panel' });
}

function renderLogs() {
  renderQueryLists();
  if (state.serviceErrors.logs && state.logs.length === 0) {
    elements.logsTable.innerHTML = `<p class="warning-text">Logs service failed: ${escapeHtml(state.serviceErrors.logs)}</p>`;
    return;
  }

  renderTable(
    elements.logsTable,
    state.logs.map((log) => ({
      status: log.status,
      kind: log.kind,
      label: log.label,
      rows: log.rowCount ?? '',
      durationMs: log.durationMs,
      time: formatDate(log.createdAt),
      error: log.error ?? '',
      query: truncate(log.query ?? '', 120),
    })),
  );
}

function renderSettings() {
  const database = activeDatabase();
  setStatusBadge(elements.settingsStatus, database?.status ?? 'Disconnected', database?.status ?? 'neutral');
  elements.settingsContent.innerHTML = database
    ? `
      <div class="details-row"><span>Database</span><strong>${escapeHtml(database.name)}</strong></div>
      <div class="details-row"><span>Storage label</span><strong>${escapeHtml(database.storage)}</strong></div>
      <div class="details-row"><span>Mode</span><strong>${escapeHtml(database.mode)}</strong></div>
      <div class="details-row"><span>Node tables</span><strong>${escapeHtml(database.nodeTableCount)}</strong></div>
      <div class="details-row"><span>Relationship tables</span><strong>${escapeHtml(database.relationshipTableCount)}</strong></div>
    `
    : '<p class="empty-state">No database settings.</p>';
}

function selectedTutorial() {
  return state.tutorials.find((tutorial) => tutorial.id === state.selectedTutorialId) ?? state.tutorials[0] ?? null;
}

function filteredTutorials() {
  const search = state.tutorialSearch.trim().toLowerCase();
  const topic = state.tutorialTopicFilter;
  return state.tutorials.filter((tutorial) => {
    const searchable = `${tutorial.title} ${tutorial.description} ${(tutorial.tags ?? []).join(' ')} ${(tutorial.concepts ?? []).join(' ')}`.toLowerCase();
    const matchesSearch = !search || searchable.includes(search);
    const matchesTopic = topic === 'all' || (tutorial.tags ?? []).includes(topic);
    return matchesSearch && matchesTopic;
  });
}

function renderTutorialTopicOptions() {
  const topics = state.tutorialTopics.length ? state.tutorialTopics : defaultTutorialTopics;
  elements.tutorialTopicFilter.innerHTML = '<option value="all">All topics</option>';
  for (const topic of topics) {
    const option = document.createElement('option');
    option.value = topic;
    option.textContent = topic;
    elements.tutorialTopicFilter.append(option);
  }
  if (state.tutorialTopicFilter !== 'all' && !topics.includes(state.tutorialTopicFilter)) {
    state.tutorialTopicFilter = 'all';
  }
  elements.tutorialTopicFilter.value = state.tutorialTopicFilter;
}

function focusTutorialByTopic(topic) {
  state.tutorialSearch = '';
  state.tutorialTopicFilter = topic;

  const match = state.tutorials.find((tutorial) => (tutorial.tags ?? []).includes(topic));
  if (match) {
    state.selectedTutorialId = match.id;
    state.practiceResult = null;
    state.practiceError = null;
  }

  switchView('learn');
  renderLearn();
  document.querySelector(match ? '#tutorialDetail' : '#tutorialCatalog')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (!match) {
    toast(state.serviceErrors.tutorials ?? `No tutorials found for ${topic}.`);
  }
}

function renderLearn() {
  if (!elements.tutorialCatalog) {
    return;
  }

  const progress = state.tutorialsData?.progress ?? {};
  elements.learnProgress.innerHTML = `
    <article><strong>${escapeHtml(progress.tutorialsCompleted ?? 0)}</strong><span>Completed</span></article>
    <article><strong>${escapeHtml(progress.tutorialsStarted ?? 0)}</strong><span>Started</span></article>
    <article><strong>${escapeHtml(progress.practiceQueriesRun ?? 0)}</strong><span>Practice queries</span></article>
  `;
  renderTutorialTopicOptions();

  if (state.serviceErrors.tutorials && state.tutorials.length === 0) {
    elements.tutorialCount.textContent = 'Unavailable';
    elements.tutorialCatalog.innerHTML = `<p class="warning-text">Tutorial service failed: ${escapeHtml(state.serviceErrors.tutorials)}</p>`;
    elements.tutorialDifficulty.textContent = 'Unavailable';
    elements.tutorialDetail.innerHTML = '<p class="empty-state">Tutorials are unavailable. Other console pages can still be used.</p>';
    elements.practiceStatus.textContent = 'Unavailable';
    elements.practiceSteps.innerHTML = '<p class="empty-state">Practice data is unavailable because tutorials did not load.</p>';
    elements.practiceQueries.innerHTML = '';
    elements.tutorialDataManager.innerHTML = '<p class="empty-state">No tutorial datasets available.</p>';
    renderPracticeResult();
    return;
  }

  elements.tutorialTopicFilter.value = state.tutorialTopicFilter;
  elements.tutorialSearch.value = state.tutorialSearch;

  const tutorials = filteredTutorials();
  elements.tutorialCount.textContent = `${tutorials.length} tutorials`;
  elements.tutorialCatalog.innerHTML =
    tutorials.length === 0
      ? '<p class="empty-state">No tutorials match the current filters.</p>'
      : tutorials
          .map(
            (tutorial) => `
              <article class="tutorial-card ${tutorial.id === state.selectedTutorialId ? 'active' : ''}">
                <div class="tutorial-card-header">
                  <div>
                    <h3>${escapeHtml(tutorial.title)}</h3>
                    <p>${escapeHtml(tutorial.description)}</p>
                  </div>
                  <span class="status-chip ${tutorial.difficulty === 'Beginner' ? 'success' : 'neutral'}">${escapeHtml(tutorial.difficulty)}</span>
                </div>
                <div class="tag-row">
                  ${(tutorial.tags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
                </div>
                <div class="tutorial-meta">
                  <span>${escapeHtml(tutorial.estimatedMinutes)} min</span>
                  <span>${tutorial.dataset ? 'Dataset included' : 'No dataset'}</span>
                  <span>${tutorial.completed ? 'Completed' : tutorial.started ? 'Started' : 'New'}</span>
                </div>
                <div class="button-row left">
                  <button class="primary-action" type="button" data-tutorial-select="${escapeHtml(tutorial.id)}">Start Tutorial</button>
                  <button class="ghost-action" type="button" data-tutorial-load="${escapeHtml(tutorial.id)}" ${tutorialBusyAttr(tutorial.id)}>${tutorialActionLabel(tutorial.id, 'load', 'Load Dataset')}</button>
                  <a class="ghost-link" href="${escapeHtml(tutorial.sourceUrl)}" target="_blank" rel="noreferrer">Open Source</a>
                </div>
              </article>
            `,
          )
          .join('');

  renderTutorialDetail();
  renderPracticeResult();
  renderTutorialDataManager();
}

function renderTutorialDetail() {
  const tutorial = selectedTutorial();
  if (!tutorial) {
    elements.tutorialDetail.innerHTML = '<p class="empty-state">No tutorial selected.</p>';
    elements.tutorialDifficulty.textContent = 'Select tutorial';
    return;
  }

  elements.tutorialDifficulty.textContent = `${tutorial.difficulty} · ${tutorial.estimatedMinutes} min`;
  const schema = tutorial.schema ?? { nodes: [], relationships: [] };
  elements.tutorialDetail.innerHTML = `
    <div class="tutorial-title-block">
      <h3>${escapeHtml(tutorial.title)}</h3>
      <p>${escapeHtml(tutorial.description)}</p>
    </div>
    <div class="tag-row">${(tutorial.tags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    <div class="section-heading inset"><h3>Learning Objectives</h3></div>
    <ul class="tutorial-list">${(tutorial.learningObjectives ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    <div class="section-heading inset"><h3>Schema Preview</h3></div>
    <div class="schema-mini-grid">
      <article><strong>${escapeHtml(schema.nodes?.length ?? 0)}</strong><span>Node tables</span></article>
      <article><strong>${escapeHtml(schema.relationships?.length ?? 0)}</strong><span>Relationship tables</span></article>
    </div>
    <div class="section-heading inset"><h3>Dataset Files</h3></div>
    <div class="compact-list">
      ${((tutorial.dataset?.files ?? []) || []).map((file) => `<span>${escapeHtml(file.name)} · ${escapeHtml(file.type)} · ${escapeHtml(file.sizeLabel ?? '')}</span>`).join('')}
    </div>
    <div class="section-heading inset"><h3>Steps</h3></div>
    <div class="practice-steps">
      ${(tutorial.steps ?? [])
        .map(
          (step, index) => `
            <article class="practice-step">
              <strong>${index + 1}. ${escapeHtml(step.title)}</strong>
              <p>${escapeHtml(step.explanation)}</p>
              ${
                step.query
                  ? `<code>${escapeHtml(step.query)}</code>
                    <div class="button-row left">
                      <button class="ghost-action" type="button" data-practice-query="${escapeHtml(step.query)}">Run in Practice</button>
                      <button class="ghost-action" type="button" data-copy-query="${escapeHtml(step.query)}">Copy</button>
                      <button class="ghost-action" type="button" data-use-query="${escapeHtml(step.query)}">Open in Query Editor</button>
                    </div>`
                  : ''
              }
              ${step.expectedResultDescription ? `<p class="muted">${escapeHtml(step.expectedResultDescription)}</p>` : ''}
            </article>
          `,
        )
        .join('')}
    </div>
    <div class="attribution-box">
      Source: <a href="${escapeHtml(tutorial.attribution?.url ?? tutorial.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(tutorial.attribution?.source ?? 'kuzudb/tutorials')}</a>
      · License: ${escapeHtml(tutorial.attribution?.license ?? 'MIT')}
    </div>
    <div class="button-row left">
      <button class="ghost-action" type="button" data-tutorial-load="${escapeHtml(tutorial.id)}" ${tutorialBusyAttr(tutorial.id)}>${tutorialActionLabel(tutorial.id, 'load', 'Load dataset')}</button>
      <button class="ghost-action" type="button" data-tutorial-open-graph="${escapeHtml(tutorial.id)}" ${tutorialBusyAttr(tutorial.id)}>${tutorialActionLabel(tutorial.id, 'open-graph', 'Open dataset graph')}</button>
      <button class="primary-action" type="button" data-tutorial-complete="${escapeHtml(tutorial.id)}" ${tutorialBusyAttr(tutorial.id)}>${tutorialActionLabel(tutorial.id, 'complete', 'Mark complete')}</button>
    </div>
  `;

  renderPracticeWorkspace(tutorial);
}

function renderPracticeWorkspace(tutorial = selectedTutorial()) {
  if (!tutorial) {
    elements.practiceStatus.textContent = 'No tutorial selected';
    elements.practiceSteps.innerHTML = '<p class="empty-state">Select a tutorial to begin practicing.</p>';
    elements.practiceQueries.innerHTML = '';
    return;
  }

  const practice = tutorial.practice ?? {};
  const loadBusy = state.tutorialBusy === `load:${tutorial.id}`;
  const resetBusy = state.tutorialBusy === `reset:${tutorial.id}`;
  const tutorialBusy = Boolean(state.tutorialBusy?.endsWith(`:${tutorial.id}`));
  elements.loadPracticeDataButton.disabled = tutorialBusy;
  elements.loadPracticeDataButton.textContent = loadBusy ? 'Loading dataset' : 'Load dataset';
  elements.resetPracticeButton.disabled = tutorialBusy;
  elements.resetPracticeButton.textContent = resetBusy ? 'Resetting' : 'Reset sandbox';
  setStatusBadge(elements.practiceStatus, practice.loaded ? 'Dataset loaded' : 'Dataset not loaded', practice.loaded ? 'success' : 'neutral');
  elements.practiceSteps.innerHTML = `
    <p class="warning-text">${escapeHtml(practice.warning ?? 'Practice data is isolated from the active database.')}</p>
    ${(tutorial.steps ?? [])
      .map(
        (step, index) => `
          <article class="practice-step">
            <strong>${index + 1}. ${escapeHtml(step.title)}</strong>
            <p>${escapeHtml(step.explanation)}</p>
          </article>
        `,
      )
      .join('')}
  `;
  elements.practiceQueries.innerHTML = (tutorial.sampleQueries ?? [])
    .map(
      (query) => `
        <article class="query-snippet">
          <div>
            <strong>${escapeHtml(query.title)}</strong>
            <p class="muted">${escapeHtml(query.description)}</p>
            <code>${escapeHtml(query.query)}</code>
          </div>
          <div class="button-row">
            <button class="ghost-action" type="button" data-practice-query="${escapeHtml(query.query)}">Run</button>
            <button class="ghost-action" type="button" data-copy-query="${escapeHtml(query.query)}">Copy</button>
            <button class="ghost-action" type="button" data-use-query="${escapeHtml(query.query)}">Query Editor</button>
          </div>
        </article>
      `,
    )
    .join('');

  if (!elements.practiceQueryInput.value && tutorial.sampleQueries?.[0]?.query) {
    elements.practiceQueryInput.value = tutorial.sampleQueries[0].query;
  }
}

function renderPracticeResult() {
  $$('.tab-button[data-practice-tab]').forEach((button) => button.classList.toggle('active', button.dataset.practiceTab === state.practiceTab));
  $$('.practice-result-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `practice${capitalize(state.practiceTab)}Panel`));

  const result = state.practiceResult;
  if (!result) {
    elements.practiceMeta.textContent = 'No query run';
    elements.practiceResults.innerHTML = '<p class="empty-state">Load a dataset and run a practice query.</p>';
    elements.practiceJsonResults.textContent = '';
    elements.practiceLogs.textContent = state.practiceError ?? 'Practice query logs will appear here.';
    renderGraphCanvas(elements.practiceGraphSvg, { nodes: [], edges: [] }, { detailMode: 'toast' });
    return;
  }

  elements.practiceMeta.textContent = result.error ? 'Error' : `${result.rowCount ?? 0} rows · ${result.executionMs ?? 0} ms`;
  renderTable(elements.practiceResults, result.rows ?? []);
  elements.practiceJsonResults.textContent = JSON.stringify(result.rows ?? [], null, 2);
  elements.practiceLogs.textContent = result.error
    ? result.error
    : JSON.stringify({ query: result.query, practice: result.practice, rowCount: result.rowCount, executionMs: result.executionMs }, null, 2);
  renderGraphCanvas(elements.practiceGraphSvg, normalizeGraph(result.graph ?? { nodes: [], edges: [] }), { detailMode: 'toast' });
}

function renderTutorialDataManager() {
  elements.tutorialDataManager.innerHTML =
    state.tutorials.length === 0
      ? '<p class="empty-state">No tutorial datasets available.</p>'
      : state.tutorials
          .map((tutorial) => {
            const practice = tutorial.practice ?? {};
            return `
              <article class="tutorial-data-card">
                <div>
                  <strong>${escapeHtml(tutorial.dataset?.name ?? tutorial.title)}</strong>
                  <p>${escapeHtml(tutorial.dataset?.description ?? tutorial.description)}</p>
                  <span class="muted">${escapeHtml(practice.storage ?? '.kuzu-practice')}</span>
                </div>
                <span class="status-chip ${practice.loaded ? 'success' : 'neutral'}">${practice.loaded ? 'Loaded' : 'Not loaded'}</span>
                <div class="compact-list">
                  ${(tutorial.dataset?.files ?? []).map((file) => `<span>${escapeHtml(file.name)} · ${escapeHtml(file.sizeLabel ?? '')}</span>`).join('')}
                </div>
                <div class="button-row left">
                  <button class="ghost-action" type="button" data-tutorial-load="${escapeHtml(tutorial.id)}" ${tutorialBusyAttr(tutorial.id)}>${tutorialActionLabel(tutorial.id, 'load', practice.loaded ? 'Reload dataset' : 'Load dataset')}</button>
                  <button class="ghost-action" type="button" data-tutorial-reset="${escapeHtml(tutorial.id)}" ${tutorialBusyAttr(tutorial.id)}>${tutorialActionLabel(tutorial.id, 'reset', 'Reset')}</button>
                  <button class="ghost-action" type="button" data-tutorial-open-schema="${escapeHtml(tutorial.id)}" ${tutorialBusyAttr(tutorial.id)}>${tutorialActionLabel(tutorial.id, 'schema', 'View schema')}</button>
                  <button class="ghost-action" type="button" data-tutorial-open-graph="${escapeHtml(tutorial.id)}" ${tutorialBusyAttr(tutorial.id)}>${tutorialActionLabel(tutorial.id, 'open-graph', 'Open graph')}</button>
                </div>
              </article>
            `;
          })
          .join('');
}

function capitalize(value) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function tutorialBusyAttr(id) {
  return state.tutorialBusy?.endsWith(`:${id}`) ? 'disabled' : '';
}

function tutorialActionLabel(id, action, fallback) {
  return state.tutorialBusy === `${action}:${id}` ? 'Working...' : fallback;
}

function renderTable(container, rows) {
  if (!rows || rows.length === 0) {
    container.innerHTML = '<p class="empty-state">No rows.</p>';
    return;
  }

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  container.innerHTML = `
    <table>
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                ${columns.map((column) => `<td>${escapeHtml(formatCell(row[column]))}</td>`).join('')}
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function formatCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

function formatDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeGraph(graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  return {
    nodes,
    edges,
    counts: graph?.counts ?? { nodes: nodes.length, edges: edges.length },
  };
}

function getNodeColor(type) {
  return {
    Document: '#2563eb',
    Chunk: '#7c3aed',
    Entity: '#047857',
    Topic: '#b45309',
    Result: '#4b5563',
    Node: '#4b5563',
  }[type] ?? '#4b5563';
}

function graphKey(nodes) {
  return nodes.map((node) => node.id).sort().join('|');
}

function renderGraphCanvas(svg, graph, options = {}) {
  const data = normalizeGraph(graph);
  const key = svg.id;
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 560;
  const nodesKey = graphKey(data.nodes);
  const view = (state.graphViews[key] ??= {
    scale: 1,
    panX: 0,
    panY: 0,
    positions: new Map(),
    nodesKey: '',
    draggingId: null,
    panning: false,
    lastX: 0,
    lastY: 0,
  });

  if (view.nodesKey !== nodesKey) {
    view.scale = 1;
    view.panX = 0;
    view.panY = 0;
    view.positions = layoutNodes(data.nodes, width, height);
    view.nodesKey = nodesKey;
  }

  function paint() {
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';

    const viewport = svgElement('g', {
      class: 'graph-viewport',
      transform: `translate(${view.panX} ${view.panY}) scale(${view.scale})`,
    });

    const edgeLayer = svgElement('g', { class: 'edge-layer' });
    for (const edge of data.edges) {
      const source = view.positions.get(String(edge.source));
      const target = view.positions.get(String(edge.target));
      if (!source || !target) {
        continue;
      }
      const line = svgElement('line', {
        class: 'graph-edge',
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
      });
      line.addEventListener('click', (event) => {
        event.stopPropagation();
        handleGraphSelection(edge, 'edge', options.detailMode);
      });
      edgeLayer.append(line);
    }
    viewport.append(edgeLayer);

    const nodeLayer = svgElement('g', { class: 'node-layer' });
    for (const node of data.nodes) {
      const position = view.positions.get(String(node.id));
      if (!position) {
        continue;
      }
      const label = truncate(node.label || node.name || node.title || node.id, 22);
      const nodeWidth = Math.max(88, Math.min(178, label.length * 7 + 28));
      const group = svgElement('g', {
        class: `graph-node node-${node.type}${state.selectedId === node.id ? ' is-selected' : ''}`,
        transform: `translate(${position.x - nodeWidth / 2} ${position.y - 18})`,
        tabindex: '0',
      });

      group.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        view.draggingId = String(node.id);
        view.lastX = event.clientX;
        view.lastY = event.clientY;
      });
      group.addEventListener('click', (event) => {
        event.stopPropagation();
        handleGraphSelection(node, 'node', options.detailMode);
      });

      group.append(svgElement('rect', { width: nodeWidth, height: 36, rx: 7, fill: getNodeColor(node.type) }));
      const text = svgElement('text', { x: nodeWidth / 2, y: 23, 'text-anchor': 'middle' });
      text.textContent = label;
      group.append(text);
      nodeLayer.append(group);
    }
    viewport.append(nodeLayer);
    svg.append(viewport);

    if (data.nodes.length === 0) {
      const empty = svgElement('text', { x: width / 2, y: height / 2, 'text-anchor': 'middle', fill: '#68716d' });
      empty.textContent = 'No graph results';
      svg.append(empty);
    }
  }

  svg.onwheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    view.scale = Math.max(0.45, Math.min(2.6, view.scale * delta));
    paint();
  };
  svg.onpointerdown = (event) => {
    view.panning = true;
    view.lastX = event.clientX;
    view.lastY = event.clientY;
  };
  svg.onpointermove = (event) => {
    if (view.draggingId) {
      const position = view.positions.get(view.draggingId);
      if (position) {
        position.x += (event.clientX - view.lastX) / view.scale;
        position.y += (event.clientY - view.lastY) / view.scale;
        view.lastX = event.clientX;
        view.lastY = event.clientY;
        paint();
      }
      return;
    }
    if (view.panning) {
      view.panX += event.clientX - view.lastX;
      view.panY += event.clientY - view.lastY;
      view.lastX = event.clientX;
      view.lastY = event.clientY;
      paint();
    }
  };
  svg.onpointerup = () => {
    view.draggingId = null;
    view.panning = false;
  };
  svg.onpointerleave = () => {
    view.draggingId = null;
    view.panning = false;
  };

  paint();
}

function layoutNodes(nodes, width, height) {
  const positions = new Map();
  const types = [...new Set([...nodeOrder.filter((type) => nodes.some((node) => node.type === type)), ...nodes.map((node) => node.type).filter((type) => !nodeOrder.includes(type))])];
  const laneCount = Math.max(types.length, 1);
  const paddingX = Math.max(72, Math.min(width * 0.08, 120));
  const paddingY = Math.max(56, Math.min(height * 0.1, 90));

  types.forEach((type, laneIndex) => {
    const group = nodes.filter((node) => node.type === type);
    const x = laneCount === 1 ? width / 2 : paddingX + ((width - paddingX * 2) * laneIndex) / (laneCount - 1);
    const step = (height - paddingY * 2) / Math.max(group.length, 1);
    group.forEach((node, index) => {
      const jitter = ((hashCode(node.id) % 35) - 17) * 1.2;
      positions.set(String(node.id), {
        x: Math.max(paddingX, Math.min(width - paddingX, x + jitter)),
        y: paddingY + step * (index + 0.5),
      });
    });
  });

  return positions;
}

function handleGraphSelection(item, kind, mode) {
  state.selectedId = kind === 'node' ? item.id : `${item.source}-${item.target}-${item.type}`;
  if (mode === 'toast') {
    toast(`${kind}: ${item.label || item.name || item.type || item.id}`);
    return;
  }
  renderDetails(item, kind);
  renderExplore();
}

function renderDetails(item, kind) {
  const entries = Object.entries(item).filter(([, value]) => value !== undefined && value !== null && value !== '');
  elements.selectionDetails.classList.remove('muted');
  elements.selectionDetails.innerHTML = entries
    .map(
      ([key, value]) => `
        <div class="details-row">
          <span>${escapeHtml(key)}</span>
          <strong>${escapeHtml(formatCell(value))}</strong>
        </div>
      `,
    )
    .join('');

  if (kind === 'node' && item.type === 'Document') {
    const button = document.createElement('button');
    button.className = 'ghost-action';
    button.type = 'button';
    button.textContent = 'Load context';
    button.addEventListener('click', () => loadDocumentContext(item.id));
    elements.selectionDetails.append(button);
  }

  if (kind === 'node' && item.type === 'Entity') {
    const button = document.createElement('button');
    button.className = 'ghost-action';
    button.type = 'button';
    button.textContent = 'Load neighborhood';
    button.addEventListener('click', () => loadEntityNeighborhood(item.label || item.name || item.id));
    elements.selectionDetails.append(button);
  }
}

async function loadDocumentContext(id) {
  const context = await api(`/api/document-context?id=${encodeURIComponent(id)}`);
  elements.selectionDetails.innerHTML = `
    <div class="details-row"><span>Document</span><strong>${escapeHtml(context.document?.title ?? id)}</strong></div>
    <div class="details-row"><span>Chunks</span><strong>${escapeHtml((context.chunks ?? []).length)}</strong></div>
    <div class="details-row"><span>Entities</span><strong>${escapeHtml((context.entities ?? []).map((entity) => entity.name).join(', '))}</strong></div>
    <div class="details-row"><span>Topics</span><strong>${escapeHtml((context.topics ?? []).map((topic) => topic.name).join(', '))}</strong></div>
  `;
}

async function loadEntityNeighborhood(entity) {
  const result = await api(`/api/entity-neighborhood?entity=${encodeURIComponent(entity)}`);
  elements.selectionDetails.innerHTML = `
    <div class="details-row"><span>Query</span><strong>${escapeHtml(result.query)}</strong></div>
    <div class="details-row"><span>Relationships</span><strong>${escapeHtml((result.relationships ?? []).length)}</strong></div>
    <div class="details-row"><span>Supporting chunks</span><strong>${escapeHtml((result.supportingChunks ?? []).length)}</strong></div>
  `;
}

function svgElement(name, attributes) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes ?? {})) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function hashCode(value) {
  let hash = 0;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function parseTopics(value) {
  return value
    .split(',')
    .map((topic) => topic.trim())
    .filter(Boolean);
}

function parseEntities(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, type, ...descriptionParts] = line.split('|').map((part) => part.trim());
      return {
        name,
        type: type || 'Concept',
        description: descriptionParts.join(' | '),
      };
    })
    .filter((entity) => entity.name);
}

function parseRelationships(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [from, relation, to, ...evidenceParts] = line.split('|').map((part) => part.trim());
      return {
        from,
        relation,
        to,
        evidence: evidenceParts.join(' | '),
      };
    })
    .filter((relationship) => relationship.from && relationship.relation && relationship.to);
}

function draftFromImportForm() {
  const form = new FormData(elements.importForm);
  return {
    title: String(form.get('title') ?? ''),
    source: String(form.get('source') ?? ''),
    owner: String(form.get('owner') ?? ''),
    summary: String(form.get('summary') ?? ''),
    body: String(form.get('body') ?? ''),
    topics: parseTopics(String(form.get('topics') ?? '')),
    entities: parseEntities(String(form.get('entities') ?? '')),
    relationships: parseRelationships(String(form.get('relationships') ?? '')),
  };
}

function suggestEntitiesFromText(text) {
  const matches = text.match(/\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3}\b/g) ?? [];
  const blocked = new Set(['The', 'This', 'That', 'When', 'Where', 'Before', 'After', 'Users', 'Create']);
  const unique = [];
  const seen = new Set();

  for (const match of matches) {
    const name = match.trim();
    const key = name.toLowerCase();
    if (name.length <= 2 || blocked.has(name) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(name);
  }

  return unique.slice(0, 10).map((name) => `${name} | Concept | Extracted from pasted knowledge text`).join('\n');
}

async function runCypher() {
  const query = elements.cypherInput.value.trim();
  if (!query) {
    toast('Enter a Cypher query.');
    return;
  }

  elements.runCypherButton.disabled = true;
  elements.queryMeta.textContent = 'Running';
  try {
    state.queryResult = await api('/api/cypher', {
      method: 'POST',
      body: JSON.stringify({ query, limit: 100 }),
    });
    state.resultTab = 'table';
    renderQueryResult();
    await loadLogs();
  } catch (error) {
    state.queryResult = {
      rowCount: 0,
      executionMs: 0,
      rows: [],
      graph: { nodes: [], edges: [] },
      error: error.message,
    };
    elements.queryMeta.textContent = 'Error';
    elements.rawResults.textContent = error.message;
    toast(error.message);
    await loadLogs().catch(() => null);
  } finally {
    elements.runCypherButton.disabled = false;
  }
}

function formatCypher() {
  const keywords = ['MATCH', 'RETURN', 'WHERE', 'LIMIT', 'ORDER BY', 'WITH', 'UNWIND'];
  let query = elements.cypherInput.value.replace(/\s+/g, ' ').trim();
  for (const keyword of keywords) {
    query = query.replace(new RegExp(`\\s+${keyword}\\s+`, 'gi'), `\n${keyword} `);
  }
  elements.cypherInput.value = query.trim();
}

function getSavedQueries() {
  try {
    return JSON.parse(localStorage.getItem(savedQueryKey) || '[]');
  } catch {
    return [];
  }
}

function saveQuery() {
  const query = elements.cypherInput.value.trim();
  if (!query) {
    toast('Enter a query before saving.');
    return;
  }
  const saved = getSavedQueries();
  if (!saved.includes(query)) {
    saved.unshift(query);
    localStorage.setItem(savedQueryKey, JSON.stringify(saved.slice(0, 20)));
  }
  renderQueryLists();
  toast('Query saved locally.');
}

async function runExplore() {
  const table = elements.exploreTable.value || 'Document';
  const depth = Number(elements.exploreDepth.value || 1);
  const limit = Number(elements.exploreLimit.value || 100);
  state.exploreResult = await api('/api/explore', {
    method: 'POST',
    body: JSON.stringify({ table, depth, limit }),
  });
  state.graphViews.exploreGraphSvg = undefined;
  renderExplore();
}

async function loadTutorialDataset(id = state.selectedTutorialId) {
  if (!id) {
    toast('Select a tutorial first.');
    return;
  }
  state.tutorialBusy = `load:${id}`;
  renderLearn();
  try {
    const result = await api(`/api/tutorials/${encodeURIComponent(id)}/load-data`, { method: 'POST', body: '{}' });
    state.practiceError = null;
    state.practiceResult = null;
    await reloadTutorials();
    toast(result.message ?? 'Practice dataset loaded.');
  } catch (error) {
    state.practiceError = messageFromError(error);
    state.practiceTab = 'logs';
    renderPracticeResult();
    throw error;
  } finally {
    state.tutorialBusy = null;
    renderLearn();
  }
}

async function resetTutorialDataset(id = state.selectedTutorialId) {
  if (!id) {
    toast('Select a tutorial first.');
    return;
  }
  state.tutorialBusy = `reset:${id}`;
  renderLearn();
  try {
    const result = await api(`/api/tutorials/${encodeURIComponent(id)}/reset`, { method: 'POST', body: '{}' });
    state.practiceResult = null;
    state.practiceError = null;
    await reloadTutorials();
    toast(result.message ?? 'Practice sandbox reset.');
  } catch (error) {
    state.practiceError = messageFromError(error);
    state.practiceTab = 'logs';
    renderPracticeResult();
    throw error;
  } finally {
    state.tutorialBusy = null;
    renderLearn();
  }
}

async function runPracticeQuery() {
  const tutorial = selectedTutorial();
  const query = elements.practiceQueryInput.value.trim();
  if (!tutorial) {
    toast('Select a tutorial first.');
    return;
  }
  if (!query) {
    toast('Choose or write a practice query.');
    return;
  }

  elements.runPracticeQueryButton.disabled = true;
  elements.practiceMeta.textContent = 'Running';
  try {
    state.practiceResult = await api(`/api/tutorials/${encodeURIComponent(tutorial.id)}/query`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    state.practiceError = null;
    state.practiceTab = 'table';
    renderPracticeResult();
    await loadLogs();
  } catch (error) {
    const message = messageFromError(error);
    state.practiceResult = {
      rowCount: 0,
      executionMs: 0,
      rows: [],
      graph: { nodes: [], edges: [] },
      error: message,
    };
    state.practiceError = message;
    elements.practiceMeta.textContent = 'Error';
    state.practiceTab = 'logs';
    renderPracticeResult();
    toast(message);
  } finally {
    elements.runPracticeQueryButton.disabled = false;
  }
}

async function reloadTutorials() {
  const tutorials = await loadService('tutorials', api('/api/tutorials'), state.tutorialsData ?? { tutorials: [], topics: [], progress: {} });
  state.tutorialsData = tutorials;
  state.tutorials = tutorials.tutorials ?? [];
  state.tutorialTopics = tutorials.topics ?? [];
  renderLearn();
}

async function completeTutorial(id = state.selectedTutorialId) {
  if (!id) {
    toast('Select a tutorial first.');
    return;
  }
  state.tutorialBusy = `complete:${id}`;
  renderLearn();
  try {
    await api(`/api/tutorials/${encodeURIComponent(id)}/complete`, { method: 'POST', body: '{}' });
    await reloadTutorials();
    toast('Tutorial marked complete.');
  } finally {
    state.tutorialBusy = null;
    renderLearn();
  }
}

async function openTutorialGraph(id = state.selectedTutorialId) {
  if (!id) {
    toast('Select a tutorial first.');
    return;
  }
  state.tutorialBusy = `open-graph:${id}`;
  renderLearn();
  try {
    const graph = await api(`/api/tutorials/${encodeURIComponent(id)}/graph`);
    state.exploreResult = normalizeGraph(graph);
    state.graphViews.exploreGraphSvg = undefined;
    switchView('explore');
  } finally {
    state.tutorialBusy = null;
    renderLearn();
  }
}

async function showTutorialSchema(id = state.selectedTutorialId) {
  if (!id) {
    toast('Select a tutorial first.');
    return;
  }
  state.tutorialBusy = `schema:${id}`;
  renderLearn();
  try {
    const schema = await api(`/api/tutorials/${encodeURIComponent(id)}/schema`);
    const runtimeSchema = schema.runtimeSchema;
    toast(runtimeSchema ? 'Tutorial runtime schema is loaded.' : 'Tutorial schema preview is available in the detail panel.');
    switchView('learn');
  } finally {
    state.tutorialBusy = null;
    renderLearn();
  }
}

async function previewImport() {
  const preview = await api('/api/import/preview', {
    method: 'POST',
    body: JSON.stringify(draftFromImportForm()),
  });
  elements.importPreview.innerHTML = `
    <div class="preview-status ${preview.valid ? 'success' : 'danger'}">${preview.valid ? 'Valid import plan' : 'Needs changes'}</div>
    ${(preview.warnings ?? []).map((warning) => `<p class="warning-text">${escapeHtml(warning)}</p>`).join('')}
    <div class="compact-list">
      ${(preview.operations ?? [])
        .map((operation) => `<span>${escapeHtml(operation.type)} · ${escapeHtml(operation.table)} · ${escapeHtml(operation.count)}</span>`)
        .join('')}
    </div>
    <pre class="json-viewer small">${escapeHtml((preview.generatedCypherPreview ?? []).join('\n'))}</pre>
  `;
  return preview;
}

async function runImport(event) {
  event.preventDefault();
  const payload = draftFromImportForm();
  if (!payload.title.trim() || !payload.body.trim()) {
    toast('Document title and source text are required.');
    return;
  }

  await previewImport();
  const created = await api('/api/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await refreshAll();
  switchView('explore');
  const documentNode = state.graph.nodes.find((node) => node.id === created.document?.id);
  if (documentNode) {
    state.exploreResult = {
      nodes: state.graph.nodes.filter((node) => node.id === documentNode.id || state.graph.edges.some((edge) => edge.source === documentNode.id && edge.target === node.id)),
      edges: state.graph.edges.filter((edge) => edge.source === documentNode.id || edge.target === documentNode.id),
    };
    renderDetails(documentNode, 'node');
    renderExplore();
  }
  toast('Import completed.');
}

async function loadLogs() {
  const data = await api('/api/logs');
  state.logs = data.logs ?? [];
  renderLogs();
  renderOverview();
}

async function searchGraph() {
  const query = elements.globalSearch.value.trim();
  if (query.length < 2) {
    elements.searchResults.hidden = true;
    elements.searchResults.innerHTML = '';
    return;
  }

  const results = await api(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
  elements.searchResults.hidden = false;
  elements.searchResults.innerHTML =
    results.length === 0
      ? '<p class="empty-state">No matches.</p>'
      : results
          .map(
            (result) => `
              <article class="search-item">
                <button type="button" data-result-id="${escapeHtml(result.id)}">${escapeHtml(result.kind)}: ${escapeHtml(result.title)}</button>
                <p class="muted">${escapeHtml(result.snippet)}</p>
              </article>
            `,
          )
          .join('');

  elements.searchResults.querySelectorAll('button[data-result-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const node = state.graph.nodes.find((candidate) => candidate.id === button.dataset.resultId);
      if (node) {
        state.exploreResult = null;
        switchView('explore');
        renderDetails(node, 'node');
        elements.searchResults.hidden = true;
      }
    });
  });
}

function debounce(fn, delay) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) {
    return;
  }

  try {
  if (target.dataset.viewLink) {
    switchView(target.dataset.viewLink);
  }

  if (target.dataset.schemaKey) {
    state.selectedSchema = target.dataset.schemaKey;
    renderSchema();
  }

  if (target.dataset.useQuery) {
    elements.cypherInput.value = target.dataset.useQuery;
    switchView('query');
  }

  if (target.dataset.tutorialSelect) {
    state.selectedTutorialId = target.dataset.tutorialSelect;
    state.practiceResult = null;
    state.practiceError = null;
    renderLearn();
    document.querySelector('#tutorialDetail')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (target.dataset.tutorialLoad) {
    state.selectedTutorialId = target.dataset.tutorialLoad;
    await loadTutorialDataset(target.dataset.tutorialLoad);
  }

  if (target.dataset.tutorialReset) {
    await resetTutorialDataset(target.dataset.tutorialReset);
  }

  if (target.dataset.tutorialComplete) {
    await completeTutorial(target.dataset.tutorialComplete);
  }

  if (target.dataset.tutorialOpenGraph) {
    await openTutorialGraph(target.dataset.tutorialOpenGraph).catch((error) => toast(error.message));
  }

  if (target.dataset.tutorialOpenSchema) {
    await showTutorialSchema(target.dataset.tutorialOpenSchema);
  }

  if (target.dataset.practiceQuery) {
    elements.practiceQueryInput.value = target.dataset.practiceQuery;
    state.practiceTab = 'table';
    switchView('learn');
  }

  if (target.dataset.copyQuery) {
    await copyToClipboard(target.dataset.copyQuery);
    toast('Query copied.');
  }

  if (target.dataset.practiceTab) {
    state.practiceTab = target.dataset.practiceTab;
    renderPracticeResult();
  }

  if (target.dataset.learnFocus) {
    focusTutorialByTopic(target.dataset.learnFocus);
  }

  if (target.dataset.learnSection) {
    switchView('learn');
    const selector = target.dataset.learnSection === 'data' ? '#tutorialDataManager' : '.concept-grid';
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (target.dataset.resultTab) {
    state.resultTab = target.dataset.resultTab;
    renderQueryResult();
  }

  if (target.dataset.databaseAction === 'open') {
    await api('/api/databases/default/open', { method: 'POST', body: '{}' });
    await refreshAll();
    toast('Database opened.');
  }

  if (target.dataset.databaseAction === 'disconnect') {
    const result = await api('/api/databases/default/disconnect', { method: 'POST', body: '{}' });
    await loadLogs();
    toast(result.message ?? 'Disconnect requested.');
  }
  } catch (error) {
    toast(messageFromError(error));
  }
});

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(elements.loginForm);
  try {
    await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    });
    showApp();
    await refreshAll();
    toast('Signed in.');
  } catch (error) {
    toast(error.message);
  }
});

elements.logoutButton.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: '{}' }).catch(() => null);
  showLogin();
});

elements.refreshButton.addEventListener('click', async () => {
  await refreshAll();
  toast('Console refreshed.');
});

$$('.nav-item').forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

elements.runCypherButton.addEventListener('click', () => runCypher());
elements.formatCypherButton.addEventListener('click', formatCypher);
elements.saveQueryButton.addEventListener('click', saveQuery);
elements.cypherInput.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    runCypher();
  }
});

elements.tutorialSearch.addEventListener(
  'input',
  debounce(() => {
    state.tutorialSearch = elements.tutorialSearch.value;
    renderLearn();
  }, 180),
);
elements.tutorialTopicFilter.addEventListener('change', () => {
  state.tutorialTopicFilter = elements.tutorialTopicFilter.value;
  renderLearn();
});
elements.loadPracticeDataButton.addEventListener('click', () => {
  loadTutorialDataset().catch((error) => toast(error.message));
});
elements.resetPracticeButton.addEventListener('click', () => {
  resetTutorialDataset().catch((error) => toast(error.message));
});
elements.runPracticeQueryButton.addEventListener('click', () => {
  runPracticeQuery().catch((error) => toast(error.message));
});
elements.copyPracticeQueryButton.addEventListener('click', () => {
  const query = elements.practiceQueryInput.value.trim();
  if (!query) {
    toast('Choose a practice query first.');
    return;
  }
  elements.cypherInput.value = query;
  switchView('query');
  toast('Practice query copied to Query Editor.');
});

elements.runExploreButton.addEventListener('click', () => {
  runExplore().catch((error) => toast(error.message));
});
elements.fitGraphButton.addEventListener('click', () => {
  state.graphViews.exploreGraphSvg = undefined;
  renderExplore();
});
elements.resetGraphButton.addEventListener('click', () => {
  state.exploreResult = null;
  state.graphViews.exploreGraphSvg = undefined;
  renderExplore();
});

elements.suggestButton.addEventListener('click', () => {
  const form = new FormData(elements.importForm);
  const suggestions = suggestEntitiesFromText(String(form.get('body') ?? ''));
  elements.importForm.elements.entities.value = suggestions;
  toast(suggestions ? 'Entity suggestions added.' : 'No entity suggestions found.');
});
elements.previewImportButton.addEventListener('click', () => {
  previewImport().catch((error) => toast(error.message));
});
elements.importForm.addEventListener('submit', (event) => {
  runImport(event).catch((error) => toast(error.message));
});

elements.clearLogsButton.addEventListener('click', async () => {
  await api('/api/logs', { method: 'DELETE' });
  await loadLogs();
  toast('Local history cleared.');
});

elements.globalSearch.addEventListener(
  'input',
  debounce(() => {
    searchGraph().catch((error) => toast(error.message));
  }, 260),
);

window.addEventListener(
  'resize',
  debounce(() => {
    state.graphViews.queryGraphSvg = undefined;
    state.graphViews.exploreGraphSvg = undefined;
    renderQueryResult();
    renderExplore();
  }, 140),
);

boot();
