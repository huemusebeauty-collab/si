const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(file, 'utf8');
const replacements = [
  ['marketing.requestApproval(await readJson(request))', 'await marketing.requestApprovalDurable(await readJson(request))'],
  ['marketing.approve(approvalMatch[1], body)', 'await marketing.decideApprovalDurable(approvalMatch[1], "approved", body.actor ?? "marketing-hq")'],
  ['marketing.reject(approvalMatch[1], body)', 'await marketing.decideApprovalDurable(approvalMatch[1], "rejected", body.actor ?? "marketing-hq")'],
];
for (const [from, to] of replacements) {
  if (source.includes(from)) source = source.replace(from, to);
  else if (!source.includes(to)) throw new Error(`HQ durable route marker not found: ${from}`);
}
const importsMarker = 'const dashboard = new marketing_hq_dashboard_1.MarketingHqDashboard();';
if (!source.includes('const media_api_1 = require("./media-api");')) {
  source = source.replace(/"use strict";\n/, '"use strict";\nconst media_api_1 = require("./media-api");\nconst media_repository_1 = require("./media-repository");\nconst media_storage_1 = require("./media-storage");\n');
}
const mediaInit = 'const mediaRepository = new media_repository_1.NeonMediaRepository();\nconst mediaApi = new media_api_1.MediaApi(mediaRepository, (0, media_storage_1.createMediaStorageAdapter)());';
if (!source.includes('const mediaRepository = new media_repository_1.NeonMediaRepository();')) {
  if (!source.includes(importsMarker)) throw new Error('HQ media initialization marker not found');
  source = source.replace(importsMarker, `${importsMarker}\n${mediaInit}`);
} else {
  source = source.replace(/const mediaApi = new media_api_1\.MediaApi\(mediaRepository, new media_storage_1\.MemoryMediaStorageAdapter\(\)\);/, 'const mediaApi = new media_api_1.MediaApi(mediaRepository, (0, media_storage_1.createMediaStorageAdapter)());');
}
const startupMarker = 'Promise.all([security.hydrate(), domainStore.hydrate()])';
if (source.includes(startupMarker) && !source.includes('mediaRepository.hydrate()')) source = source.replace(startupMarker, 'Promise.all([security.hydrate(), domainStore.hydrate(), mediaRepository.hydrate()])');
const routeMarker = 'json(response, 404, { ok: false, error: "Not found" });';
const routePatch = 'if (method === "POST" && pathname === "/v1/media") { const result = await mediaApi.upload(await readJson(request)); json(response, result.ok ? 201 : 400, result); return; }\n    if (method === "GET" && pathname === "/v1/media") { json(response, 200, mediaApi.list()); return; }\n    const mediaMatch = pathname.match(/^\\/v1\\/media\\/([^/]+)(?:\\/(preview|archive))?$/);\n    if (mediaMatch) { if (method === "GET" && mediaMatch[2] === "preview") { const result = await mediaApi.preview(mediaMatch[1]); json(response, result.ok ? 200 : 404, result); return; } if (method === "POST" && mediaMatch[2] === "archive") { const result = await mediaApi.archive(mediaMatch[1]); json(response, result.ok ? 200 : 404, result); return; } if (method === "GET") { const result = mediaApi.get(mediaMatch[1]); json(response, result.ok ? 200 : 404, result); return; } }\n  ';
if (source.includes(routeMarker) && !source.includes('pathname === "/v1/media"')) source = source.replace(routeMarker, `${routePatch}${routeMarker}`);
else if (!source.includes('pathname === "/v1/media"')) throw new Error('HQ media route marker not found');
fs.writeFileSync(file, source);
console.log('HQ durable approval and media route patches applied');
