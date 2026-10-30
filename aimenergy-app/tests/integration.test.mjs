import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculateDemand,defaultInputs} from '../dist/engine.js';
const load=async name=>JSON.parse(await readFile(new URL('../dist/data/'+name,import.meta.url),'utf8'));
const {sites,metadata}=await load('sites.json');
const boundaries=await load('boundaries.geojson');
const survey=await load('survey-summary.json');
test('all real villages join one-to-one with display boundaries and valid geographic centers',()=>{
 assert.equal(sites.length,411);assert.equal(new Set(sites.map(s=>s.id)).size,411);
 const ids=new Set(boundaries.features.map(f=>Number(f.id)));assert.equal(ids.size,411);
 for(const s of sites){assert.ok(ids.has(Number(s.id)));assert.ok(s.name);assert.ok(Number.isFinite(s.latitude)&&Math.abs(s.latitude)<=90);assert.ok(Number.isFinite(s.longitude)&&Math.abs(s.longitude)<=180);}
 assert.equal(sites.filter(s=>s.candidate).length,39);assert.equal(sites.filter(s=>s.existing).length,24);
});
test('every supplied village generates finite, conserved and ordered monthly demand scenarios',()=>{
 for(const site of sites){const r=calculateDemand(site,defaultInputs(site));assert.equal(r.monthly.length,24);
 for(let i=0;i<24;i++){const b=r.monthly[i];assert.ok(Number.isFinite(b.totalKWh)&&b.totalKWh>=0);assert.ok(Number.isFinite(b.peakKW));assert.ok(r.scenarios.low.monthly[i].totalKWh<=b.totalKWh);assert.ok(r.scenarios.high.monthly[i].totalKWh>=b.totalKWh);assert.ok(Math.abs(b.hourlyKW.reduce((a,x)=>a+x,0)*30-b.totalKWh)<Math.max(1,b.totalKWh)*1e-9);}
 }
});
test('published survey evidence contains aggregate-only independent household counts and target limitations',()=>{
 assert.equal(survey.quality.unique_households,445);assert.equal(survey.groups.rural.households,91);assert.equal(survey.groups.urban.households,354);assert.equal(survey.target.metered,false);assert.equal(survey.target.assumed_tariff_ugx_per_kwh,250);assert.equal(survey.quality.hhsize_inconsistent_households,421);
 assert.ok(!Object.hasOwn(survey,'households'));assert.ok(!Object.hasOwn(survey,'records'));
});
test('RAMP templates, when present, preserve model energy and disclose synthetic provenance',async()=>{
 let ramp;try{ramp=await load('ramp-profiles.json');}catch(e){if(e.code==='ENOENT')return;throw e;}
 assert.equal(ramp.provenance.engine,'RAMP');const shapes=Object.fromEntries(Object.entries(ramp.profiles).map(([k,v])=>[k,v.hourlyShares]));
 for(const profile of Object.values(shapes)){assert.equal(profile.length,24);assert.ok(profile.every(x=>Number.isFinite(x)&&x>=0));assert.ok(Math.abs(profile.reduce((a,x)=>a+x,0)-1)<1e-8);}
 const r=calculateDemand(sites[0],{...defaultInputs(sites[0]),millCount:1,refrigerationCount:1},shapes);
 assert.ok(Math.abs(r.hourlyKW.reduce((a,x)=>a+x,0)*30-r.firstMonth.totalKWh)<1e-7);
});
