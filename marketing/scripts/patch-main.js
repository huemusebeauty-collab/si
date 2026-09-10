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
  source = source.replace(/"use strict";\n/, '"use strict";\nconst media_api_1 = require("./media-api");\nconst media_repository_1 = require("./media-repository");\nconst media_storage_1 = require("./media-storage");\nconst content_version_api_1 = require("./content-version-api");\nconst content_version_repository_1 = require("./content-version-repository");\n');
}
if (!source.includes('const publishing_pipeline_1 = require("./publishing-pipeline");')) {
  source = source.replace(/"use strict";\n/, '"use strict";\nconst publishing_pipeline_1 = require("./publishing-pipeline");\nconst publishing_audit_1 = require("./publishing-audit");\nconst marketing_lifecycle_1 = require("./marketing-lifecycle");\n');
}
const mediaInit = 'const mediaRepository = new media_repository_1.NeonMediaRepository();\nconst contentVersionRepository = new content_version_repository_1.NeonContentVersionRepository();\nconst mediaApi = new media_api_1.MediaApi(mediaRepository, (0, media_storage_1.createMediaStorageAdapter)(), contentVersionRepository);\nconst contentVersionApi = new content_version_api_1.ContentVersionApi(domainStore, contentVersionRepository);';
if (!source.includes('const mediaRepository = new media_repository_1.NeonMediaRepository();')) {
  if (!source.includes(importsMarker)) throw new Error('HQ media initialization marker not found');
  source = source.replace(importsMarker, `${importsMarker}\n${mediaInit}`);
} else {
  source = source.replace(/const mediaApi = new media_api_1\.MediaApi\(mediaRepository, new media_storage_1\.MemoryMediaStorageAdapter\(\)\);/, 'const mediaApi = new media_api_1.MediaApi(mediaRepository, (0, media_storage_1.createMediaStorageAdapter)(), contentVersionRepository);');
  source = source.replace(/const mediaApi = new media_api_1\.MediaApi\(mediaRepository, \(0, media_storage_1\.createMediaStorageAdapter\)\(\)\);/, 'const mediaApi = new media_api_1.MediaApi(mediaRepository, (0, media_storage_1.createMediaStorageAdapter)(), contentVersionRepository);');
  if (!source.includes('const contentVersionRepository = new content_version_repository_1.NeonContentVersionRepository();')) source = source.replace('const mediaRepository = new media_repository_1.NeonMediaRepository();', 'const mediaRepository = new media_repository_1.NeonMediaRepository();\nconst contentVersionRepository = new content_version_repository_1.NeonContentVersionRepository();');
  if (!source.includes('const contentVersionApi = new content_version_api_1.ContentVersionApi')) source = source.replace('const contentVersionRepository = new content_version_repository_1.NeonContentVersionRepository();', 'const contentVersionRepository = new content_version_repository_1.NeonContentVersionRepository();\nconst contentVersionApi = new content_version_api_1.ContentVersionApi(domainStore, contentVersionRepository);');
}
const publishingInit = 'const publishingLifecycle = new marketing_lifecycle_1.MarketingLifecycleService(domainStore);\nconst publishingAuditRepository = new publishing_audit_1.NeonPublishingAuditRepository();\nconst publishingPipeline = new publishing_pipeline_1.PublishingPipelineService(publishingLifecycle, contentVersionRepository, publishingAuditRepository);';
if (!source.includes('const publishingPipeline = new publishing_pipeline_1.PublishingPipelineService')) {
  if (!source.includes('const contentVersionApi = new content_version_api_1.ContentVersionApi')) throw new Error('HQ publishing initialization marker not found');
  source = source.replace('const contentVersionApi = new content_version_api_1.ContentVersionApi(domainStore, contentVersionRepository);', `const contentVersionApi = new content_version_api_1.ContentVersionApi(domainStore, contentVersionRepository);\n${publishingInit}`);
}
const startupMarker = 'Promise.all([security.hydrate(), domainStore.hydrate()])';
if (source.includes(startupMarker) && !source.includes('contentVersionRepository.hydrate()')) source = source.replace(startupMarker, 'Promise.all([security.hydrate(), domainStore.hydrate(), mediaRepository.hydrate(), contentVersionRepository.hydrate()])');
const routeMarker = 'json(response, 404, { ok: false, error: "Not found" });';
const routePatch = 'if (method === "POST" && pathname === "/v1/media") { const result = await mediaApi.upload(await readJson(request)); json(response, result.ok ? 201 : 400, result); return; }\n    if (method === "GET" && pathname === "/v1/media") { json(response, 200, mediaApi.list()); return; }\n    const mediaMatch = pathname.match(/^\\/v1\\/media\\/([^/]+)(?:\\/(preview|archive))?$/);\n    if (mediaMatch) { if (method === "GET" && mediaMatch[2] === "preview") { const result = await mediaApi.preview(mediaMatch[1]); json(response, result.ok ? 200 : 404, result); return; } if (method === "POST" && mediaMatch[2] === "archive") { const result = await mediaApi.archive(mediaMatch[1]); json(response, result.ok ? 200 : 404, result); return; } if (method === "GET") { const result = mediaApi.get(mediaMatch[1]); json(response, result.ok ? 200 : 404, result); return; } }\n    const versionMatch = pathname.match(/^\\/v1\\/content\\/([^/]+)\\/versions(?:\\/([^/]+))?$/);\n    if (versionMatch) { if (method === "POST" && !versionMatch[2]) { const result = await contentVersionApi.create(versionMatch[1], await readJson(request)); json(response, result.ok ? 201 : 400, result); return; } if (method === "GET" && versionMatch[2]) { const result = contentVersionApi.get(versionMatch[2]); json(response, result.ok ? 200 : 404, result); return; } if (method === "GET") { json(response, 200, contentVersionApi.list(versionMatch[1])); return; } }\n  ';
if (source.includes(routeMarker) && !source.includes('const versionMatch =')) source = source.replace(routeMarker, `${routePatch}${routeMarker}`);
else if (!source.includes('const versionMatch =')) throw new Error('HQ version route marker not found');
const publishingRouteMarker = 'const versionMatch = pathname.match';
const publishingRoutes = 'if (method === "POST" && pathname.startsWith("/v1/content/") && pathname.endsWith("/publishing")) { const contentMatch = pathname.match(/^\\/v1\\/content\\/([^/]+)\\/publishing$/); if (!contentMatch) { json(response, 404, { ok: false, error: "Not found" }); return; } const body = await readJson(request); const content = domainStore.getContent(contentMatch[1]); if (!content) { json(response, 404, { ok: false, error: "Content not found" }); return; } if (typeof body.versionId !== "string" || typeof body.actor !== "string" || typeof body.status !== "string") { json(response, 400, { ok: false, error: "status, versionId, and actor are required" }); return; } try { const result = await publishingPipeline.transition(content, body.status, body.actor, body.versionId); json(response, 200, { ok: true, data: result }); } catch (error) { json(response, 400, { ok: false, error: error instanceof Error ? error.message : "Publishing transition failed" }); } return; }\n    if (method === "GET" && pathname.startsWith("/v1/content/") && pathname.endsWith("/publishing-audit")) { const contentMatch = pathname.match(/^\\/v1\\/content\\/([^/]+)\\/publishing-audit$/); if (!contentMatch) { json(response, 404, { ok: false, error: "Not found" }); return; } json(response, 200, { ok: true, data: await publishingPipeline.getAudit(contentMatch[1]) }); return; }\n    ';
if (source.includes(publishingRouteMarker) && !source.includes('/publishing-audit')) source = source.replace(publishingRouteMarker, `${publishingRoutes}${publishingRouteMarker}`);
fs.writeFileSync(file, source);
console.log('HQ durable approval, media, content version, and publishing patches applied');
