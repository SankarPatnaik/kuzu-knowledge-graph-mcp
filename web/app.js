const state = {
  view: 'overview',
  overview: null,
  graph: { nodes: [], edges: [] },
  filter: 'all',
  selectedId: null,
};

const views = {
  overview: 'Overview',
  build: 'Build',
  explore: 'Explore',
  query: 'Query',
  ask: 'Ask',
};

const nodeOrder = ['Document', 'Chunk', 'Entity', 'Topic'];

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
  kpiGrid: $('#kpiGrid'),
  topicTable: $('#topicTable'),
  topicCount: $('#topicCount'),
  relationshipList: $('#relationshipList'),
  relationshipCount: $('#relationshipCount'),
  graphForm: $('#graphForm'),
  suggestButton: $('#suggestButton'),
  graphSvg: $('#graphSvg'),
  selectionDetails: $('#selectionDetails'),
  cypherInput: $('#cypherInput'),
  runCypherButton: $('#runCypherButton'),
  cypherResults: $('#cypherResults'),
  cypherCount: $('#cypherCount'),
  questionInput: $('#questionInput'),
  askButton: $('#askButton'),
  answerContext: $('#answerContext'),
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

function truncate(value, length = 90) {
  const text = String(value ?? '');
  return text.length <= length ? text : `${text.slice(0, length - 1)}...`;
}

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => elements.toast.classList.remove('visible'), 3200);
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
    // The login screen is the fallback state.
  }
  showLogin();
}

async function refreshAll() {
  const [overview, graph] = await Promise.all([api('/api/overview'), api('/api/graph?limit=500')]);
  state.overview = overview;
  state.graph = graph;
  renderOverview();
  renderGraph();
}

function switchView(view) {
  state.view = view;
  elements.viewTitle.textContent = views[view];
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  $$('.view-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `${view}Panel`));
  if (view === 'explore') {
    renderGraph();
  }
}

function renderOverview() {
  const overview = state.overview ?? {};
  const nodeCounts = overview.nodeCounts ?? {};
  const relCounts = overview.relationshipCounts ?? {};
  const kpis = [
    ['Documents', nodeCounts.Document ?? 0],
    ['Chunks', nodeCounts.Chunk ?? 0],
    ['Entities', nodeCounts.Entity ?? 0],
    ['Topics', nodeCounts.Topic ?? 0],
  ];

  elements.kpiGrid.innerHTML = kpis
    .map(([label, value]) => `<article class="kpi-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join('');

  const topics = overview.topicCoverage ?? [];
  elements.topicCount.textContent = `${topics.length} topics`;
  renderTable(
    elements.topicTable,
    topics.map((row) => ({
      topic: row.name,
      document: row.documentTitle,
      weight: row.weight,
      description: row.description,
    })),
  );

  const examples = overview.exampleEvidence ?? [];
  elements.relationshipCount.textContent = `${Object.values(relCounts).reduce((sum, value) => sum + Number(value ?? 0), 0)} edges`;
  elements.relationshipList.innerHTML =
    examples.length === 0
      ? '<p class="empty-state">No relationships yet.</p>'
      : examples
          .map(
            (row) => `
              <article class="relationship-item">
                <div class="path">${escapeHtml(row.fromEntity)} -> ${escapeHtml(row.relation)} -> ${escapeHtml(row.toEntity)}</div>
                <p class="muted">${escapeHtml(row.evidence)}</p>
              </article>
            `,
          )
          .join('');
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

function getNodeColor(type) {
  return {
    Document: '#2864bd',
    Chunk: '#6547a8',
    Entity: '#167761',
    Topic: '#a96800',
  }[type] ?? '#68716d';
}

function renderGraph() {
  const svg = elements.graphSvg;
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 600;
  const nodes = state.graph.nodes ?? [];
  const edges = state.graph.edges ?? [];
  const selectedType = state.filter;
  const seedIds =
    selectedType === 'all'
      ? new Set(nodes.map((node) => node.id))
      : new Set(nodes.filter((node) => node.type === selectedType).map((node) => node.id));
  const visibleIds = new Set(seedIds);

  if (selectedType !== 'all') {
    for (const edge of edges) {
      if (seedIds.has(edge.source) || seedIds.has(edge.target)) {
        visibleIds.add(edge.source);
        visibleIds.add(edge.target);
      }
    }
  }

  const visibleNodes = nodes.filter((node) => visibleIds.has(node.id));
  const visibleEdges = edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const positions = layoutNodes(visibleNodes, width, height);
  const nodeById = new Map(visibleNodes.map((node) => [node.id, node]));

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.innerHTML = '';

  const edgeLayer = svgElement('g', { class: 'edge-layer' });
  for (const edge of visibleEdges) {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
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
    line.addEventListener('click', () => selectItem(edge, 'edge'));
    edgeLayer.append(line);
  }
  svg.append(edgeLayer);

  const nodeLayer = svgElement('g', { class: 'node-layer' });
  for (const node of visibleNodes) {
    const position = positions.get(node.id);
    if (!position) {
      continue;
    }

    const label = truncate(node.label || node.name || node.id, 20);
    const nodeWidth = Math.max(86, Math.min(170, label.length * 7 + 26));
    const group = svgElement('g', {
      class: `graph-node node-${node.type}${state.selectedId === node.id ? ' is-selected' : ''}`,
      transform: `translate(${position.x - nodeWidth / 2} ${position.y - 17})`,
      tabindex: '0',
    });
    group.addEventListener('click', () => selectItem(nodeById.get(node.id), 'node'));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        selectItem(nodeById.get(node.id), 'node');
      }
    });

    group.append(svgElement('rect', { width: nodeWidth, height: 34, rx: 7, fill: getNodeColor(node.type) }));
    const text = svgElement('text', { x: nodeWidth / 2, y: 22, 'text-anchor': 'middle' });
    text.textContent = label;
    group.append(text);
    nodeLayer.append(group);
  }
  svg.append(nodeLayer);

  if (visibleNodes.length === 0) {
    const empty = svgElement('text', { x: width / 2, y: height / 2, 'text-anchor': 'middle', fill: '#68716d' });
    empty.textContent = 'No graph data';
    svg.append(empty);
  }
}

function layoutNodes(nodes, width, height) {
  const positions = new Map();
  const paddingX = Math.max(72, Math.min(width * 0.08, 120));
  const paddingY = Math.max(56, Math.min(height * 0.1, 90));
  const lanes = {
    Document: paddingX,
    Chunk: width * 0.37,
    Entity: width * 0.66,
    Topic: width - paddingX,
  };

  for (const type of nodeOrder) {
    const group = nodes.filter((node) => node.type === type);
    const step = (height - paddingY * 2) / Math.max(group.length, 1);
    group.forEach((node, index) => {
      const y = paddingY + step * (index + 0.5);
      const jitter = ((hashCode(node.id) % 31) - 15) * 1.3;
      positions.set(node.id, {
        x: Math.max(paddingX, Math.min(width - paddingX, (lanes[type] ?? width / 2) + jitter)),
        y,
      });
    });
  }

  return positions;
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

function svgElement(name, attributes) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes ?? {})) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function selectItem(item, kind) {
  if (!item) {
    return;
  }
  state.selectedId = kind === 'node' ? item.id : `${item.source}-${item.target}-${item.type}`;
  renderDetails(item, kind);
  renderGraph();
}

function renderDetails(item, kind) {
  const entries = Object.entries(item).filter(([key, value]) => !['x', 'y'].includes(key) && value !== undefined && value !== null && value !== '');
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
    button.textContent = 'Load document context';
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
    <div class="details-row"><span>document</span><strong>${escapeHtml(context.document?.title ?? id)}</strong></div>
    <div class="details-row"><span>chunks</span><strong>${escapeHtml((context.chunks ?? []).length)}</strong></div>
    <div class="details-row"><span>entities</span><strong>${escapeHtml((context.entities ?? []).map((entity) => entity.name).join(', '))}</strong></div>
    <div class="details-row"><span>topics</span><strong>${escapeHtml((context.topics ?? []).map((topic) => topic.name).join(', '))}</strong></div>
  `;
}

async function loadEntityNeighborhood(entity) {
  const result = await api(`/api/entity-neighborhood?entity=${encodeURIComponent(entity)}`);
  elements.selectionDetails.innerHTML = `
    <div class="details-row"><span>query</span><strong>${escapeHtml(result.query)}</strong></div>
    <div class="details-row"><span>relationships</span><strong>${escapeHtml((result.relationships ?? []).length)}</strong></div>
    <div class="details-row"><span>supporting chunks</span><strong>${escapeHtml((result.supportingChunks ?? []).length)}</strong></div>
  `;
}

async function runCypher() {
  const result = await api('/api/cypher', {
    method: 'POST',
    body: JSON.stringify({ query: elements.cypherInput.value, limit: 100 }),
  });
  elements.cypherCount.textContent = `${result.rowCount ?? 0} rows`;
  renderTable(elements.cypherResults, result.rows ?? []);
}

async function askQuestion() {
  const question = elements.questionInput.value.trim();
  if (!question) {
    toast('Enter a question first.');
    return;
  }

  const result = await api('/api/question', {
    method: 'POST',
    body: JSON.stringify({ question, limit: 6 }),
  });
  const matches = result.matches ?? [];
  elements.answerCount.textContent = `${matches.length} matches`;
  elements.answerContext.innerHTML =
    matches.length === 0
      ? '<p class="empty-state">No matches.</p>'
      : matches
          .map(
            (match) => `
              <article class="evidence-item">
                <strong>${escapeHtml(match.kind)}: ${escapeHtml(match.title)}</strong>
                <p>${escapeHtml(match.snippet)}</p>
                <span class="muted">score ${escapeHtml(match.score)}</span>
              </article>
            `,
          )
          .join('');
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
        switchView('explore');
        selectItem(node, 'node');
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
  toast('Workspace refreshed.');
});

$$('.nav-item').forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

$$('.filter-button').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    $$('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
    renderGraph();
  });
});

elements.suggestButton.addEventListener('click', () => {
  const form = new FormData(elements.graphForm);
  const suggestions = suggestEntitiesFromText(String(form.get('body') ?? ''));
  elements.graphForm.elements.entities.value = suggestions;
  toast(suggestions ? 'Entity suggestions added.' : 'No entity suggestions found.');
});

elements.graphForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(elements.graphForm);
  const payload = {
    title: String(form.get('title') ?? ''),
    source: String(form.get('source') ?? ''),
    owner: String(form.get('owner') ?? ''),
    summary: String(form.get('summary') ?? ''),
    body: String(form.get('body') ?? ''),
    topics: parseTopics(String(form.get('topics') ?? '')),
    entities: parseEntities(String(form.get('entities') ?? '')),
    relationships: parseRelationships(String(form.get('relationships') ?? '')),
  };

  try {
    const created = await api('/api/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshAll();
    switchView('explore');
    const node = state.graph.nodes.find((candidate) => candidate.id === created.document?.id);
    if (node) {
      selectItem(node, 'node');
    }
    toast('Knowledge graph created.');
  } catch (error) {
    toast(error.message);
  }
});

elements.runCypherButton.addEventListener('click', () => {
  runCypher().catch((error) => toast(error.message));
});

elements.askButton.addEventListener('click', () => {
  askQuestion().catch((error) => toast(error.message));
});

elements.globalSearch.addEventListener('input', debounce(() => {
  searchGraph().catch((error) => toast(error.message));
}, 260));

window.addEventListener('resize', debounce(renderGraph, 120));

boot();
