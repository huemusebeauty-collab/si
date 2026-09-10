const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let source = fs.readFileSync(file, 'utf8');

const marker = "$$('[data-jump]').forEach(x=>x.addEventListener('click',()=>jump(x.dataset.jump)));";
if (!source.includes(marker)) throw new Error('HQ navigation binding marker not found');

const navigationFix = "const routeMap={content:'/content-studio',social:'/social'};const originalJump=jump;jump=function(id){const target=document.getElementById(id);if(target)return originalJump(id);const route=routeMap[id];if(route){location.href=route;return}toast('This workspace is not wired yet.');};\n";
if (!source.includes('const routeMap={content:')) source = source.replace(marker, navigationFix + marker);

fs.writeFileSync(file, source);
console.log('HQ dashboard navigation patch applied');
