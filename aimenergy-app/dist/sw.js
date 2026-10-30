/* Offline field kit: only an explicit PREPARE message writes a complete snapshot. */
const VERSION = 'field-v5';
const ROOT = new URL('./', self.location.href);
const PREFIX = `aimenergy-${encodeURIComponent(ROOT.pathname)}-${VERSION}-`;
const META = `${PREFIX}metadata`;
const POINTER = new URL('__offline_active__', ROOT).href;
const COMPLETE = new URL('__offline_complete__', ROOT).href;
const CORE = [
  'index.html', 'planner.html', 'landing.css', 'landing.js', 'images/field-assessment.jpg', 'app.js', 'engine.js', 'styles.css', 'ai-lab.js', 'ai-lab.css',
  'remote-core.js', 'remote-lab.js', 'remote-lab.css', 'data/satellite-evidence.json', 'images/satellite-orii-gangodye-2024.jpg', 'images/drone-survey-concept.png', 'metered-lab.js', 'data/metered-evidence.json', 'ml-model.js', 'field-core.js', 'field-lab.js', 'field-lab.css', 'offline.js',
  'manifest.webmanifest', 'icons/offline-icon.svg',
  'data/boundaries.geojson', 'data/catalog.json', 'data/ml-evaluation.json',
  'data/ml-model.json', 'data/ramp-profiles.json', 'data/site-clusters.json',
  'data/sites.json', 'data/survey-summary.json',
].map(path => new URL(path, ROOT).href);
const ALLOWED = new Set(CORE);
let preparing;

function cacheKey(request) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (url.origin !== ROOT.origin || url.search) return null;
  // Navigation fragments select a workspace; they do not identify another asset.
  url.hash = '';
  if (url.href === ROOT.href) return new URL('index.html', ROOT).href;
  return ALLOWED.has(url.href) ? url.href : null;
}

async function activeSnapshot() {
  const meta = await caches.open(META);
  const pointer = await meta.match(POINTER);
  if (!pointer) return null;
  const name = await pointer.text();
  if (!name.startsWith(PREFIX) || !(await caches.keys()).includes(name)) return null;
  const cache = await caches.open(name);
  if (!(await cache.match(COMPLETE))) return null;
  return { name, cache };
}

async function status() {
  const snapshot = await activeSnapshot();
  const missing = snapshot ? (await Promise.all(CORE.map(async key => (await snapshot.cache.match(key)) ? null : new URL(key).pathname))).filter(Boolean) : [];
  return { version: VERSION, ready: Boolean(snapshot) && missing.length === 0, missing };
}

async function network(request, timeout = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
    if (!response.ok || response.type === 'opaque') throw new Error(`HTTP ${response.status}`);
    return response;
  } finally { clearTimeout(timer); }
}

async function prepare() {
  const name = `${PREFIX}snapshot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const cache = await caches.open(name);
  try {
    // No partial snapshot is visible. The pointer changes only after every write succeeds.
    for (const key of CORE) {
      let response;
      try { response = await network(new Request(key), 15000); }
      catch (error) { throw new Error(`Could not save ${new URL(key).pathname}: ${error.message}`); }
      await cache.put(key, response);
    }
    await cache.put(COMPLETE, new Response(JSON.stringify({ version: VERSION, assets: CORE.length, savedAt: new Date().toISOString() })));
    const meta = await caches.open(META);
    await meta.put(POINTER, new Response(name));
  } catch (error) {
    await caches.delete(name).catch(() => false);
    throw error;
  }
  // Cleanup must never roll back an already committed snapshot if storage access later fails.
  try {
    const snapshots = (await caches.keys()).filter(key => key.startsWith(PREFIX + 'snapshot-') && key !== name).sort().reverse();
    for (const old of snapshots.slice(1)) await caches.delete(old);
  } catch { /* A complete kit is more important than pruning old copies. */ }
  return await status();
}

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (!['STATUS', 'PREPARE'].includes(event.data?.type) || !event.ports?.[0]) return;
  const reply = event.ports[0];
  event.waitUntil((async () => {
    try {
      if (event.data.type === 'PREPARE') {
        if (!preparing) preparing = prepare().finally(() => { preparing = null; });
        await preparing;
      }
      reply.postMessage({ ok: true, ...(await status()) });
    } catch (error) {
      let previous = { version: VERSION, ready: false, missing: [] };
      try { previous = await status(); } catch { /* Storage can itself be denied. */ }
      reply.postMessage({ ok: false, ...previous, error: error.name === 'QuotaExceededError' ? 'Device storage is full. Free browser storage and prepare again.' : error.message });
    }
  })());
});
self.addEventListener('fetch', event => {
  const key = cacheKey(event.request);
  if (!key) return; // APIs, POSTs, external fonts, microdata and unknown routes remain network-only.
  event.respondWith((async () => {
    const snapshot = await activeSnapshot();
    if (snapshot) {
      const cached = await snapshot.cache.match(key);
      if (cached) return cached;
    }
    // Before preparation, never pretend an unprepared device can operate offline.
    return network(event.request);
  })());
});
