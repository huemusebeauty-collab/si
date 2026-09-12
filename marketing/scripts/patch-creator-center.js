const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(file, 'utf8');
if (!source.includes('const creator_center_1 = require("./creator-center");')) {
  source = source.replace(/"use strict";\n/, '"use strict";\nconst creator_center_1 = require("./creator-center");\n');
}
const pageMarker = 'if (method === "GET" && pathname === "/social") { if (!authorized(request)) { response.statusCode = 302; response.setHeader("location", "/"); response.end(); return; } html(response, 200, social_center_1.socialCenterHtml()); return; }';
const pageRoute = `${pageMarker} if (method === "GET" && pathname === "/creators") { if (!authorized(request)) { response.statusCode = 302; response.setHeader("location", "/"); response.end(); return; } html(response, 200, (0, creator_center_1.creatorCenterHtml)()); return; }`;
if (source.includes(pageMarker) && !source.includes('pathname === "/creators"')) source = source.replace(pageMarker, pageRoute);
else if (!source.includes('pathname === "/creators"')) throw new Error('Creator Center page route marker not found');
const apiMarker = 'if (method === "GET" && pathname === "/v1/social/dashboard") { json(response, 200, social.dashboard()); return; }';
const apiRoute = `${apiMarker} if (method === "GET" && pathname === "/v1/creators/dashboard") { json(response, 200, (0, creator_center_1.creatorCenterDashboard)(creators)); return; }`;
if (source.includes(apiMarker) && !source.includes('pathname === "/v1/creators/dashboard"')) source = source.replace(apiMarker, apiRoute);
else if (!source.includes('pathname === "/v1/creators/dashboard"')) throw new Error('Creator Center API route marker not found');
fs.writeFileSync(file, source);
console.log('Creator Center routes patched');
