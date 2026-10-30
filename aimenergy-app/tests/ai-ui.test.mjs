import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const handlers=new Map();
globalThis.document={addEventListener:(type,fn)=>{const list=handlers.get(type)||[];list.push(fn);handlers.set(type,list);},querySelector:()=>null};
globalThis.fetch=async url=>{const name=String(url).split('/').at(-1);const text=await readFile(new URL('../dist/data/'+name,import.meta.url),'utf8');return {ok:true,json:async()=>JSON.parse(text)};};
const {initAILab,renderAILab,getMLEvidence}=await import('../dist/ai-lab.js');
let applied=null;
await initAILab({getContext:()=>({site:{id:5502954,name:'Orii Gangodye'}}),onApply:value=>{applied=value;}});
test('AI lab renders actual household metrics and split counts without null-to-zero or object artifacts',()=>{
 const html=renderAILab();assert.match(html,/44\.1/);assert.match(html,/49\.1/);assert.match(html,/86\.5/);assert.match(html,/267/);assert.match(html,/Under|underpredict/);assert.ok(!html.includes('[object Object]'));assert.ok(!html.includes('NaN'));assert.match(html,/Context outlier/);
});
test('numeric input events immediately change prediction and remove the matching imputation flag',()=>{
 const before=getMLEvidence().current.prediction;const label={textContent:''};const target={dataset:{mlFeature:'h9q03'},value:'4',closest:()=>({querySelector:()=>label})};
 for(const handler of handlers.get('input')||[])handler({target,type:'input'});
 const after=getMLEvidence().current;assert.equal(after.inputs.h9q03,4);assert.notEqual(after.prediction,before);assert.ok(!after.flags.includes('imputed_h9q03'));assert.equal(label.textContent,'Scenario input');
});
test('applying a prediction passes model identity, profile and separate household interval',()=>{
 const button={dataset:{aiAction:'apply'}};for(const handler of handlers.get('click')||[])handler({target:{closest:()=>button}});
 assert.ok(applied);assert.equal(applied.model_id,getMLEvidence().model_id);assert.equal(applied.features.h9q03,4);assert.ok(applied.interval.lower<=applied.value&&applied.interval.upper>=applied.value);
});
