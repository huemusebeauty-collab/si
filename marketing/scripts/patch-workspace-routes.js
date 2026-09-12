const fs = require('node:fs');
const path = require('node:path');

const mainFile = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(mainFile, 'utf8');

if (!source.includes('HQ_WORKSPACE_ROUTES_V2')) {
  const routePatch = '/* HQ_WORKSPACE_ROUTES_V2 */ const workspaceRoutesV2={"/grow":"grow","/money":"money","/website-intelligence":"websiteIntel","/whats-hot":"hotSection","/ask-silku":"director","/approvals":"approvals","/creators":"creators","/b2b":"b2b","/campaigns":"campaigns","/analytics":"analytics","/operations":"operations","/ads":"ads"};if(method==="GET"&&workspaceRoutesV2[pathname]){if(!authorized(request)){response.statusCode=302;response.setHeader("location","/");response.end();return;}html(response,200,require("./dashboard-ui").dashboardHtml());return;}\n  ';
  const existingRouteMarker = 'const workspaceRoutes=';
  if (source.includes(existingRouteMarker)) {
    source = source.replace(existingRouteMarker, `${routePatch}${existingRouteMarker}`);
  } else {
    const rootMarker = 'if (method === "GET" && pathname === "/") {';
    if (!source.includes(rootMarker)) throw new Error('HQ root route marker not found');
    source = source.replace(rootMarker, `${routePatch}${rootMarker}`);
  }
}

// Prevent browsers/proxies from serving an older HQ workspace shell after a deploy.
const htmlMarker = 'const html=(response,status,body)=>{response.statusCode=status;response.setHeader("content-type","text/html; charset=utf-8");response.end(body);};';
const htmlNoStore = 'const html=(response,status,body)=>{response.statusCode=status;response.setHeader("cache-control","no-store, no-cache, must-revalidate, max-age=0");response.setHeader("pragma","no-cache");response.setHeader("content-type","text/html; charset=utf-8");response.end(body);};';
if (source.includes(htmlMarker)) source = source.replace(htmlMarker, htmlNoStore);

fs.writeFileSync(mainFile, source);
console.log('HQ workspace routes and no-store HTML caching patched after all main.js mutations');
