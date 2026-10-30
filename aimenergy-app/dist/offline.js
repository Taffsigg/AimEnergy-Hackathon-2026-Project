const VERSION = 'field-v3';
const listeners = new Set();
let initialized;
let state = { supported: false, ready: false, online: typeof navigator !== 'undefined' ? navigator.onLine : true, version: VERSION, preparing: false, message: 'Offline kit has not been prepared on this device.' };
export function getOfflineStatus() { return { ...state }; }
function publish(patch) {
  state = { ...state, ...patch, online: navigator.onLine };
  for (const listener of listeners) listener(getOfflineStatus());
  return getOfflineStatus();
}
function send(type) {
  return new Promise((resolve, reject) => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) return reject(new Error('Offline worker does not control this page yet. Reload and try again.'));
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Offline preparation timed out. Check your connection and try again.')); }, type === 'PREPARE' ? 360000 : 10000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timer); channel.port1.close();
      if (!data.ok) { const error = new Error(data.error || 'Offline storage is unavailable.'); error.status = data; reject(error); }
      else resolve(data);
    };
    controller.postMessage({ type }, [channel.port2]);
  });
}
function waitForControl() {
  if (navigator.serviceWorker.controller) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onChange = () => { if (navigator.serviceWorker.controller) { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', onChange); resolve(); } };
    const timer = setTimeout(() => { navigator.serviceWorker.removeEventListener('controllerchange', onChange); reject(new Error('Offline worker is activating. Reload this page, then prepare again.')); }, 12000);
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    onChange();
  });
}
async function refresh() {
  try {
    const data = await send('STATUS');
    return publish({ ready: data.ready, version: data.version, message: data.ready ? 'Offline kit ready on this device. Field records stay in this browser until exported.' : data.missing?.length ? `Offline kit incomplete: ${data.missing.join(', ')}. Prepare again while online.` : 'Prepare this device while online before travelling.' });
  } catch (error) { return publish({ ready: false, message: error.message }); }
}
export function initOffline(onChange) {
  if (typeof onChange === 'function') { listeners.add(onChange); onChange(getOfflineStatus()); }
  if (initialized) return initialized;
  initialized = (async () => {
    if (!window.isSecureContext || !('serviceWorker' in navigator) || !('caches' in window)) return publish({ supported: false, message: 'Offline preparation needs HTTPS or localhost and a browser with service worker storage.' });
    publish({ supported: true, message: 'Checking offline kit…' });
    window.addEventListener('online', refresh);
    window.addEventListener('offline', () => publish({ message: state.ready ? 'Offline: prepared kit available. Field records are saved on this device.' : 'Offline: this device has not been prepared. Reconnect to prepare it.' }));
    navigator.serviceWorker.addEventListener('controllerchange', refresh);
    try {
      await navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { scope: './', updateViaCache: 'none' });
      await waitForControl();
      return await refresh();
    } catch (error) {
      // An existing controlling worker remains useful when its update check cannot reach the server.
      if (navigator.serviceWorker.controller) return await refresh();
      return publish({ ready: false, message: `Offline preparation unavailable: ${error.message}` });
    }
  })();
  return initialized;
}
export async function prepareOffline() {
  await initOffline();
  if (!state.supported) throw new Error(state.message);
  if (!navigator.onLine) throw new Error('Reconnect to the internet before preparing this device.');
  publish({ preparing: true, message: 'Saving the app, model and map data for offline use…' });
  try {
    const data = await send('PREPARE');
    return publish({ preparing: false, ready: data.ready, version: data.version, message: 'Offline kit ready on this device. Field records stay in this browser until exported.' });
  } catch (error) {
    publish({ preparing: false, ready: Boolean(error.status?.ready), message: `Offline preparation failed: ${error.message}${error.status?.ready ? ' The previous complete kit remains available.' : ''}` });
    throw error;
  }
}
