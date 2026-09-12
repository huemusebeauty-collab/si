const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let source = fs.readFileSync(file, 'utf8');

const marker = 'const js = `';
const start = source.indexOf(marker);
if (start < 0) throw new Error('HQ dashboard JS template not found');

// tsc compiles the exported function as `function dashboardHtml`; use that
// stable compiled-output marker rather than TypeScript source formatting.
const endMarker = '`;\n\nfunction dashboardHtml';
const end = source.indexOf(endMarker, start + marker.length);
if (end < 0) throw new Error('HQ dashboard JS template end not found in compiled output');

const cleanJs = `
const qsa=s=>Array.from(document.querySelectorAll(s));
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\"/g,'&quot;').replace(/'/g,'&#39;');
function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.remove('hidden');clearTimeout(window.__silkuToast);window.__silkuToast=setTimeout(()=>el.classList.add('hidden'),2800)}
function jump(id){const target=document.getElementById(id);if(!target)return;qsa('[data-jump]').forEach(x=>x.classList.toggle('active',x.dataset.jump===id));target.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+id)}
async function loadOperations(){return true}
async function load(){const r=await fetch('/v1/marketing/dashboard',{credentials:'same-origin',cache:'no-store'});if(r.status===401){location.href='/';return false}const j=await r.json();if(!j.ok)throw new Error(j.error||'Dashboard unavailable');const d=j.data||{};const decision=d.decision||{};const analytics=d.analytics||{};$('#decision').textContent=decision.action||'Monitoring live signals';$('#reason').textContent=decision.reason||'Silku is checking the latest intelligence.';$('#confidence').textContent=Math.round(Number(decision.confidence||0)*100)+'% confidence';$('#confidence2').textContent=Math.round(Number(decision.confidence||0)*100)+'%';$('#revenue').textContent='₹'+Number(analytics.revenue||0).toLocaleString('en-IN');$('#roas').textContent=Number(analytics.roas||0).toFixed(2)+'×';$('#orders').textContent=Number(analytics.orders||0).toLocaleString('en-IN');$('#growth').textContent=(Number(analytics.followerGrowth||0)*100).toFixed(1)+'%';$('#approvals').textContent=Array.isArray(d.pendingApprovals)?d.pendingApprovals.length:0;const hot=d.nextBestAction||{};$('#hotSignal').textContent=hot.reason||'No hot signal yet.';const websiteActions=Array.isArray(d.websiteActions)?d.websiteActions:[];$('#websiteActions').innerHTML=websiteActions.length?websiteActions.slice(0,6).map(x=>'<div class=\"wi-row\"><div class=\"wi-top\"><div><div class=\"wi-product\">'+esc(x.productId||'Website opportunity')+'</div><div class=\"wi-meta\">'+esc(x.priority||'monitor')+' priority · score '+esc(x.score??'—')+'</div></div><div class=\"wi-score\">'+esc(x.recommendedAction||'monitor')+'</div></div><div class=\"wi-reason\">'+esc(x.reason||'No additional reason provided.')+'</div></div>').join(''):'<div class=\"muted\">No strong website opportunities right now ✨</div>';const alerts=Array.isArray(analytics.alerts)?analytics.alerts:[];$('#alerts').innerHTML=alerts.length?alerts.map(x=>'<div class=\"alert\">'+esc(x)+'</div>').join(''):'<div class=\"muted\">No red flags right now ✨</div>';$('#audit').innerHTML=(Array.isArray(d.recentAudit)?d.recentAudit:[]).slice(0,5).map(x=>'<li>'+esc(x.details||'')+'</li>').join('')||'<li>Quiet. No recent security events.</li>';$('#updated').textContent=d.generatedAt?new Date(d.generatedAt).toLocaleString('en-IN'):new Date().toLocaleString('en-IN');return true}
async function run(){const b=$('#run');if(b)b.disabled=true;try{await load();toast('Silku refreshed the latest intelligence.')}catch(e){toast('Live data is temporarily unavailable. No fake numbers were shown.')}finally{if(b)b.disabled=false}}
async function doIt(){const b=$('#doIt');if(b)b.disabled=true;try{const r=await fetch('/v1/approvals',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'publish_content',actor:'marketing-hq',reason:'Execute the current AI Director recommendation from the private HQ dashboard.'})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'Approval request failed');toast('Action queued for approval. Nothing sensitive was executed.');await load()}catch(e){toast(e.message||'Could not queue action.')}finally{if(b)b.disabled=false}}
function notNow(){toast('Noted. Silku will not execute this recommendation.')}
qsa('[data-jump]').forEach(x=>x.addEventListener('click',()=>jump(x.dataset.jump)));
if($('#run'))$('#run').addEventListener('click',run);
if($('#doIt'))$('#doIt').addEventListener('click',doIt);
if($('#notNow'))$('#notNow').addEventListener('click',notNow);
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(id)jump(id)});
load().catch(()=>toast('Dashboard opened, but live data could not be loaded.'));
if(location.hash)jump(location.hash.slice(1));
`;

source = source.slice(0,start) + marker + cleanJs + source.slice(end);
fs.writeFileSync(file, source);
console.log('Final clean HQ dashboard browser script installed against compiled output');
