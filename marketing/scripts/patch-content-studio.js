const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const mainFile = path.join(dist, 'main.js');
const uiSource = path.join(__dirname, 'content-studio-ui.js');
const uiDest = path.join(dist, 'content-studio-ui.js');
fs.copyFileSync(uiSource, uiDest);
let source = fs.readFileSync(mainFile, 'utf8');
const requireLine = 'const content_studio_ui_1 = require("./content-studio-ui");';
if (!source.includes(requireLine)) source = source.replace(/"use strict";\n/, `"use strict";\n${requireLine}\n`);
const healthMarker = 'if (method === "GET" && (pathname === "/health" || pathname === "/v1/health"))';
const route = 'if (method === "GET" && pathname === "/content-studio") { if (!authorized(request)) { response.statusCode = 302; response.setHeader("location", "/"); response.end(); return; } html(response, 200, content_studio_ui_1.contentStudioHtml()); return; }\n  ';
if (!source.includes('pathname === "/content-studio"')) {
  if (!source.includes(healthMarker)) throw new Error('Content Studio health route marker not found');
  source = source.replace(healthMarker, `${route}${healthMarker}`);
}
fs.writeFileSync(mainFile, source);
console.log('Content Studio route patched');
