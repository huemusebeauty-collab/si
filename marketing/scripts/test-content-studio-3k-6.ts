import fs from 'node:fs';
import path from 'node:path';

const scriptsDir = path.resolve(process.cwd(), 'scripts');
const patch = fs.readFileSync(path.join(scriptsDir, 'patch-content-studio.js'), 'utf8');
const ui = fs.readFileSync(path.join(scriptsDir, 'content-studio-ui.js'), 'utf8');
for (const marker of ['pathname === "/content-studio"', 'contentStudioHtml()']) {
  if (!patch.includes(marker)) throw new Error(`Missing patch marker: ${marker}`);
}
for (const marker of ['/v1/domain/content', '/v1/content/', '/v1/media', 'Create version', 'Attach media', 'Silku Phase 4']) {
  if (!ui.includes(marker)) throw new Error(`Missing Content Studio capability: ${marker}`);
}
console.log(JSON.stringify({ ok: true, test: 'content-studio-3k-6' }));
