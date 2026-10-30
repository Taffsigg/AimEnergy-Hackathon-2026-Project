import { calculateDemand, defaultInputs } from './engine.js';
import { initOffline } from './offline.js';
const $ = selector => document.querySelector(selector);
const fmt = value => value.toLocaleString('en-US', { maximumFractionDigits: 0 });
const menu = $('#menu-toggle'), nav = $('#navigation');
function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); }
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); });
nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { const open = menu.getAttribute('aria-expanded') === 'true'; closeMenu(); if (open) menu.focus(); } });
async function read(name) { const response = await fetch(new URL('./data/' + name, import.meta.url)); if (!response.ok) throw new Error(name); return response.json(); }
function drawMap(geo, selected) {
  const rings = geometry => geometry.type === 'MultiPolygon' ? geometry.coordinates.flatMap(polygon => polygon) : geometry.type === 'Polygon' ? geometry.coordinates : [];
  const points = geo.features.flatMap(feature => rings(feature.geometry).flat());
  const longitudes = points.map(p => p[0]), latitudes = points.map(p => p[1]);
  const west = Math.min(...longitudes), east = Math.max(...longitudes), south = Math.min(...latitudes), north = Math.max(...latitudes);
  const correction = Math.cos((north + south) / 2 * Math.PI / 180), width = (east - west) * correction;
  const scale = Math.min(430 / width, 190 / (north - south));
  const project = p => [(480 - width * scale) / 2 + (p[0] - west) * correction * scale, (208 - (north - south) * scale) / 2 + (north - p[1]) * scale];
  const selectedId = String(selected.id ?? selected.village_id);
  const paths = geo.features.map((feature, index) => {
    const d = rings(feature.geometry).map(ring => ring.map((p, i) => (i ? 'L' : 'M') + project(p).map(x => x.toFixed(2)).join(',')).join(' ') + ' Z').join(' ');
    const color = String(feature.id ?? feature.properties.id) === selectedId ? '#edb86b' : ['#d6e4c4', '#c7d9af', '#bace9f', '#e0e9d1', '#adc78f'][index % 5];
    return '<path d="' + d + '" fill="' + color + '" stroke="#f2f5e9" stroke-width=".65"/>';
  }).join('');
  const [x, y] = project([selected.longitude, selected.latitude]);
  $('#village-map').innerHTML = '<defs><pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#dce5d1" stroke-width=".5"/></pattern></defs><rect width="480" height="208" fill="url(#map-grid)"/>' + paths + '<circle cx="' + x + '" cy="' + y + '" r="10" fill="#e4b66c" opacity=".25"/><circle cx="' + x + '" cy="' + y + '" r="4" fill="#e0aa52" stroke="#fff" stroke-width="1.5"/>';
}
async function preview() {
  try {
    const [data, geo, ramp] = await Promise.all([read('sites.json'), read('boundaries.geojson'), read('ramp-profiles.json')]);
    const site = (Array.isArray(data) ? data : data.sites).find(item => item.name === 'Orii Gangodye');
    if (!site) throw new Error('Demonstration site unavailable');
    const templates = Object.fromEntries(Object.entries(ramp.profiles).map(([key, value]) => [key, value.hourlyShares]));
    const inputs = { ...defaultInputs(site), millCount: 0, refrigerationCount: 0, salonCount: 0, weldingCount: 0 };
    const base = calculateDemand(site, inputs, templates);
    let mill = false;
    drawMap(geo, site);
    function render() {
      const result = calculateDemand(site, { ...inputs, millCount: mill ? 1 : 0 }, templates);
      $('#preview-energy').textContent = fmt(result.firstMonth.totalKWh);
      $('#preview-connections').textContent = fmt(result.firstMonth.connections);
      const values = result.dailyProfile.map(item => item.totalKW), baseline = base.dailyProfile.map(item => item.totalKW);
      const max = Math.max(...values, ...baseline, 1) * 1.14;
      const path = numbers => numbers.map((value, i) => (i ? 'L' : 'M') + (i * 420 / 23).toFixed(2) + ',' + (72 - value / max * 65).toFixed(2)).join(' ');
      $('#preview-chart').innerHTML = '<path d="M0 72H420M0 40H420M0 8H420" stroke="#edf1e7" fill="none"/><path d="' + path(values) + ' L420 78 L0 78Z" fill="#e6f0da"/>' + (mill ? '<path d="' + path(baseline) + '" fill="none" stroke="#b5c6a5" stroke-dasharray="3 3"/>' : '') + '<path d="' + path(values) + '" fill="none" stroke="#5a8048" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      $('#mill-toggle').setAttribute('aria-pressed', String(mill));
      $('#preview-status').textContent = mill ? 'Hypothetical mill · 7.5 kW × 3 hours × 22 days · scenario, not measured demand' : 'Planning assumptions · 60% uptake · 20 kWh / household / month';
    }
    $('#mill-toggle').disabled = false;
    $('#mill-toggle').addEventListener('click', () => { mill = !mill; render(); });
    render();
  } catch {
    $('#preview-status').textContent = 'Preview unavailable on this connection. Open the prototype to inspect the inputs.';
    $('#village-map').innerHTML = '<text x="240" y="104" text-anchor="middle" fill="#708474" font-size="13">Explore Lamwo in the prototype</text>';
  }
}
preview();
// Update the controller; saving an offline snapshot remains an explicit field action.
initOffline();
