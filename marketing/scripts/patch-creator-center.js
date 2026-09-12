const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(file, 'utf8');

const importLine = 'const creator_center_1 = require("./creator-center");';
if (!source.includes(importLine)) {
  source = source.replace('"use strict";\n', `"use strict";\n${importLine}\n`);
}

if (!source.includes('pathname === "/creators"')) {
  const marker = 'if (method === "GET" && pathname === "/social")';
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error('Social Center route marker not found');
  const blockEnd = source.indexOf('return; }', markerIndex);
  if (blockEnd < 0) throw new Error('Social Center route end not found');
  const end = blockEnd + 'return; }'.length;
  const creatorRoute = ` if (method === "GET" && pathname === "/creators") { if (!authorized(request)) { response.statusCode = 302; response.setHeader("location", "/"); response.end(); return; } html(response, 200, (0, creator_center_1.creatorCenterHtml)()); return; }`;
  source = source.slice(0, end) + creatorRoute + source.slice(end);
}

if (!source.includes('pathname === "/v1/creators/dashboard"')) {
  const marker = 'if (method === "GET" && pathname === "/v1/social/dashboard")';
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error('Social dashboard API route marker not found');
  const blockEnd = source.indexOf('return; }', markerIndex);
  if (blockEnd < 0) throw new Error('Social dashboard API route end not found');
  const end = blockEnd + 'return; }'.length;
  const creatorApi = ` if (method === "GET" && pathname === "/v1/creators/dashboard") { json(response, 200, (0, creator_center_1.creatorCenterDashboard)(creators)); return; }`;
  source = source.slice(0, end) + creatorApi + source.slice(end);
}

fs.writeFileSync(file, source);
console.log('Creator Center routes patched');
