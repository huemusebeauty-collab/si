const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let source = fs.readFileSync(file, 'utf8');

// Keep the CONTENT card on the dashboard's data-jump navigation path so the
// primary navigation patch can bind the click handler and route it to Content Studio.
const current = '<button type="button" class="nav" data-jump="content"><b>📝 CONTENT</b><span>Content workspace foundation</span></button>';
const replacement = '<button type="button" class="nav" data-jump="content"><b>📝 CONTENT</b><span>Open Content Studio</span></button>';

if (source.includes(current)) {
  source = source.replace(current, replacement);
}

fs.writeFileSync(file, source);
console.log('Content workspace navigation patch applied');
