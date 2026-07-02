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
  logs: [],
  selectedSchema: null,
  selectedId: null,
  graphViews: {},
};

const views = {
  overview: 'Overview',
  databases: 'Databases',
  schema: 'Schema',
  query: 'Query',
  explore: 'Explore Graph',
  import: 'Import Data',
  logs: 'Jobs / Logs',
  settings: 'Settings',
};

const nodeOrder = ['Document', 'Chunk', 'Entity', 'Topic'];
const savedQueryKey = 'kuzu-console-saved-queries';

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
  const [overview, databases, schemaDetails, graph, logs] = await Promise.all([
    api('/api/overview'),
    api('/api/databases'),
    api('/api/schema-details'),
    api('/api/graph?limit=500'),
    api('/api/logs'),
  ]);

  state.overview = overview;
  state.databases = databases.databases ?? [];
  state.schemaDetails = schemaDetails;
  state.graph = normalizeGraph(graph);
  state.logs = logs.logs ?? [];
  state.selectedSchema ??= firstSchemaTable()?.key ?? null;

  renderAll();
}

function renderAll() {
  renderHeader();
  renderOverview();
  renderDatabases();
  renderSchema();
  renderExplore();
  renderQueryResult();
  renderQueryLists();
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
    state.logs.length === 0
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
    state.databases.length === 0
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
