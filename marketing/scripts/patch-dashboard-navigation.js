const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let source = fs.readFileSync(file, 'utf8');

// Avoid the legacy $$ helper name. Some deployed/browser paths are resolving the
// double-dollar expression as a single-dollar helper, which makes .forEach fail.
// Use a normal named helper and native querySelectorAll instead.
if (source.includes('const $$=s=>Array.from(document.querySelectorAll(s));')) {
  source = source.replaceAll('$$', 'qsa');
}

const marker = "qsa('[data-jump]').forEach(x=>x.addEventListener('click',()=>jump(x.dataset.jump)));";
if (!source.includes(marker)) throw new Error('HQ navigation binding marker not found');

const navigationFix = "const routeMap={overview:'/',grow:'/grow',money:'/money',websiteIntel:'/website-intelligence',hotSection:'/whats-hot',director:'/ask-silku',content:'/content-studio',social:'/social',approvals:'/approvals',creators:'/creators',b2b:'/b2b',campaigns:'/campaigns',analytics:'/analytics',operations:'/operations',ads:'/ads'};const originalJump=jump;jump=function(id){const route=routeMap[id];if(route){location.href=route;return}toast('This workspace is not wired yet.');};const routeTargetMap={grow:'grow',money:'money',websiteIntel:'websiteIntel',hotSection:'hotSection',director:'director',approvals:'approvals',creators:'creators',b2b:'b2b',campaigns:'campaigns',analytics:'analytics',operations:'operations',ads:'ads'};const currentRoute=Object.keys(routeMap).find(k=>routeMap[k]===location.pathname);if(currentRoute&&routeTargetMap[currentRoute]){requestAnimationFrame(()=>originalJump(routeTargetMap[currentRoute]));}\n";
if (!source.includes('const routeMap={content:')) source = source.replace(marker, navigationFix + marker);

fs.writeFileSync(file, source);
console.log('HQ dashboard navigation patch applied');
