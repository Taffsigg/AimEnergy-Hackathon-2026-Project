/** Local evidence validation. No electricity inference or network requests. */
export const MAX_IMPORT_BYTES = 1_000_000;
const text = (value, label, max = 240) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(label + ' is required (up to ' + max + ' characters).');
  return value.trim();
};
export function observationDate(value, now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter an observation date as YYYY-MM-DD.');
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value > now.toISOString().slice(0, 10)) throw new Error('Observation date must be valid and not in the future.');
  return value;
}
export function boundsFromInput(values) {
  if (!Array.isArray(values) || values.length !== 4 || values.some(v => (typeof v === 'string' && !v.trim()) || v === null || typeof v === 'boolean')) throw new Error('Provide west, south, east and north in WGS84 degrees.');
  const bounds = values.map(Number);
  if (!bounds.every(Number.isFinite) || bounds[0] < -180 || bounds[2] > 180 || bounds[1] < -90 || bounds[3] > 90 || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) throw new Error('Bounds must satisfy −180 ≤ west < east ≤ 180 and −90 ≤ south < north ≤ 90. Antimeridian extents are not supported.');
  return bounds;
}
export function validateSurvey(value, metadata, now = new Date()) {
  const source = text(metadata.source, 'Survey source');
  const observed_on = observationDate(metadata.observed_on, now);
  if (!value || value.type !== 'FeatureCollection' || !Array.isArray(value.features) || !value.features.length || value.features.length > 2000) throw new Error('Use a GeoJSON FeatureCollection with 1–2,000 features.');
  if (value.crs) throw new Error('Reproject to standard WGS84 GeoJSON (longitude, latitude) without a custom crs field.');
  let vertices = 0;
  const extent = [Infinity, Infinity, -Infinity, -Infinity];
  function point(p) {
    if (!Array.isArray(p) || p.length < 2 || p.length > 3 || !p.every(v => typeof v === 'number' && Number.isFinite(v)) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw new Error('Coordinates must be numeric WGS84 longitude/latitude.');
    if (++vertices > 50000) throw new Error('Simplify the survey to at most 50,000 vertices.');
    extent[0] = Math.min(extent[0], p[0]); extent[1] = Math.min(extent[1], p[1]); extent[2] = Math.max(extent[2], p[0]); extent[3] = Math.max(extent[3], p[1]);
    return p.slice(0, 2);
  }
  function ring(r) {
    if (!Array.isArray(r) || r.length < 4) throw new Error('Polygon rings need at least four positions.');
    const result = r.map(point);
    if (result[0][0] !== result.at(-1)[0] || result[0][1] !== result.at(-1)[1]) throw new Error('Polygon rings must be closed.');
    return result;
  }
  function polygon(p) { if (!Array.isArray(p) || !p.length) throw new Error('Empty polygon.'); return p.map(ring); }
  const features = value.features.map((feature, index) => {
    if (feature?.type !== 'Feature' || !feature.geometry || feature.geometry.crs) throw new Error('Each feature needs a supported WGS84 geometry.');
    const { type, coordinates } = feature.geometry;
    let clean;
    if (type === 'Point') clean = point(coordinates);
    else if (type === 'Polygon') clean = polygon(coordinates);
    else if (type === 'MultiPolygon' && Array.isArray(coordinates) && coordinates.length) clean = coordinates.map(polygon);
    else throw new Error('Supported survey geometry: Point, Polygon or MultiPolygon.');
    const categories = ['building', 'school', 'clinic', 'mill', 'other'];
    const category = categories.includes(feature.properties?.category) ? feature.properties.category : 'other';
    return { type: 'Feature', id: index + 1, geometry: { type, coordinates: clean }, properties: { category } };
  });
  return { type: 'FeatureCollection', features, source, observed_on, bounds: extent, feature_count: features.length, polygon_features: features.filter(f => f.geometry.type !== 'Point').length, vertices, interpretation: 'User-provided survey features; categories are annotations, not AI detections or verified buildings. Altitude is omitted. No demand inputs are changed.' };
}
export function parseBuildingHistory(csv, source, now = new Date()) {
  text(source, 'History source');
  if (typeof csv !== 'string' || csv.length > 100000) throw new Error('Use a small CSV with year,building_count columns.');
  const rows = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(row => row.trim());
  if (rows.length < 3 || rows.length > 102 || rows[0].trim() !== 'year,building_count') throw new Error('Use header year,building_count and 2–100 annual rows.');
  const years = new Set();
  const records = rows.slice(1).map(row => {
    const fields = row.split(',').map(v => v.trim());
    if (fields.length !== 2 || fields.some(v => !v)) throw new Error('Each row needs exactly a year and numeric count.');
    const [year, building_count] = fields.map(Number);
    if (!Number.isInteger(year) || year < 1900 || year > now.getUTCFullYear() || years.has(year) || !Number.isFinite(building_count) || building_count < 0 || building_count > 1e9) throw new Error('Years must be unique, between 1900 and this year; counts must be nonnegative numbers.');
    years.add(year); return { year, building_count };
  }).sort((a, b) => a.year - b.year);
  return { records, source: source.trim(), status: 'user_imported', unit: 'user_provided_building_estimates', interpretation: 'Imported annual estimates; not independently verified or used as electricity growth.' };
}
export function growthSummary(records) {
  if (!Array.isArray(records) || records.length < 2) return null;
  const first = records[0], last = records.at(-1), change = last.building_count - first.building_count;
  return { start: first.year, end: last.year, change, percent: first.building_count > 0 ? change / first.building_count * 100 : null };
}
export function rasterHeader(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 24 || bytes.length > 2 * 1024 * 1024) throw new Error('Use a PNG or JPEG image no larger than 2 MB.');
  let width, height, mime;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if ([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v) && bytes[12]===73 && bytes[13]===72 && bytes[14]===68 && bytes[15]===82) {
    width=view.getUint32(16); height=view.getUint32(20); mime='image/png';
  } else if (bytes[0]===255 && bytes[1]===216) {
    let offset=2;
    while(offset+4<bytes.length) {
      if(bytes[offset]!==255) break;
      while(bytes[offset]===255) offset++;
      const marker=bytes[offset++];
      if(marker===217||marker===218) break;
      if(marker===1||(marker>=208&&marker<=215)) continue;
      if(offset+2>bytes.length) break;
      const length=view.getUint16(offset);
      if(length<2||offset+length>bytes.length) break;
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=8) { height=view.getUint16(offset+3); width=view.getUint16(offset+5); mime='image/jpeg'; break; }
      offset+=length;
    }
  }
  if(!mime||!width||!height||width>12000||height>12000||width*height>20_000_000) throw new Error('Use a valid PNG/JPEG with at most 20 million pixels and 12,000 pixels per side. GeoTIFF must be exported to a web image first.');
  return {width,height,mime};
}
export function rasterDataUrl(value) {
  if(typeof value!=='string'||value.length>2_900_000||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value))throw new Error('Invalid saved raster image.');
  const encoded=value.slice(value.indexOf(',')+1);
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  const header=rasterHeader(bytes);
  if(!value.startsWith('data:'+header.mime+';base64,'))throw new Error('Saved image type does not match its bytes.');
  return {bytes,header};
}
