import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
function worker() {
  const stores = new Map(), handlers = new Map();
  let failedPath = null, generation = 'first';
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async match(key) { return entries.get(typeof key === 'string' ? key : key.url)?.clone(); },
        async put(key, response) { entries.set(typeof key === 'string' ? key : key.url, response.clone()); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const context = vm.createContext({
    URL, Request, Response, AbortController, setTimeout, clearTimeout, caches,
    fetch: async request => {
      if (new URL(request.url).pathname === failedPath) return new Response('missing', { status: 404 });
      return new Response(`${generation}:${new URL(request.url).pathname}`);
    },
    self: { location: { href: 'https://example.test/kit/sw.js' }, clients: { claim: async () => {} }, skipWaiting: async () => {}, addEventListener(type, callback) { handlers.set(type, callback); } },
  });
  vm.runInContext(source + '\nglobalThis.policy = {cacheKey, status, prepare, activeSnapshot, CORE, PREFIX, META, POINTER, COMPLETE};', context);
  return { ...context.policy, handlers, stores, caches, fail(path) { failedPath = path; }, generation(value) { generation = value; } };
}

test('offline fallback permits only exact known same-origin static GET paths', () => {
  const w = worker();
  const key = (path, method = 'GET') => w.cacheKey(new Request(new URL(path, 'https://example.test/kit/'), { method }));
  assert.equal(key('./'), 'https://example.test/kit/index.html');
  assert.equal(key('planner.html'), 'https://example.test/kit/planner.html');
  assert.equal(key('planner.html#field'), 'https://example.test/kit/planner.html');
  assert.equal(key('./#evidence'), 'https://example.test/kit/index.html');
  assert.equal(key('landing.js'), 'https://example.test/kit/landing.js');
  assert.equal(key('images/field-assessment.jpg'), 'https://example.test/kit/images/field-assessment.jpg');
  assert.equal(key('remote-lab.js'), 'https://example.test/kit/remote-lab.js');
  assert.equal(key('images/satellite-orii-gangodye-2024.jpg'), 'https://example.test/kit/images/satellite-orii-gangodye-2024.jpg');
  assert.equal(key('images/drone-survey-concept.png'), 'https://example.test/kit/images/drone-survey-concept.png');
  assert.equal(key('data/ml-model.json'), 'https://example.test/kit/data/ml-model.json');
  for (const path of ['/api/predict', '/api/health', 'data/household-microdata.json', 'data/sites.json?refresh=1', '/other/index.html', 'https://fonts.googleapis.com/css2']) assert.equal(key(path), null, path);
  assert.equal(key('app.js', 'POST'), null);
  assert.ok(w.CORE.includes('https://example.test/kit/field-core.js'));
  assert.ok(w.CORE.includes('https://example.test/kit/metered-lab.js'));
  assert.ok(w.CORE.includes('https://example.test/kit/data/metered-evidence.json'));
  assert.ok(w.CORE.includes('https://example.test/kit/drc-lab.js'));
  assert.ok(w.CORE.includes('https://example.test/kit/data/drc-benchmark.json'));
  assert.ok(w.CORE.includes('https://example.test/kit/community-core.js'));
  assert.ok(w.CORE.includes('https://example.test/kit/community-lab.js'));
  assert.ok(w.CORE.includes('https://example.test/kit/community-lab.css'));
  assert.equal(key('Data/raw/metered/tanzania/source.txt'), null);
  assert.ok(w.CORE.includes('https://example.test/kit/field-lab.css'));
});

test('install does not claim offline readiness or download files', async () => {
  const w = worker(); let completion;
  w.handlers.get('install')({ waitUntil(promise) { completion = promise; } });
  await completion;
  assert.equal((await w.status()).ready, false);
  assert.equal((await w.caches.keys()).filter(name => name.includes('snapshot')).length, 0);
});

test('only complete snapshots become active; failed refresh preserves previous model and app', async () => {
  const w = worker();
  assert.equal((await w.prepare()).ready, true);
  const first = await w.activeSnapshot();
  assert.equal(await (await first.cache.match('https://example.test/kit/data/ml-model.json')).text(), 'first:/kit/data/ml-model.json');
  w.generation('second'); w.fail('/kit/data/ml-model.json');
  await assert.rejects(w.prepare(), /Could not save.*ml-model.json.*HTTP 404/);
  assert.equal((await w.activeSnapshot()).name, first.name);
  assert.equal((await w.status()).ready, true);
  assert.equal((await w.caches.keys()).filter(name => name.includes('snapshot')).length, 1);
  w.fail(null);
  assert.equal((await w.prepare()).ready, true);
  const second = await w.activeSnapshot();
  assert.notEqual(second.name, first.name);
  assert.equal(await (await second.cache.match('https://example.test/kit/app.js')).text(), 'second:/kit/app.js');
  assert.equal(await (await second.cache.match('https://example.test/kit/data/ml-model.json')).text(), 'second:/kit/data/ml-model.json');
});

test('evicted asset removes ready status and APIs never enter respondWith', async () => {
  const w = worker();
  await w.prepare();
  const snapshot = await w.activeSnapshot();
  w.stores.get(snapshot.name).delete('https://example.test/kit/engine.js');
  const status = await w.status();
  assert.equal(status.ready, false);
  assert.deepEqual([...status.missing], ['/kit/engine.js']);
  for (const path of ['/api/predict', '/api/health', '/kit/data/private-survey.csv']) {
    w.handlers.get('fetch')({ request: new Request(`https://example.test${path}`), respondWith() { assert.fail(`intercepted ${path}`); } });
  }
});

test('prepared requests use one committed snapshot even with newer network assets', async () => {
  const w = worker(); await w.prepare(); w.generation('new-deployment');
  let response;
  w.handlers.get('fetch')({ request: new Request('https://example.test/kit/app.js'), respondWith(promise) { response = promise; } });
  assert.equal(await (await response).text(), 'first:/kit/app.js');
});
