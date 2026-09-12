const fs = require('node:fs');
const path = require('node:path');

const mainFile = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(mainFile, 'utf8');

// This is intentionally a fresh final-stage patch. It does not create a
// placeholder workspace page: every workspace URL serves the same protected
// Command Center shell, and the browser navigation patch focuses its section.
const marker = 'if (method === "GET" && pathname === "/") {';
const routeCode = '/* SILKU_HQ_WORKSPACE_ROUTES_CLEAN */ const workspaceRoutesClean={"/grow":"grow","/money":"money","/website-intelligence":"websiteIntel","/whats-hot":"hotSection","/ask-silku":"director","/approvals":"approvals","/creators":"creators","/b2b":"b2b","/campaigns":"campaigns","/analytics":"analytics","/operations":"operations","/ads":"ads"};if(method==="GET"&&workspaceRoutesClean[pathname]){if(!authorized(request)){response.statusCode=302;response.setHeader("location","/");response.end();return;}html(response,200,dashboardHtml());return;}\n  ';

// Remove any earlier workspace-route patch left in the compiled file, then
// install exactly one clean route block before the root route.
source = source.replace(/\/\* HQ_WORKSPACE_ROUTES_V2 \*\/[\s\S]*?const workspaceRoutes=/, 'const workspaceRoutes=');
source = source.replace(/\/\* SILKU_HQ_WORKSPACE_ROUTES_CLEAN \*[\s\S]*?const workspaceRoutesClean=/, 'const workspaceRoutesClean=');

if (!source.includes('const workspaceRoutesClean=')) {
  if (!source.includes(marker)) throw new Error('HQ root route marker not found');
  source = source.replace(marker, routeCode + marker);
}

// Never let a stale proxy/browser cache resurrect an older placeholder shell.
const htmlOld = 'response.setHeader("content-type", "text/html; charset=utf-8");';
const htmlNew = 'response.setHeader("cache-control", "no-store, no-cache, must-revalidate, max-age=0");response.setHeader("pragma", "no-cache");response.setHeader("content-type", "text/html; charset=utf-8");';
if (source.includes(htmlOld) && !source.includes('response.setHeader("cache-control", "no-store, no-cache')) {
  source = source.replace(htmlOld, htmlNew);
}

fs.writeFileSync(mainFile, source);
console.log('SILKU HQ workspace routing rebuilt cleanly');
