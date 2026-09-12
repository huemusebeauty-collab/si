const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(file, 'utf8');
if (!source.includes('const creator_center_1 = require("./creator-center");')) {
  source = source.replace(/"use strict";\n/, '"use strict";\nconst creator_center_1 = require("./creator-center");\n');
}
if (!source.includes('pathname === "/creators"')) {
  const pagePattern = /if \(method === "GET" && pathname === "\/social"\) \{[\s\S]*?socialCenterHtml\(\)[\s\S]*?return; \}/;
  const pageMatch = source.match(pagePattern);
  if (!pageMatch) throw new Error('Creator Center page route marker not found');
  const pageRoute = `${pageMatch[0]} if (method === "GET" && pathname === "/creators") { if (!authorized(request)) { response.statusCode = 302; response.setHeader("location", "/"); response.end(); return; } html(response, 200, (0, creator_center_1.creatorCenterHtml)()); return; }`;
  source = source.replace(pageMatch[0], pageRoute);
}
if (!source.includes('pathname === "/v1/creators/dashboard"')) {
  const apiPattern = /if \(method === "GET" && pathname === "\/v1\/social\/dashboard"\) \{[\s\S]*?social\.dashboard\(\)[\s\S]*?return; \}/;
  const apiMatch = source.match(apiPattern);
  if (!apiMatch) throw new Error('Creator Center API route marker not found');
  const apiRoute = `${apiMatch[0]} if (method === "GET" && pathname === "/v1/creators/dashboard") { json(response, 200, (0, creator_center_1.creatorCenterDashboard)(creators)); return; }`;
  source = source.replace(apiMatch[0], apiRoute);
}
fs.writeFileSync(file, source);
console.log('Creator Center routes patched');
