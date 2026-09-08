const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let source = fs.readFileSync(file, 'utf8');

const adsNav = '<button type="button" class="nav" data-jump="ads"><b>📢 ADS</b><span>Ads workspace foundation</span></button>';
const adsSection = '<section class="panel"><article class="card" id="ads"><div class="eyebrow">📢 Ads</div><h2>Ads workspace</h2><p class="reason">Foundation connected. Ad drafts, approvals, budgets and performance controls will plug in here.</p></article><aside class="card"><div class="eyebrow">Safety</div><h2>Approval required</h2><p class="reason">Ad launches and budget changes remain behind the approval boundary.</p></aside></section>';

if (!source.includes('data-jump="ads"')) {
  const marker = '<button type="button" class="nav" id="run">';
  if (!source.includes(marker)) throw new Error('HQ refresh navigation marker not found');
  source = source.replace(marker, adsNav + marker);
}
if (!source.includes('id="ads"')) {
  const marker = '<section class="panel"><article class="card" id="operations">';
  if (!source.includes(marker)) throw new Error('HQ operations section marker not found');
  source = source.replace(marker, adsSection + marker);
}

const loadMarker = 'const d=j.data;';
if (!source.includes('function mapDirectorAction')) {
  const mapping = "function mapDirectorAction(text){const s=String(text||'').toLowerCase();if(s.includes('creator'))return 'contact_creator';if(s.includes('b2b')||s.includes('wholesale')||s.includes('retail'))return 'b2b_outreach';if(s.includes('ad')||s.includes('campaign'))return 'launch_ads';if(s.includes('reply')||s.includes('comment'))return 'reply_comment';if(s.includes('message')||s.includes('dm'))return 'send_message';if(s.includes('budget'))return 'change_budget';return 'publish_content'}\n";
  if (!source.includes(loadMarker)) throw new Error('HQ dashboard load marker not found');
  source = source.replace(loadMarker, mapping + loadMarker + 'window.__silkuDirectorControlAction=mapDirectorAction(d.decision.action);window.__silkuDirectorDecision=d.decision;');
}

const doItPattern = /async function doIt\(\)\{[\s\S]*?\}\nfunction notNow/;
const doItReplacement = "async function doIt(){const b=$('#doIt');if(!window.__silkuDirectorDecision){toast('Director decision is not ready. Refresh first.');return}b.disabled=true;b.textContent='Queueing…';try{const r=await fetch('/v1/control-plane/prepare',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({decision:window.__silkuDirectorDecision})});if(r.status===401){location.href='/?reauth=1';return}const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'Control-plane preparation failed');const result=j.data;if(result.status==='approval_required'){toast('Action sent to Approval Center. Nothing sensitive was executed.')}else if(result.status==='ready'){toast('Action is ready at the execution boundary.')}else{toast(result.reason||'Action is blocked.')}await load();await loadApprovals()}catch(e){toast(e.message||'Could not prepare action.')}finally{b.disabled=false;b.textContent='DO IT'}}\nfunction notNow";
if (!doItPattern.test(source)) throw new Error('HQ DO IT handler marker not found');
source = source.replace(doItPattern, doItReplacement);

const approvalLoader = "async function loadApprovals(){const r=await fetch('/v1/approvals',{credentials:'same-origin',cache:'no-store'});if(r.status===401){location.href='/?reauth=1';return}const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'Approvals unavailable');const items=(j.data||[]).slice().reverse();const el=$('#approvalList');if(!el)return;el.innerHTML=items.length?items.map(x=>'<li><b>'+esc(x.action)+'</b> · '+esc(x.decision)+'<br><span class=\"muted\">'+esc(x.reason)+'</span>'+(x.decision==='pending'?'<div class=\"actions\"><button type=\"button\" class=\"btn primary\" data-approve=\"'+esc(x.requestId)+'\">Approve</button><button type=\"button\" class=\"btn secondary\" data-reject=\"'+esc(x.requestId)+'\">Reject</button></div>':'')+'</li>').join(''):'<li>No approval requests.</li>';$('#executionState').textContent=items.filter(x=>x.decision==='pending').length+' pending approval(s). Sensitive actions remain blocked until approved.';return true}\nasync function decideApproval(id,decision){if(!id)return;const buttons=$$('[data-approve=\"'+id+'\"],[data-reject=\"'+id+'\"]');Array.from(buttons).forEach(b=>{b.disabled=true;b.textContent=decision==='approve'?'Approving…':'Rejecting…'});try{const r=await fetch('/v1/approvals/'+encodeURIComponent(id)+'/'+decision,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({actor:'marketing-hq'})});if(r.status===401){location.href='/?reauth=1';return}const text=await r.text();let j={};try{j=JSON.parse(text)}catch{}if(!r.ok||!j.ok)throw new Error(j.error||('Approval update failed ('+r.status+')'));toast(decision==='approve'?'Approval granted. Execution remains provider-gated.':'Approval rejected.');await loadApprovals();await load()}catch(e){Array.from(buttons).forEach(b=>b.disabled=false);toast(e.message||'Approval update failed')}}\n";
if (!source.includes('async function loadApprovals')) source = source.replace('async function load(){', approvalLoader + 'async function load(){');

if (!source.includes('id="approvalList"')) {
  const marker = '<aside class="card" id="approvals"><div class="eyebrow">🛡️ Approvals</div><h2>Approval Center</h2><p class="reason">Human approval remains the execution boundary for sensitive marketing actions.</p>';
  if (!source.includes(marker)) throw new Error('HQ approval center marker not found');
  source = source.replace(marker, marker + '<ul class="list" id="approvalList"><li>Loading approvals…</li></ul>');
}
if (!source.includes('id="executionState"')) {
  const marker = '<aside class="card" id="approvals"><div class="eyebrow">🛡️ Approvals</div><h2>Approval Center</h2>';
  if (!source.includes(marker)) throw new Error('HQ approval card marker not found');
  source = source.replace(marker, marker + '<div class="muted" id="executionState" style="margin-top:12px">No action selected.</div>');
}

const delegated = "document.addEventListener('click',e=>{const b=e.target.closest?.('[data-approve],[data-reject]');if(!b)return;e.preventDefault();const id=b.dataset.approve||b.dataset.reject;const decision=b.dataset.approve?'approve':'reject';decideApproval(id,decision).catch(err=>toast(err.message||'Approval update failed'))});\n";
if (!source.includes("document.addEventListener('click',e=>{const b=e.target.closest?.('[data-approve],[data-reject]')")) source = source.replace("function notNow", delegated + "function notNow");

source = source.replace("await load();toast('Silku refreshed the latest intelligence.');", "await load();await loadApprovals();toast('Silku refreshed the latest intelligence.');");
source = source.replace("load().catch(()=>toast('Dashboard opened, but live commerce data could not be loaded.'));", "Promise.all([load(),loadApprovals()]).catch(()=>toast('Dashboard opened, but live commerce or approval data could not be loaded.'));");

fs.writeFileSync(file, source);
console.log('HQ dashboard safe patch applied');
