import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { calculateDemand, defaultInputs } from './dist/engine.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BODY_LIMIT = 64 * 1024;
const MIME = { '.webmanifest':'application/manifest+json; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const LIMITATION = 'Household predictions concern a survey payment-derived consumption proxy. Village low/base/high demand values are uncalibrated planning scenarios, not calibrated prediction intervals or metered-site validation.';
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const problem = (status, message) => Object.assign(new Error(message), { status });
function json(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(payload));
}
function exactKeys(value, keys, label) {
  if (!object(value)) throw problem(400, `${label} must be a JSON object.`);
  if (Object.keys(value).some(key => !keys.includes(key))) throw problem(400, `${label} contains an unsupported field.`);
}
async function readJSON(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw problem(415, 'Use Content-Type: application/json.');
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') throw problem(415, 'Compressed request bodies are unsupported.');
  if (Number(req.headers['content-length']) > BODY_LIMIT) { req.resume(); throw problem(413, 'Request body exceeds 64 KiB.'); }
  return new Promise((resolve, reject) => {
    const buffers = [];
    let length = 0, exceeded = false;
    req.on('data', chunk => {
      length += chunk.length;
      if (exceeded) return;
      if (length > BODY_LIMIT) {
        exceeded = true; buffers.length = 0;
        reject(problem(413, 'Request body exceeds 64 KiB.')); return;
      }
      buffers.push(chunk);
    });
    req.on('error', () => reject(problem(400, 'Request body could not be read.')));
    req.on('end', () => {
      if (exceeded) return;
      try { resolve(JSON.parse(Buffer.concat(buffers).toString('utf8'))); }
      catch { reject(problem(400, 'Request body must contain valid JSON.')); }
    });
  });
}
function validateFeatures(features, artifact) {
  const schema = artifact.feature_schema;
  exactKeys(features, schema.map(feature => feature.name), 'features');
  for (const field of schema) {
    if (!own(features, field.name)) continue;
    const value = features[field.name];
    if (field.options?.length) {
      if (!field.options.some(option => option.value === value)) throw problem(400, `features.${field.name} must match a listed option.`);
    } else if (typeof value !== 'number' || !Number.isFinite(value) || ((field.physical_min ?? field.min) !== undefined && value < (field.physical_min ?? field.min)) || ((field.physical_max ?? field.max) !== undefined && value > (field.physical_max ?? field.max))) {
      throw problem(400, `features.${field.name} must be a finite number within its declared range.`);
    }
  }
}
function modelMetadata(artifact) {
  // Deliberate allowlist: no training rows, tree internals, or source file paths.
  return Object.fromEntries(['schema_version', 'model_id', 'title', 'target', 'feature_schema', 'calibration', 'limitations', 'evaluation_file', 'evaluationref'].filter(key => own(artifact, key)).map(key => [key, artifact[key]]));
}
async function loadRuntime(staticDir, modelPath) {
  let artifact = null, predict = null, ramp = null;
  try {
    const candidate = JSON.parse(await readFile(modelPath, 'utf8'));
    const module = await import(pathToFileURL(path.join(staticDir, 'ml-model.js')).href);
    if (!Array.isArray(candidate.feature_schema) || !candidate.feature_schema.length || typeof module.predictHousehold !== 'function') throw new Error('Invalid model contract');
    const probe = module.predictHousehold({}, candidate);
    if (!Number.isFinite(probe.prediction)) throw new Error('Invalid model prediction');
    artifact = candidate; predict = module.predictHousehold;
  } catch { /* Incomplete ML builds still serve planning and health endpoints. */ }
  try { ramp = JSON.parse(await readFile(path.join(staticDir, 'data', 'ramp-profiles.json'), 'utf8')); } catch { /* Explicit engine fallback shapes. */ }
  const profiles = Object.fromEntries(Object.entries(ramp?.profiles || {}).map(([key, value]) => [key, value.hourlyShares]));
  return { artifact, predict, profiles, provenance: ramp?.provenance || { engine: 'Explicit assumed profiles', calibrated: false } };
}

/** Build an unbound server; tests and embedding callers can listen on port 0. */
export async function createServer({ staticDir = path.join(ROOT, 'dist'), modelPath = path.join(staticDir, 'data', 'ml-model.json'), rateLimit = 120, rateWindowMs = 60_000, maxRateClients = 1000 } = {}) {
  const base = await realpath(staticDir);
  const runtime = await loadRuntime(base, modelPath);
  const clients = new Map();
  const predict = features => {
    if (!runtime.artifact) throw problem(503, 'Household model is unavailable. Build the model artifact and restart the server.');
    validateFeatures(features, runtime.artifact);
    const result = runtime.predict(features, runtime.artifact);
    if (!Number.isFinite(result.prediction)) throw problem(503, 'Household model did not produce a valid prediction.');
    return result;
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    try {
      const rawPath = (req.url || '/').split('?')[0];
      let pathname;
      try { pathname = decodeURIComponent(rawPath); } catch { throw problem(400, 'Malformed URL encoding.'); }
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(segment => segment === '..' || segment.startsWith('.'))) throw problem(404, 'Not found.');
      if (pathname.startsWith('/api/')) {
        const now = Date.now();
        for (const [key, record] of clients) if (record.until <= now) clients.delete(key);
        const key = req.socket.remoteAddress || 'unknown';
        let record = clients.get(key);
        if (!record) {
          if (clients.size >= maxRateClients) throw problem(429, 'Too many clients. Retry later.');
          record = { count: 0, until: now + rateWindowMs }; clients.set(key, record);
        }
        if (++record.count > rateLimit) { res.setHeader('Retry-After', String(Math.max(1, Math.ceil((record.until - now) / 1000)))); throw problem(429, 'Rate limit exceeded. Retry later.'); }
        const readOnly = ['/api/health', '/api/model'].includes(pathname);
        const write = ['/api/predict', '/api/forecast'].includes(pathname);
        if (!readOnly && !write) throw problem(404, 'API endpoint not found.');
        if ((readOnly && !['GET', 'HEAD'].includes(req.method)) || (write && req.method !== 'POST')) {
          res.setHeader('Allow', readOnly ? 'GET, HEAD' : 'POST'); throw problem(405, 'Method not allowed.');
        }
        if (pathname === '/api/health') return json(res, 200, { status: 'ok', service: 'AimEnergy', modelReady: Boolean(runtime.artifact), planningReady: true, profiles: runtime.provenance.engine });
        if (pathname === '/api/model') {
          if (!runtime.artifact) throw problem(503, 'Household model is unavailable.');
          return json(res, 200, { ready: true, ...modelMetadata(runtime.artifact), limitation: LIMITATION });
        }
        const body = await readJSON(req);
        if (pathname === '/api/predict') {
          exactKeys(body, ['features'], 'body');
          return json(res, 200, { ...predict(body.features), evidenceScope: 'household survey proxy', limitation: LIMITATION });
        }
        exactKeys(body, ['site', 'inputs', 'householdFeatures'], 'body');
        exactKeys(body.site, ['id', 'name', 'country', 'latitude', 'longitude', 'population', 'schoolCount', 'clinicCount', 'schools', 'clinics', 'millCount', 'refrigerationCount', 'salonCount', 'weldingCount'], 'site');
        if (typeof body.site.population !== 'number' || !Number.isFinite(body.site.population) || body.site.population < 0 || body.site.population > 1e9) throw problem(400, 'site.population must be a finite number from 0 to 1000000000.');
        for (const [key, value] of Object.entries(body.site)) {
          if (['id', 'name', 'country'].includes(key)) { if (!['string', 'number'].includes(typeof value) || String(value).length > 200) throw problem(400, `site.${key} is invalid.`); }
          else if (typeof value !== 'number' || !Number.isFinite(value) || (!['latitude', 'longitude'].includes(key) && value < 0)) throw problem(400, `site.${key} must be a finite number.`);
        }
        const inputs = body.inputs ?? {};
        exactKeys(inputs, Object.keys(defaultInputs(body.site)), 'inputs');
        if (Object.values(inputs).some(value => typeof value !== 'number' || !Number.isFinite(value))) throw problem(400, 'inputs values must be finite numbers.');
        const householdPrediction = own(body, 'householdFeatures') ? predict(body.householdFeatures) : null;
        const assumptions = { ...inputs, ...(householdPrediction ? { householdKWhPerMonth: householdPrediction.prediction } : {}) };
        const forecast = calculateDemand(body.site, assumptions, runtime.profiles);
        return json(res, 200, { ...forecast, householdPrediction, profileProvenance: runtime.provenance, evidenceScope: 'uncalibrated village planning scenarios', limitation: LIMITATION });
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); throw problem(405, 'Method not allowed.'); }
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!own(MIME, path.extname(relative).toLowerCase())) throw problem(404, 'Not found.');
      const target = path.resolve(base, relative);
      if (!target.startsWith(base + path.sep)) throw problem(404, 'Not found.');
      let resolved, info;
      try { resolved = await realpath(target); info = await stat(resolved); } catch { throw problem(404, 'Not found.'); }
      if (!resolved.startsWith(base + path.sep) || !info.isFile()) throw problem(404, 'Not found.');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(relative).toLowerCase()], 'Content-Length': info.size });
      res.end(req.method === 'HEAD' ? undefined : await readFile(resolved));
    } catch (error) {
      if (res.headersSent) return res.end();
      json(res, error.status || 500, { error: error.status ? error.message : 'Internal server error.' });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const server = await createServer();
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.listen(port, host, () => console.log(`AimEnergy ready at http://${host}:${port}`));
}
