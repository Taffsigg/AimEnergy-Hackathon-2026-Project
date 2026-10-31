export const APPLIANCES = {1:'Lighting',2:'Phone charging',3:'TV / radio',4:'Refrigeration',5:'Grain mill',6:'Other'};
export const INTEREST = {1:'Interested',2:'Not interested',3:'Unsure'};
export const IDLE_MS = 5 * 60 * 1000;
const copy = x => JSON.parse(JSON.stringify(x));
const stamp = value => {
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new Error('Invalid timestamp');
  return new Date(value).toISOString();
};
export function newCommunitySession(id, now=new Date().toISOString()) {
  if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw new Error('Invalid session ID');
  return {id,step:'consent',status:'active',startedAt:stamp(now),updatedAt:stamp(now),answers:{}};
}
export function communityMenu(s) {
  if(s.status==='cancelled')return 'END Session cancelled. No response saved.';
  if(s.status==='expired')return 'END Preview session expired. Start again. No response saved.';
  if(s.status==='complete')return 'END Simulation response saved for review. No live message was sent.';
  if(s.step==='confirm')return 'CON Review simulation\nVillage: '+s.answers.villageId+'\n'+s.answers.kind+'\n'+s.answers.applianceBasis+': '+(s.answers.appliances.map(x=>APPLIANCES[x]).join(', ')||'None')+(s.answers.kind==='business'?'\nBusiness hours/day: '+s.answers.businessHours:'')+'\nInterest: '+INTEREST[s.answers.interest]+'\n1 Save simulation response\n2 Restart answers\n00 Cancel';
  return {
    consent:'CON AimEnergy USSD preview\nSimulation only. No phone number required. Completed answers stay in this browser.\n1 Agree and continue\n2 Cancel',
    village:'CON Enter the village code shown beside this phone.\n00 Cancel',
    kind:'CON What are you describing?\n1 Household\n2 Business\n00 Cancel',
    applianceBasis:'CON Which appliances will you describe?\n1 Currently owned\n2 Intended future purchases\n00 Cancel',
    appliances:'CON Select appliances:\n1 Lighting\n2 Phone charging\n3 TV / radio\n4 Refrigeration\n5 Grain mill\n6 Other\n0 None\nEnter choices separated by commas.\n00 Cancel',
    hours:'CON Expected business operating hours per day?\nEnter 0 to 24 (for example 8 or 7.5). This is not appliance full-power runtime.\n00 Cancel',
    interest:'CON Would you be interested in a grid connection?\n1 Yes\n2 No\n3 Unsure\nInterest does not guarantee connection.\n00 Cancel',
    confirm:'CON Review answers beside the phone.\n1 Save simulation response\n2 Restart answers\n00 Cancel',
  }[s.step] || 'END Invalid session. Start again.';
}
export function advanceCommunity(session, input, villageIds, now=new Date().toISOString()) {
  const s=copy(session), time=stamp(now);
  if(s.status!=='active')throw new Error('Start a new preview session.');
  if(Date.parse(time)-Date.parse(s.updatedAt)>IDLE_MS){s.status='expired';return s;}
  const value=String(input??'').trim();
  if(!value||value.length>40)throw new Error('Enter one of the choices shown on the screen.');
  if(value==='00'){s.status='cancelled';s.updatedAt=time;return s;}
  if(s.step==='consent') {
    if(value==='2'){s.status='cancelled';return s;}
    if(value!=='1')throw new Error('Choose 1 to agree or 2 to cancel.');
    s.answers.consent=true;s.step='village';
  } else if(s.step==='village') {
    if(!/^\d{1,12}$/.test(value)||!villageIds.map(String).includes(value))throw new Error('Use a listed village code. No response has been saved.');
    s.answers.villageId=value;s.step='kind';
  } else if(s.step==='kind') {
    if(!['1','2'].includes(value))throw new Error('Choose 1 Household or 2 Business.');
    s.answers.kind=value==='1'?'household':'business';s.step='applianceBasis';
  } else if(s.step==='applianceBasis') {
    if(!['1','2'].includes(value))throw new Error('Choose 1 Currently owned or 2 Intended purchases.');
    s.answers.applianceBasis=value==='1'?'owned':'intended';s.step='appliances';
  } else if(s.step==='appliances') {
    if(!/^[0-6](\s*,\s*[0-6])*$/.test(value))throw new Error('Use appliance numbers separated by commas, or 0 for none.');
    const choices=[...new Set(value.split(',').map(x=>Number(x.trim())))].sort();
    if(choices.includes(0)&&choices.length>1)throw new Error('Choose 0 on its own, or list appliances.');
    s.answers.appliances=choices.filter(x=>x!==0);s.step=s.answers.kind==='business'?'hours':'interest';
  } else if(s.step==='hours') {
    if(!/^(?:\d{1,2})(?:\.\d)?$/.test(value)||Number(value)>24)throw new Error('Enter business hours from 0 to 24.');
    s.answers.businessHours=Number(value);s.step='interest';
  } else if(s.step==='interest') {
    if(!Object.hasOwn(INTEREST,value))throw new Error('Choose 1 Yes, 2 No or 3 Unsure.');
    s.answers.interest=Number(value);s.step='confirm';
  } else if(s.step==='confirm') {
    if(value==='2'){s.answers={consent:true};s.step='village';}
    else if(value==='1')s.status='complete';
    else throw new Error('Choose 1 to save or 2 to restart.');
  } else throw new Error('Invalid session. Start again.');
  s.updatedAt=time;return s;
}
export function completedCommunityRecord(s) {
  if(s.status!=='complete'||!s.answers.consent)throw new Error('Only consented, completed responses can be saved.');
  return {schema:1,id:s.id,channel:'ussd_simulator',method:'demonstration',consent:true,createdAt:stamp(s.updatedAt),
    villageId:s.answers.villageId,kind:s.answers.kind,applianceBasis:s.answers.applianceBasis,appliances:[...s.answers.appliances],
    businessHours:s.answers.kind==='business'?s.answers.businessHours:null,interest:s.answers.interest,
    reviewedAt:null,scope:'Simulated reported answers; not a real survey, connection commitment or measured electricity use.'};
}
export function validateCommunityRecord(value, villageIds) {
  if(!value||value.schema!==1||value.channel!=='ussd_simulator'||value.method!=='demonstration'||value.consent!==true)throw new Error('Unsupported community record');
  const s=newCommunitySession(value.id,stamp(value.createdAt));
  const allowed=Array.from(villageIds,String);
  if(typeof value.villageId!=='string'||!allowed.includes(value.villageId)||!/^\d{1,12}$/.test(value.villageId))throw new Error('Unknown village');
  if(!['household','business'].includes(value.kind)||!Array.isArray(value.appliances)||value.appliances.length>6||value.appliances.some(x=>!Number.isInteger(x)||!Object.hasOwn(APPLIANCES,x))||new Set(value.appliances).size!==value.appliances.length)throw new Error('Invalid response');
  if(!Number.isInteger(value.interest)||!Object.hasOwn(INTEREST,value.interest))throw new Error('Invalid interest');
  if(!['owned','intended'].includes(value.applianceBasis))throw new Error('Specify owned or intended appliances');
  if(value.kind==='business'&&(typeof value.businessHours!=='number'||!Number.isFinite(value.businessHours)||value.businessHours<0||value.businessHours>24))throw new Error('Invalid business hours');
  if(value.kind==='household'&&value.businessHours!==null)throw new Error('Household hours must be empty');
  s.answers={consent:true,villageId:value.villageId,kind:value.kind,applianceBasis:value.applianceBasis,appliances:value.appliances,businessHours:value.businessHours,interest:value.interest};s.status='complete';
  const clean=completedCommunityRecord(s);
  if(value.reviewedAt!==null){clean.reviewedAt=stamp(value.reviewedAt);if(Date.parse(clean.reviewedAt)<Date.parse(clean.createdAt))throw new Error('Review precedes response');}
  return clean;
}
