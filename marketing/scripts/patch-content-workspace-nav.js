const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let source = fs.readFileSync(file, 'utf8');

const current = '<button type="button" class="nav" data-jump="content"><b>📝 CONTENT</b><span>Content workspace foundation</span></button>';
const replacement = '<button type="button" class="nav" id="contentStudioNav"><b>📝 CONTENT</b><span>Open Content Studio</span></button>';
if (!source.includes(current)) throw new Error('Content workspace navigation marker not found');
source = source.replace(current, replacement);

const listenerMarker = "$$('[data-jump]').forEach(x=>x.addEventListener('click',()=>jump(x.dataset.jump)));";
const listener = "$('#contentStudioNav').addEventListener('click',()=>{location.href='/content-studio'});";
if (!source.includes(listenerMarker)) throw new Error('Dashboard navigation listener marker not found');
if (!source.includes(listener)) source = source.replace(listenerMarker, listenerMarker + listener);

fs.writeFileSync(file, source);
console.log('Content workspace navigation patched');
