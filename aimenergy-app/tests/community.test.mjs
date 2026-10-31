import test from 'node:test';
import assert from 'node:assert/strict';
import {newCommunitySession,advanceCommunity,completedCommunityRecord,validateCommunityRecord,communityMenu,IDLE_MS} from '../dist/community-core.js';
import {initCommunityLab,renderCommunityLab,renderCommunityPassport,getCommunityEvidence} from '../dist/community-lab.js';
const t='2026-10-31T00:00:00.000Z',villages=['5502954','5502955'];
function finish(kind='1',basis='1') {
  let s=newCommunitySession('test-session',t);
  for(const answer of ['1','5502954',kind,basis,'1,2',...(kind==='2'?['7.5']:[]),'3','1']) s=advanceCommunity(s,answer,villages,t);
  return completedCommunityRecord(s);
}
test('Completed household/business responses preserve simulation provenance and distinct appliance intent',()=>{
  const household=finish(),business=finish('2','2');
  assert.equal(household.businessHours,null);
  assert.equal(business.businessHours,7.5);
  assert.equal(business.applianceBasis,'intended');
  assert.equal(household.channel,'ussd_simulator');
  assert.equal(household.method,'demonstration');
  assert.deepEqual(validateCommunityRecord(business,villages),business);
  assert.ok(!('phoneNumber' in business));
  assert.equal(communityMenu({status:'complete'}).startsWith('END '),true);
});
test('Consent, village validation, malformed choices and idle timeout cannot create a completed response',()=>{
  let s=newCommunitySession('blocked',t);
  assert.throws(()=>completedCommunityRecord(s),/completed/);
  assert.throws(()=>advanceCommunity(s,'yes',villages,t),/Choose 1/);
  assert.equal(s.step,'consent');
  const cancelled=advanceCommunity(s,'2',villages,t);
  assert.equal(cancelled.status,'cancelled');
  assert.throws(()=>completedCommunityRecord(cancelled));
  s=advanceCommunity(s,'1',villages,t);
  assert.throws(()=>advanceCommunity(s,'999999',villages,t),/listed village/);
  const late=advanceCommunity(s,'5502954',villages,new Date(Date.parse(t)+IDLE_MS+1).toISOString());
  assert.equal(late.status,'expired');
  assert.throws(()=>completedCommunityRecord(late));
  for(const answer of ['5502954','2','1'])s=advanceCommunity(s,answer,villages,t);
  assert.throws(()=>advanceCommunity(s,'0,1',villages,t),/on its own/);
  s=advanceCommunity(s,'1,1,5',villages,t);
  assert.deepEqual(s.answers.appliances,[1,5]);
  for(const invalid of ['25','-1','NaN','Infinity',''])assert.throws(()=>advanceCommunity(s,invalid,villages,t));
  assert.equal(advanceCommunity(s,'00',villages,t).status,'cancelled');
});
test('Restored records reject evidence promotion and invalid payloads; extraneous data is stripped',()=>{
  const record=finish();
  for(const patch of [{consent:false},{channel:'live_ussd'},{method:'verified'},{villageId:'unknown'},{kind:'clinic'},{appliances:[999]},{applianceBasis:'unknown'},{interest:4},{businessHours:24},{createdAt:'bad'},{reviewedAt:'2020-01-01'}])assert.throws(()=>validateCommunityRecord({...record,...patch},villages));
  assert.throws(()=>validateCommunityRecord(null,villages));
  const clean=validateCommunityRecord({...record,phoneNumber:'must-not-survive',scope:'verified measurements'},villages);
  assert.ok(!('phoneNumber' in clean));
  assert.match(clean.scope,/Simulated/);
});
test('Local inbox restores bounded responses and exports simulation evidence by village, without promoting reviewed records',()=>{
  const record=finish();record.reviewedAt='2026-10-31T01:00:00.000Z';
  const previousStorage=globalThis.localStorage,previousDocument=globalThis.document;
  globalThis.localStorage={getItem:()=>JSON.stringify([null,record,{...record,id:'other',villageId:'5502955'}]),setItem:()=>{}};
  globalThis.document={addEventListener:()=>{}};
  try {
    initCommunityLab({getSites:()=>villages.map((id,i)=>({id,name:i?'Second village':'Orii Gangodye'})),getSite:()=>({id:villages[0],name:'Orii Gangodye'}),render:()=>{},onField:()=>{}});
    const evidence=getCommunityEvidence(villages[0]);
    assert.equal(evidence.responses,1);assert.equal(evidence.reviewed,1);
    assert.equal(evidence.records[0].method,'demonstration');
    assert.match(renderCommunityPassport(villages[0]),/demonstration inputs/);
    assert.match(renderCommunityLab(),/no live service code/);
    assert.match(renderCommunityLab(),/invalid saved responses were skipped/);
    evidence.records[0].appliances.push(6);
    assert.equal(getCommunityEvidence(villages[0]).records[0].appliances.length,2);
  } finally {globalThis.localStorage=previousStorage;globalThis.document=previousDocument;}
});
