import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculateDemand,defaultInputs} from '../dist/engine.js';
import {initSystemLab,renderSystemLab} from '../dist/system-lab.js';
import {SYSTEM_DEFAULTS} from '../dist/system-core.js';
const solar=JSON.parse(await readFile(new URL('../dist/data/solar-resource.json',import.meta.url)));
const pilot={id:'5502954',name:'Orii Gangodye',population:555,schools:1,latitude:3.487226,longitude:32.969193};
const forecast=calculateDemand(pilot,defaultInputs(pilot));

test('System workspace uses first 12 of the engine’s 24 months and labels illustrative finance',()=>{
  const oldDoc=globalThis.document,oldStorage=globalThis.localStorage;
  globalThis.document={addEventListener:()=>{}};globalThis.localStorage={getItem:()=>null};
  try{initSystemLab({getSite:()=>pilot,getDemand:()=>forecast,render:()=>{}},solar);
    const html=renderSystemLab();assert.match(html,/Scenario LCOE/);assert.match(html,/Scenario NPV/);
    assert.match(html,/Costs are illustrative USD assumptions/);assert.doesNotMatch(html,/exactly 12 monthly/);
    assert.match(html,/not automated equipment sizing/);assert.match(html,/8,760 hourly samples/);
  }finally{globalThis.document=oldDoc;globalThis.localStorage=oldStorage;}
});

test('Saved pilot resource cannot silently follow navigation to another village',()=>{
  const oldDoc=globalThis.document,oldStorage=globalThis.localStorage,events={};let current=pilot;
  const saved={schema:1,id:'version1',siteId:String(pilot.id),siteName:pilot.name,createdAt:'2026-10-31T00:00:00Z',inputs:SYSTEM_DEFAULTS,demand:{monthly:forecast.monthly.slice(0,12)},resource:solar.resources[0]};
  globalThis.document={addEventListener:(type,fn)=>{events[type]=fn;}};
  globalThis.localStorage={getItem:()=>JSON.stringify([saved])};
  try{initSystemLab({getSite:()=>current,getDemand:()=>forecast,render:()=>{}},solar);
    events.click({target:{closest:()=>({dataset:{system:'open',id:'version1'}})}});
    assert.match(renderSystemLab(),/Saved demand\/resource snapshot/);
    current={...pilot,id:'different-site',name:'Different village'};
    const html=renderSystemLab();assert.match(html,/No result without a matching resource/);
    assert.doesNotMatch(html,/Scenario LCOE/);assert.doesNotMatch(html,/Saved demand\/resource snapshot/);
  }finally{globalThis.document=oldDoc;globalThis.localStorage=oldStorage;}
});
