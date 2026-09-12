const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let source = fs.readFileSync(file, 'utf8');

if (source.includes('const $$=s=>Array.from(document.querySelectorAll(s));')) {
  source = source.replaceAll('$$', 'qsa');
}

const marker = "qsa('[data-jump]').forEach(x=>x.addEventListener('click',()=>jump(x.dataset.jump)));";
if (!source.includes(marker)) throw new Error('HQ navigation binding marker not found');

const navigationFix = "const routeMap={overview:'/',grow:'/grow',money:'/money',websiteIntel:'/website-intelligence',hotSection:'/whats-hot',director:'/ask-silku',content:'/content-studio',social:'/social',approvals:'/approvals',creators:'/creators',b2b:'/b2b',campaigns:'/campaigns',analytics:'/analytics',operations:'/operations',ads:'/ads'};const originalJump=jump;jump=function(id){const route=routeMap[id];if(route){location.href=route;return}toast('This workspace is not wired yet.');};const routeTargetMap={grow:'grow',money:'money',websiteIntel:'websiteIntel',hotSection:'hotSection',director:'director',approvals:'approvals',creators:'creators',b2b:'b2b',campaigns:'campaigns',analytics:'analytics',operations:'operations',ads:'ads'};const currentRoute=Object.keys(routeMap).find(k=>routeMap[k]===location.pathname);if(currentRoute&&routeTargetMap[currentRoute]){requestAnimationFrame(()=>originalJump(routeTargetMap[currentRoute]));}\n";
if (!source.includes('const routeMap={content:')) source = source.replace(marker, navigationFix + marker);

fs.writeFileSync(file, source);

// Every workspace URL must resolve to a real protected page. Content Studio
// and Social Center keep their dedicated routes; the remaining workspaces use
// a small honest placeholder until their dedicated phase is built.
const mainFile = path.join(__dirname, '..', 'dist', 'main.js');
let main = fs.readFileSync(mainFile, 'utf8');
const routeMarker = 'if (method === "GET" && pathname === "/") {';
const workspaceRoutePatch = 'const workspaceRoutes={"/grow":"GROW","/money":"MONEY","/website-intelligence":"WEBSITE INTELLIGENCE","/whats-hot":"WHAT\'S HOT","/ask-silku":"ASK SILKU","/approvals":"APPROVALS","/creators":"CREATORS","/b2b":"B2B","/campaigns":"CAMPAIGNS","/analytics":"ANALYTICS","/operations":"OPERATIONS","/ads":"ADS"};const workspacePage=(title)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} · Silku Marketing HQ</title><style>body{margin:0;min-height:100vh;background:#09070d;color:#fff;font-family:Inter,system-ui,sans-serif;display:grid;place-items:center}.card{width:min(760px,calc(100% - 40px));padding:40px;border:1px solid #ffffff18;border-radius:28px;background:#ffffff08;box-shadow:0 30px 90px #0008}.eyebrow{text-transform:uppercase;letter-spacing:.16em;color:#bdb1c1;font-size:11px}.title{font-size:42px;font-weight:850;margin:10px 0 12px}.muted{color:#b9adbc;line-height:1.6}.back{display:inline-block;margin-top:22px;padding:11px 16px;border-radius:12px;background:#ffffff0d;border:1px solid #ffffff18;color:#fff;text-decoration:none}</style></head><body><main class="card"><div class="eyebrow">Silku Marketing HQ</div><div class="title">${title}</div><p class="muted">Workspace route is live and protected. The dedicated operational module will be wired in its scheduled build phase. No fake data or actions are exposed here.</p><a class="back" href="/">← Back to Command Center</a></main></body></html>`;if(method==="GET"&&workspaceRoutes[pathname]){if(!authorized(request)){response.statusCode=302;response.setHeader("location","/");response.end();return;}html(response,200,workspacePage(workspaceRoutes[pathname]));return;}\n  ';
if (!main.includes('const workspaceRoutes=')) {
  if (!main.includes(routeMarker)) throw new Error('HQ workspace server route marker not found');
  main = main.replace(routeMarker, workspaceRoutePatch + routeMarker);
}
fs.writeFileSync(mainFile, main);
console.log('HQ dashboard navigation and workspace routes patched');
