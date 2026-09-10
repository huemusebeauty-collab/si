const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let source = fs.readFileSync(file, 'utf8');

// Dashboard navigation is already handled by patch-dashboard-navigation.js.
// Keep this legacy patch idempotent so it never breaks a production build when
// the content button has already been transformed by the earlier patch.
const current = '<button type="button" class="nav" data-jump="content"><b>📝 CONTENT</b><span>Content workspace foundation</span></button>';
const replacement = '<button type="button" class="nav" id="contentStudioNav"><b>📝 CONTENT</b><span>Open Content Studio</span></button>';

if (source.includes(current)) {
  source = source.replace(current, replacement);
}

// If the content button was already replaced, leave it untouched. The primary
// dashboard navigation patch owns the click binding and route map.
fs.writeFileSync(file, source);
console.log('Content workspace navigation patch applied');
