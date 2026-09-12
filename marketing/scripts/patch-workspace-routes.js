const fs = require('node:fs');
const path = require('node:path');

const mainFile = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(mainFile, 'utf8');

// Final-stage route patch. All workspace URLs use the real protected HQ
// Command Center shell. No placeholder workspace page is generated.
const marker = 'if (method === "GET" && pathname === "/") {';
const routeCode = '/* SILKU_HQ_WORKSPACE_ROUTES_CLEAN_V3 */ const workspaceRoutesClean={"/grow":"grow","/money":"money","/website-intelligence":"websiteIntel","/whats-hot":"hotSection","/ask-silku":"director","/approvals":"approvals","/creators":"creators","/b2b":"b2b","/campaigns":"campaigns","/analytics":"analytics","/operations":"operations","/ads":"ads"};if(method==="GET"&&workspaceRoutesClean[pathname]){if(!authorized(request)){response.statusCode=302;response.setHeader("location","/");response.end();return;}html(response,200,require("./dashboard-ui").dashboardHtml());return;}\n  ';

// Remove older generated route blocks so only this clean implementation can win.
source = source.replace(/\/\* HQ_WORKSPACE_ROUTES_V2 \*\/[\s\S]*?if\(method===\"GET\"&&workspaceRoutesV2\[pathname\]\)[\s\S]*?return;\}\n  /, '');
source = source.replace(/\/\* SILKU_HQ_WORKSPACE_ROUTES_CLEAN \*\/[\s\S]*?if\(method===\"GET\"&&workspaceRoutesClean\[pathname\]\)[\s\S]*?return;\}\n  /, '');
source = source.replace(/\/\* SILKU_HQ_WORKSPACE_ROUTES_CLEAN_V2 \*\/[\s\S]*?if\(method===\"GET\"&&workspaceRoutesClean\[pathname\]\)[\s\S]*?return;\}\n  /, '');
source = source.replace(/\/\* SILKU_HQ_WORKSPACE_ROUTES_CLEAN_V3 \*\/[\s\S]*?if\(method===\"GET\"&&workspaceRoutesClean\[pathname\]\)[\s\S]*?return;\}\n  /, '');

if (!source.includes('const workspaceRoutesClean=')) {
  if (!source.includes(marker)) throw new Error('HQ root route marker not found');
  source = source.replace(marker, routeCode + marker);
}

// Stop browser/proxy caches from restoring an older HQ shell.
const htmlMarker = 'response.setHeader("content-type", "text/html; charset=utf-8");';
if (source.includes(htmlMarker) && !source.includes('cache-control","no-store')) {
  source = source.replace(htmlMarker, 'response.setHeader("cache-control", "no-store, no-cache, must-revalidate, max-age=0");response.setHeader("pragma","no-cache");' + htmlMarker);
}

fs.writeFileSync(mainFile, source);

// The operational dashboard patch historically injected a loadOperations()
// call into the browser bundle. The current dashboard does not require that
// legacy helper for the core Command Center, so neutralize any stale calls in
// the final compiled bundle. This prevents an old generated reference from
// breaking the entire dashboard at page-load time.
const dashboardFile = path.join(__dirname, '..', 'dist', 'dashboard-ui.js');
let dashboard = fs.readFileSync(dashboardFile, 'utf8');
dashboard = dashboard.replace(/(?<![\w$.])loadOperations\(\)/g, 'Promise.resolve()');
fs.writeFileSync(dashboardFile, dashboard);

console.log('SILKU HQ workspace routes rebuilt and legacy operations loader guarded');
