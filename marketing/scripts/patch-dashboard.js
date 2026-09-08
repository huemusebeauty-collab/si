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

source = source.replace("fetch('/v1/approvals'", "fetch('/v1/control-plane/prepare'");
source = source.replace(/body:JSON\.stringify\(\{action:window\.__silkuDirectorControlAction,[^}]*\}\)/, 'body:JSON.stringify({decision:window.__silkuDirectorDecision})');
source = source.replace("async function doIt(){const b=$('#doIt');", "async function doIt(){if(!window.__silkuDirectorDecision){toast('Director decision is not ready. Refresh first.');return}const b=$('#doIt');");

fs.writeFileSync(file, source);
console.log('HQ dashboard safe patch applied');
