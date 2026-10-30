import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessment,setAnswer,removeAnswer,compareAssessment,rankQuestions,buildPassport,validateRecord} from '../dist/field-core.js';
import {defaultInputs} from '../dist/engine.js';
const site={id:5502954,name:'Orii Gangodye',population:554.840087890625,buildings:199,schools:1,clinics:0};
const context=()=>({site:{...site},sourceSite:{...site},inputs:defaultInputs(site),profileProvenance:{engine:'RAMP',version:'0.5.0'}});
const now='2026-10-30T12:00:00.000Z';
test('a field response preserves source and original inputs while changing only its own scenario',()=>{
 const c=context(),original=structuredClone(c),record=createAssessment(c,'mill-check',now);
 const revised=setAnswer(record,'millCount',1,'reported','2026-10-30','Proposed business; not confirmed',now);
 const comparison=compareAssessment(revised);
 assert.deepEqual(c,original);assert.deepEqual(record.answers,{});assert.equal(record.baseline.inputs.millCount,0);
 assert.equal(comparison.deltaKWh,495);assert.equal(comparison.changes[0].methodLabel,'Reported estimate');assert.equal(revised.baseline.site.population,site.population);
});
test('removing an answer restores the original scenario without changing history objects',()=>{
 const before=createAssessment(context(),'restore',now),answered=setAnswer(before,'population',700,'record','2026-10-29','Local estimate',now),removed=removeAnswer(answered,'population',now);
 assert.equal(answered.answers.population.value,700);assert.equal(compareAssessment(removed).deltaKWh,0);assert.equal(Object.keys(removed.answers).length,0);
});
test('question priority separates answered inputs and conditions operating-hour effects on mills',()=>{
 let record=createAssessment(context(),'priorities',now);let questions=rankQuestions(record);
 assert.equal(questions.find(x=>x.key==='millHoursPerDay').swingKWh,0);
 assert.ok(questions.find(x=>x.key==='millCount').swingKWh>0);
 record=setAnswer(record,'millCount',1,'planned','', '',now);questions=rankQuestions(record);
 assert.ok(questions.find(x=>x.key==='millHoursPerDay').swingKWh>0);assert.equal(questions.at(-1).answered,true);
 assert.ok(questions.every(x=>Number.isFinite(x.swingKWh)&&x.low>=x.min&&x.high<=x.max));
});
test('blank, invalid, out-of-range and wrongly labelled answers cannot silently become observations',()=>{
 const r=createAssessment(context(),'bad',now);
 for(const value of ['',null,NaN,Infinity,-1])assert.throws(()=>setAnswer(r,'population',value,'reported','', '',now));
 assert.throws(()=>setAnswer(r,'millCount',1.5,'counted','', '',now));assert.throws(()=>setAnswer(r,'householdKWhPerMonth',20,'counted','', '',now));
 assert.throws(()=>setAnswer(r,'population',600,'record','2027-01-01','',now));assert.throws(()=>setAnswer(r,'population',600,'record','2026-02-30','',now));
 assert.throws(()=>setAnswer(r,'unknown',1,'reported','', '',now));assert.throws(()=>setAnswer(r,'population',600,'invented','', '',now));
});
test('passport keeps geographic inputs separate and does not retain superseded field provenance',()=>{
 const c=context(),r=setAnswer(createAssessment(c,'passport',now),'population',600,'counted','2026-10-30','Aggregate count',now);r.status='applied';
 let rows=buildPassport({...c,site:{...site,population:600},fieldEvidence:r});
 assert.equal(rows.find(x=>x.key==='source_population').value,site.population);assert.equal(rows.find(x=>x.key==='source_population').date,'Not recorded');assert.match(rows.find(x=>x.key==='population').kind,/user-declared/);
 rows=buildPassport({...c,site:{...site,population:650},fieldEvidence:r});assert.equal(rows.find(x=>x.key==='population').kind,'Assumed');
});
test('record validation rejects unsupported schemas and invalid answers',()=>{
 const r=createAssessment(context(),'schema',now);assert.equal(validateRecord(r),true);assert.throws(()=>validateRecord({...r,schemaVersion:9}));assert.throws(()=>validateRecord({...r,answers:{population:{value:-2,method:'record'}}}));
});

test('manual locations are never described as satellite observations',()=>{
 const c=context();c.site.manual=true;c.sourceSite={...c.site};const rows=buildPassport(c);
 assert.equal(rows.find(r=>r.key==='source_population').kind,'User-entered');assert.equal(rows.find(r=>r.key==='source_schools').source,'Manual site entry');assert.equal(rows.find(r=>r.key==='population').kind,'User-entered');
});

test('passport covers every active engine input with its provenance',()=>{
 const c=context(),rows=buildPassport(c);for(const key of Object.keys(c.inputs))assert.ok(rows.some(r=>r.key===key),'Missing provenance: '+key);
 assert.equal(rows.find(r=>r.key==='low_multiplier').kind,'Assumed');assert.equal(rows.find(r=>r.key==='profile').kind,'Synthetic model');
});
