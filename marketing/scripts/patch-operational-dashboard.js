const fs = require('node:fs');
const path = require('node:path');

const mainFile = path.join(__dirname, '..', 'dist', 'main.js');
const dashboardFile = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let main = fs.readFileSync(mainFile, 'utf8');
let dashboard = fs.readFileSync(dashboardFile, 'utf8');

const routeMarker = 'json(response, 404, { ok: false, error: "Not found" });';
const route = `if (method === "GET" && pathname === "/v1/operations/summary") { if (!persistence) { json(response, 503, { ok: false, dataSource: "unavailable", error: "Marketing HQ persistence is not configured" }); return; } try { const [jobs, attempts, alerts] = await Promise.all([Promise.resolve(domainStore.listJobs()), persistence.loadJobAttempts(), persistence.loadAlerts()]); const counts = jobs.reduce((acc, job) => { acc[job.status] = (acc[job.status] ?? 0) + 1; return acc; }, { queued: 0, running: 0, succeeded: 0, failed: 0, stalled: 0 }); json(response, 200, { ok: true, dataSource: "live", generatedAt: new Date().toISOString(), jobs: { counts, total: jobs.length, recent: jobs.slice().sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0,8).map(job => ({ jobId: job.jobId, jobKey: job.jobKey, type: job.type, status: job.status, retryCount: job.retryCount, maxRetries: job.maxRetries, startedAt: job.startedAt, finishedAt: job.finishedAt, errorCode: job.errorCode, errorMessage: job.errorMessage, updatedAt: job.updatedAt })) }, attempts: attempts.slice().sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0,8), alerts: alerts.filter(alert => alert.status !== "resolved").slice(0,8) }); } catch (error) { json(response, 503, { ok: false, dataSource: "unavailable", error: error instanceof Error ? error.message : "Operations data unavailable" }); } return; }\n`;
if (!main.includes('/v1/operations/summary')) {
  if (!main.includes(routeMarker)) throw new Error('HQ operational route marker not found');
  main = main.replace(routeMarker, route + routeMarker);
}

const sectionMarker = '<section class="panel"><article class="card" id="operations">';
const section = '<section class="panel" id="operationsLive"><article class="card"><div class="eyebrow">⚙️ Live Operations</div><h2>Jobs, attempts & alerts</h2><p class="reason">Persistent operational state from Neon. Failures and stalls are shown as real signals; unavailable data is never replaced with fake zeros.</p><div class="metrics"><div class="metric"><small>Queued</small><strong id="opQueued">—</strong></div><div class="metric"><small>Running</small><strong id="opRunning">—</strong></div><div class="metric"><small>Failed</small><strong id="opFailed">—</strong></div><div class="metric"><small>Stalled</small><strong id="opStalled">—</strong></div></div><ul class="list" id="opAttempts"><li>Loading operational data…</li></ul><div id="opAlerts" style="margin-top:12px"></div></article><aside class="card"><div class="eyebrow">Evidence</div><h2 id="opSource">Live operational state</h2><p class="reason">Job attempts and alerts survive HQ restarts because they are persisted in the HQ database.</p></aside></section>';
if (!dashboard.includes('id="operationsLive"')) {
  if (!dashboard.includes(sectionMarker)) throw new Error('HQ operations section marker not found');
  dashboard = dashboard.replace(sectionMarker, section + sectionMarker);
}

const loadMarker = 'const d=j.data;';
const loader = `async function loadOperations(){const r=await fetch('/v1/operations/summary',{credentials:'same-origin',cache:'no-store'});const j=await r.json();if(!r.ok||!j.ok){const message=j.error||'Operations data unavailable';if($('#opSource'))$('#opSource').textContent='Unavailable';if($('#opAttempts'))$('#opAttempts').innerHTML='<li>'+esc(message)+'</li>';if($('#opAlerts'))$('#opAlerts').innerHTML='';throw new Error(message)}const c=j.jobs.counts||{};$('#opQueued').textContent=c.queued??0;$('#opRunning').textContent=c.running??0;$('#opFailed').textContent=c.failed??0;$('#opStalled').textContent=c.stalled??0;$('#opSource').textContent=j.dataSource==='live'?'Live operational state':'Unavailable';const attempts=j.attempts||[];$('#opAttempts').innerHTML=attempts.length?attempts.map(x=>'<li><b>'+esc(x.status)+'</b> · '+esc(x.jobId)+' · attempt '+esc(x.attemptNumber)+'<br><span class="muted">'+esc(x.errorMessage||x.finishedAt||x.startedAt||'No error')+'</span></li>').join(''):'<li>No job attempts recorded.</li>';const alerts=j.alerts||[];$('#opAlerts').innerHTML=alerts.length?alerts.map(x=>'<div class="alert"><b>'+esc(x.severity)+'</b> · '+esc(x.type)+'<br>'+esc(x.message)+'</div>').join(''):'<div class="muted">No open operational alerts ✨</div>';return true}\n`;
if (!dashboard.includes('async function loadOperations')) {
  if (!dashboard.includes(loadMarker)) throw new Error('HQ dashboard operational load marker not found');
  dashboard = dashboard.replace(loadMarker, loader + loadMarker);
}

dashboard = dashboard.replace("await load();toast('Silku refreshed the latest intelligence.');", "await load();await loadOperations();toast('Silku refreshed the latest intelligence.');");
dashboard = dashboard.replace("Promise.all([load(),loadApprovals()]).catch(()=>toast('Dashboard opened, but live commerce or approval data could not be loaded.'));", "Promise.all([load(),loadApprovals(),loadOperations()]).catch(()=>toast('Dashboard opened, but one or more live feeds could not be loaded.'));");

fs.writeFileSync(mainFile, main);
fs.writeFileSync(dashboardFile, dashboard);
console.log('HQ operational jobs, attempts, and alerts dashboard patch applied');
