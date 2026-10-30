import { MAX_IMPORT_BYTES, validateSurvey, parseBuildingHistory, growthSummary, boundsFromInput, observationDate, rasterHeader, rasterDataUrl } from './remote-core.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (value,d=1) => Number(value).toLocaleString('en-US',{maximumFractionDigits:d});
let context, manifest={sites:[]}, tab='satellite', yearIndex=null, message='', memoryOnly=false;
let showBoundary=true, showSurvey=true, showOrtho=true;
const records=new Map(), removed=new Map();
const draft={source:'',observed_on:'',west:'',south:'',east:'',north:'',historySource:''};
const current=()=>context.getContext();
const key=()=>String(current().site.id ?? current().site.village_id);
const entry=()=>records.get(key())||{};
const source=()=>manifest.sites.find(s=>String(s.site_id)===key());
const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?esc(u.href):'#';}catch{return '#';}};
function save() {
  try { localStorage.setItem('aimenergy.remote.v1',JSON.stringify([...records].map(([id,value])=>({id,value})))); memoryOnly=false; }
  catch { memoryOnly=true; message='Browser storage is full or unavailable. Imports remain in memory; export evidence before leaving.'; }
}
function redraw(){context.render();}
function download(name,value,type='application/json'){const url=URL.createObjectURL(new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
export async function initRemoteLab(options,data) {
  context=options; manifest=data&&Array.isArray(data.sites)?data:{sites:[]};
  try {
    const saved=JSON.parse(localStorage.getItem('aimenergy.remote.v1')||'[]');
    if(!Array.isArray(saved))throw new Error('Invalid saved records');
    for(const item of saved) {
      if(!item||typeof item!=='object'||typeof item.id!=='string'||item.id.length>150||!item.value)continue;
      try {
        const clean={};const v=item.value;
        if(v.survey)clean.survey={...validateSurvey(v.survey,{source:v.survey.source,observed_on:v.survey.observed_on}),file_name:String(v.survey.file_name||'').slice(0,180),sha256:String(v.survey.sha256||'').slice(0,64)};
        if(v.history)clean.history=parseBuildingHistory('year,building_count\n'+v.history.records.map(r=>r.year+','+r.building_count).join('\n'),v.history.source);
        if(v.ortho){
          if(typeof v.ortho.source!=='string'||!v.ortho.source.trim()||v.ortho.source.length>240)throw new Error('Invalid saved image source');
          const {bytes,header}=rasterDataUrl(v.ortho.data_url);
          const decoded=await createImageBitmap(new Blob([bytes],{type:header.mime}));
          const valid=decoded.width===header.width&&decoded.height===header.height;decoded.close();if(!valid)throw new Error('Invalid saved dimensions');
          clean.ortho={data_url:v.ortho.data_url,bounds:boundsFromInput(v.ortho.bounds),source:v.ortho.source,observed_on:observationDate(v.ortho.observed_on),sha256:String(v.ortho.sha256||'').slice(0,64)};
        }
        records.set(item.id,clean);
      } catch { /* Invalid records are never rendered as trusted geometry. */ }
    }
  } catch {memoryOnly=true;message='Saved remote-evidence records could not be read. New imports can be exported locally.';}
  document.addEventListener('input',event=>{if(event.target.dataset.remoteField)draft[event.target.dataset.remoteField]=event.target.value;});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-remote]');if(button)action(button.dataset.remote,button);});
}
function svgMap() {
  const data=source(), local=entry(), image=data?.imagery?.status==='available'?data.imagery:null;
  const bounds=image?.bounds||local.ortho?.bounds||local.survey?.bounds||data?.bounds;
  if(!bounds)return '<div class="remote-empty"><h3>No imagery acquired for this location.</h3><p>The dated satellite example covers Orii Gangodye. Import your own WGS84 survey or open the pilot example.</p><button class="btn" data-remote="pilot">Open Orii Gangodye satellite evidence →</button></div>';
  let [w,s,e,n]=bounds;
  if(w===e){w-=.001;e+=.001;}if(s===n){s-=.001;n+=.001;}
  const project=p=>[(p[0]-w)/(e-w)*900,(n-p[1])/(n-s)*630];
  function geometry(g,color,fill='none') {
    if(!g)return '';
    if(g.type==='Point'){const p=project(g.coordinates);return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="'+color+'" stroke="white" stroke-width="1.5"/>';}
    const rings=g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flatMap(p=>p):[];
    const d=rings.map(r=>r.map((p,i)=>(i?'L':'M')+project(p).map(v=>v.toFixed(2)).join(',')).join(' ')+'Z').join(' ');
    return '<path d="'+d+'" stroke="'+color+'" stroke-width="2" vector-effect="non-scaling-stroke" fill="'+fill+'" fill-rule="evenodd"/>';
  }
  function raster(item){const b=item.bounds;const [x,y]=project([b[0],b[3]]),[right,bottom]=project([b[2],b[1]]);return '<image href="'+esc(item.data_url||item.image_path)+'" x="'+x+'" y="'+y+'" width="'+(right-x)+'" height="'+(bottom-y)+'" preserveAspectRatio="none"/>';}
  const overlay=local.survey&&showSurvey?local.survey.features.map(f=>geometry(f.geometry,'#c5ed80','#c5ed8030')).join(''):'';
  return '<svg class="remote-map" viewBox="0 0 900 630" role="img" aria-label="Georeferenced evidence map for '+esc(current().site.name)+'">'+(image?raster(image):'<rect width="900" height="630" fill="#e9eee2"/>')+(local.ortho&&showOrtho?raster(local.ortho):'')+(showBoundary?geometry(current().boundary?.geometry,'#ffc46b'):'' )+overlay+'</svg><div class="remote-map-note">'+(local.ortho&&showOrtho?'User-provided drone image overlay':image?'2024 annual Sentinel-2 mosaic · nominal 10 m':'User-provided survey extent · no satellite backdrop')+'</div>';
}
function pilotButton(){return !source()?'<button class="btn" data-remote="pilot">Open the Orii Gangodye example →</button>':'';}
function satelliteView() {
  const data=source(), image=data?.imagery;
  return '<div class="remote-layout"><section class="panel"><div class="panel-head"><div><h2>Look at the place behind the numbers.</h2><p class="subtext">'+esc(current().site.name)+' · dated context, separate from demand inputs</p></div></div><div class="remote-map-wrap">'+svgMap()+'</div><div class="remote-map-controls"><label><input type="checkbox" data-remote="boundary" '+(showBoundary?'checked':'')+'> Village boundary</label><label><input type="checkbox" data-remote="survey-layer" '+(showSurvey?'checked':'')+'> Imported survey</label><label><input type="checkbox" data-remote="ortho-layer" '+(showOrtho?'checked':'')+'> Drone image</label></div><div class="remote-body">'+(image?.status==='available'?'<p><strong>Source:</strong> <a href="https://cloudless.eox.at" target="_blank" rel="noopener noreferrer">EOxCloudless</a> by <a href="https://eox.at" target="_blank" rel="noopener noreferrer">EOX IT Services GmbH</a>. Contains modified Copernicus Sentinel data 2024.</p><p>2024 annual mosaic, not a single acquisition date or a current survey. Nominal 10 m imagery provides landscape context; individual small roofs cannot be counted reliably here.</p><p><a href="'+safeUrl(image.license_url)+'" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a> · included for a noncommercial demo. Commercial use needs suitable permission or replacement imagery.</p>':'<p>Automatic imagery coverage is limited to the acquired pilot example. Other selected villages remain available in the planner, without an invented satellite layer.</p>')+'</div></section><aside class="panel"><div class="panel-head"><h2>What to investigate next</h2></div><div class="remote-body"><ol class="remote-questions"><li>Which mapped structures are occupied?</li><li>Which buildings are homes, businesses or services?</li><li>Have new buildings appeared since the source year?</li><li>What equipment, operating hours and connection interest can a field team confirm?</li></ol><p>Buildings, households and electricity customers are different quantities. This view does not infer business activity or change energy assumptions automatically.</p><button class="btn primary" data-remote="field">Continue to field assessment →</button>'+pilotButton()+'</div></aside></div>';
}
function buildingView() {
  const local=entry().history, published=source()?.building_history;
  const history=local||(published?.status==='available'?published:null), rows=history?.records||[];
  if(rows.length<2)return '<section class="panel"><div class="panel-head"><h2>Building change needs dated observations.</h2></div><div class="remote-body"><div class="remote-empty"><h3>No annual counts have been acquired for this location.</h3><p>Google Open Buildings Temporal offers 2016–2023 estimates, but no village-level aggregation was completed for this prototype. This is a data gap, not evidence of zero growth.</p><a href="https://sites.research.google/gr/open-buildings/temporal" target="_blank" rel="noopener noreferrer">Read the original dataset →</a></div>'+historyForm()+'</div></section>';
  const selected=rows[Math.min(yearIndex??rows.length-1,rows.length-1)], summary=growthSummary(rows), max=Math.max(1,...rows.map(r=>r.building_count));
  const x=year=>40+(year-rows[0].year)/(rows.at(-1).year-rows[0].year)*720;
  const path=rows.map((r,i)=>(i?'L':'M')+x(r.year)+','+(190-r.building_count/max*150)).join(' ');
  return '<section class="panel"><div class="panel-head"><div><h2>Inspect the settlement’s recorded change.</h2><p class="subtext">'+esc(history.source||'Published annual estimates')+' · '+(local?'user-imported, not independently verified':'published estimates')+'</p></div></div><div class="remote-body"><div class="remote-stats"><div><span>Selected year</span><strong>'+selected.year+'</strong></div><div><span>Building-count estimate</span><strong>'+fmt(selected.building_count)+'</strong></div><div><span>'+summary.start+' → '+summary.end+'</span><strong>'+(summary.change>=0?'+':'')+fmt(summary.change)+'</strong></div></div><svg class="remote-history-chart" viewBox="0 0 800 225" role="img" aria-label="Imported annual building estimates"><path d="'+path+'" fill="none" stroke="#41694a" stroke-width="3"/>'+rows.map(r=>'<circle cx="'+x(r.year)+'" cy="'+(190-r.building_count/max*150)+'" r="'+(r===selected?6:3)+'" fill="#729e49"/><text x="'+x(r.year)+'" y="215" text-anchor="middle">'+r.year+'</text>').join('')+'</svg><label for="remote-year">Select a count-observation year; the satellite mosaic remains 2024</label><input id="remote-year" type="range" data-remote="year" min="0" max="'+(rows.length-1)+'" step="1" value="'+rows.indexOf(selected)+'"><p>Count change is context for field questions. It does not measure occupied households, customer uptake or electricity-demand growth. Fractional raster estimates and reductions are retained.</p>'+historyForm()+'</div></section>';
}
function historyForm(){return '<div class="remote-import"><h3>Import your own annual estimates</h3><p>CSV columns: <code>year,building_count</code>. Supply at least two years and identify the source. Values remain reported estimates.</p><label for="remote-history-source">Source / method</label><input id="remote-history-source" data-remote-field="historySource" maxlength="240" value="'+esc(draft.historySource)+'" placeholder="Dataset and aggregation method, or survey reference"><label for="remote-history-file">Annual counts CSV · up to 100 KB</label><input id="remote-history-file" type="file" accept=".csv,text/csv"><div class="remote-buttons"><button class="btn" data-remote="history-import">Import annual counts</button><button class="btn" data-remote="history-template">Download empty CSV template</button></div></div>';}
function droneView(){const local=entry();return '<div class="remote-layout"><section class="panel"><div class="panel-head"><h2>Bring a completed survey into the conversation.</h2></div><div class="remote-body"><p>Import processed WGS84 survey features or a georeferenced web image. Imports are attached to the selected village shown above. Files stay in this browser; no upload or flight control is performed. The drone artwork above is not survey evidence.</p><div class="remote-two"><div><label for="remote-source">Survey source / method</label><input id="remote-source" data-remote-field="source" maxlength="240" value="'+esc(draft.source)+'" placeholder="Operator-approved survey reference"></div><div><label for="remote-date">Flight / observation date</label><input id="remote-date" data-remote-field="observed_on" type="date" value="'+esc(draft.observed_on)+'"></div></div><div class="remote-import"><h3>1. Survey features</h3><p>GeoJSON FeatureCollection, longitude/latitude. Up to 2,000 features, 50,000 vertices and 1 MB. Point, Polygon and MultiPolygon supported. Optional <code>category</code>: building, school, clinic, mill or other. Categories are supplied annotations.</p><label for="remote-survey-file">Survey GeoJSON</label><input id="remote-survey-file" type="file" accept=".geojson,.json,application/geo+json,application/json"><div class="remote-buttons"><button class="btn primary" data-remote="survey-import">Import survey features</button><button class="btn" data-remote="survey-template">Download empty GeoJSON template</button></div></div><div class="remote-import"><h3>2. Optional orthomosaic image</h3><p>Export the processed survey to PNG/JPEG first. Up to 2 MB / 20 million pixels. Enter its exact WGS84 extent; the app trusts your georeferencing and does not verify positional accuracy. Raw flight photos and GeoTIFF processing belong in tools such as OpenDroneMap.</p><label for="remote-raster-file">Processed PNG / JPEG</label><input id="remote-raster-file" type="file" accept="image/png,image/jpeg"><div class="remote-bounds">'+[['west','West longitude'],['south','South latitude'],['east','East longitude'],['north','North latitude']].map(([k,label])=>'<div><label for="remote-'+k+'">'+label+'</label><input id="remote-'+k+'" data-remote-field="'+k+'" type="number" step="any" value="'+esc(draft[k])+'"></div>').join('')+'</div><button class="btn" data-remote="raster-import">Import georeferenced image</button></div></div></section><aside class="panel"><div class="panel-head"><h2>Local survey record</h2></div><div class="remote-body">'+(local.survey?'<p><strong>'+local.survey.feature_count+' features</strong> · '+local.survey.polygon_features+' polygon features</p><p>Observation: '+esc(local.survey.observed_on)+'<br>Source: '+esc(local.survey.source)+'</p><p class="remote-small">SHA-256 '+esc(local.survey.sha256)+'</p>':'<p>No survey features imported for this selected village.</p>')+(local.ortho?'<p><strong>Drone image imported</strong><br>Observation: '+esc(local.ortho.observed_on)+'<br>Source: '+esc(local.ortho.source)+'</p>':'')+'<p>Imported features are not automatically verified buildings or occupied households. The app performs no image-based building detection and makes no change to the demand model.</p><button class="btn" data-remote="satellite">View map layers →</button><button class="btn primary" data-remote="field">Open field assessment →</button><button class="btn" data-remote="export">Export evidence JSON</button>'+(local.survey||local.ortho||local.history?'<button class="btn" data-remote="clear">Remove local imports</button>':'')+(removed.has(key())?'<button class="btn" data-remote="undo">Undo removal</button>':'')+'</div></aside></div>';}
export function renderRemoteLab(){if(!context)return '<p>Preparing remote evidence…</p>';return '<section class="remote-hero"><div><span class="eyebrow">SATELLITE → SURVEY → FIELD QUESTIONS</span><h2>Look closer before you build.</h2><p>Inspect dated imagery, compare available building estimates and bring survey observations into the field workflow.</p><strong>'+esc(current().site.name)+'</strong>'+pilotButton()+'</div><figure><img src="./images/drone-survey-concept.png" alt="AI-generated concept artwork of an unbranded mapping drone above an illustrative rural settlement"><figcaption>AI-generated concept illustration · not a real flight, village or survey</figcaption></figure></section><div class="remote-status" role="status">'+esc(message||(memoryOnly?'Memory-only imports; export a backup.':'Imports stay on this device. Satellite coverage is limited to the acquired pilot example.'))+'</div><div class="remote-tabs" role="group" aria-label="Remote evidence view">'+[['satellite','Satellite view'],['buildings','Building change'],['drone','Drone survey']].map(([id,label])=>'<button class="btn '+(tab===id?'primary':'')+'" data-remote="'+id+'" aria-pressed="'+(tab===id)+'">'+label+'</button>').join('')+'<button class="btn remote-export" data-remote="export">Export evidence</button></div><div id="remote-view">'+(tab==='buildings'?buildingView():tab==='drone'?droneView():satelliteView())+'</div>';}
async function action(name,button){
  try {
    if(['satellite','buildings','drone'].includes(name)){tab=name;message='';redraw();return;}
    if(name==='pilot'){context.onPilot(manifest.sites[0]?.site_id);return;}
    if(name==='field'){context.onField();return;}
    if(name==='boundary'||name==='survey-layer'||name==='ortho-layer'){if(name==='boundary')showBoundary=button.checked;if(name==='survey-layer')showSurvey=button.checked;if(name==='ortho-layer')showOrtho=button.checked;redraw();return;}
    if(name==='year'){yearIndex=Number(button.value);redraw();return;}
    if(name==='survey-template'){download('AimEnergy-drone-survey-template.geojson',{type:'FeatureCollection',features:[]});return;}
    if(name==='history-template'){download('AimEnergy-building-history-template.csv','year,building_count\n','text/csv');return;}
    if(name==='export'){download('AimEnergy-remote-evidence-'+key()+'.json',{schema_version:1,exported_at:new Date().toISOString(),site:current().site,source_manifest:source()||null,local_imports:entry(),scope:'Geographic context only. User imports are not independent verification; no demand assumptions changed.'});return;}
    if(name==='clear'){removed.set(key(),entry());records.delete(key());save();message='Local imports removed. Undo is available during this session.';redraw();return;}
    if(name==='undo'){records.set(key(),removed.get(key())||{});removed.delete(key());save();message='Local imports restored.';redraw();return;}
    const targetKey=key(),importMetadata={...draft};
    const file=document.querySelector(name==='survey-import'?'#remote-survey-file':name==='history-import'?'#remote-history-file':'#remote-raster-file')?.files?.[0];
    if(!file)throw new Error('Choose the appropriate local file first.');
    if(name==='history-import'){
      if(file.size>100000)throw new Error('Annual-count CSV must be under 100 KB.');
      const history=parseBuildingHistory(await file.text(),importMetadata.historySource);records.set(targetKey,{...(records.get(targetKey)||{}),history});yearIndex=null;
    } else if(name==='survey-import'){
      if(file.size>MAX_IMPORT_BYTES)throw new Error('Survey GeoJSON must be no larger than 1 MB.');
      const bytes=await file.arrayBuffer(),survey=validateSurvey(JSON.parse(new TextDecoder().decode(bytes)),{source:importMetadata.source,observed_on:importMetadata.observed_on});
      survey.sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');survey.file_name=file.name;records.set(targetKey,{...(records.get(targetKey)||{}),survey});
    } else if(name==='raster-import'){
      if(!importMetadata.source.trim()||importMetadata.source.length>240)throw new Error('Provide a survey source, up to 240 characters.');
      const date=observationDate(importMetadata.observed_on),bounds=boundsFromInput([importMetadata.west,importMetadata.south,importMetadata.east,importMetadata.north]);
      if(file.size>2*1024*1024)throw new Error('Processed image must be under 2 MB.');
      const bytes=new Uint8Array(await file.arrayBuffer()),header=rasterHeader(bytes),blob=new Blob([bytes],{type:header.mime});
      const decoded=await createImageBitmap(blob);if(decoded.width!==header.width||decoded.height!==header.height){decoded.close();throw new Error('Image dimensions could not be verified.');}decoded.close();
      const data_url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Image could not be read.'));reader.readAsDataURL(blob);});
      const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
      records.set(targetKey,{...(records.get(targetKey)||{}),ortho:{data_url,bounds,source:importMetadata.source.trim(),observed_on:date,sha256}});
    } else return;
    save();if(!memoryOnly)message='Evidence imported locally. Demand assumptions and source records are unchanged.';redraw();
  }catch(error){message=error.message||'The file could not be imported.';redraw();context.notify(message);}
}
document.addEventListener('change',event=>{if(event.target.dataset.remote==='year')action('year',event.target);});
