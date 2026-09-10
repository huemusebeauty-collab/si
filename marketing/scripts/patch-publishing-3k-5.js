const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(file, 'utf8');
const imports = 'const marketing_lifecycle_1 = require("./marketing-lifecycle");\nconst content_version_repository_1 = require("./content-version-repository");\nconst publishing_audit_1 = require("./publishing-audit");\nconst publishing_pipeline_1 = require("./publishing-pipeline");\n';
if (!source.includes('const publishing_pipeline_1 = require("./publishing-pipeline");')) source = source.replace('"use strict";\n', '"use strict";\n' + imports);
const initMarker = 'const dashboard = new marketing_hq_dashboard_1.MarketingHqDashboard();';
const init = 'const publishingVersionRepository = new content_version_repository_1.NeonContentVersionRepository();\nconst publishingAuditRepository = new publishing_audit_1.NeonPublishingAuditRepository();\nconst publishingPipeline = new publishing_pipeline_1.PublishingPipelineService(new marketing_lifecycle_1.MarketingLifecycleService(domainStore), publishingVersionRepository, publishingAuditRepository);';
if (!source.includes('const publishingPipeline = new publishing_pipeline_1.PublishingPipelineService')) {
  if (!source.includes(initMarker)) throw new Error('Publishing initialization marker not found');
  source = source.replace(initMarker, initMarker + '\n' + init);
}
const hydrateMarker = 'Promise.all([security.hydrate(), domainStore.hydrate()])';
if (source.includes(hydrateMarker) && !source.includes('publishingVersionRepository.hydrate()')) {
  source = source.replace(hydrateMarker, 'Promise.all([security.hydrate(), domainStore.hydrate(), publishingVersionRepository.hydrate()])');
}
const routeMarker = 'json(response, 404, { ok: false, error: "Not found" });';
const routes = 'const publishMatch = pathname.match(/^\\/v1\\/content\\/([^/]+)\\/publish$/);\n  if (method === "POST" && publishMatch) { const body = await readJson(request); const current = domainStore.getContent(publishMatch[1]); if (!current) { json(response, 404, { ok: false, error: "Content not found" }); return; } try { const result = await publishingPipeline.publish(current, typeof body.actor === "string" ? body.actor : "marketing-hq", typeof body.expectedVersionId === "string" ? body.expectedVersionId : ""); json(response, 200, { ok: true, data: result }); } catch (error) { json(response, 400, { ok: false, error: error instanceof Error ? error.message : "Publish failed" }); } return; }\n  const auditMatch = pathname.match(/^\\/v1\\/content\\/([^/]+)\\/publishing-audit$/);\n  if (method === "GET" && auditMatch) { try { json(response, 200, { ok: true, data: await publishingPipeline.getAudit(auditMatch[1]) }); } catch (error) { json(response, 500, { ok: false, error: error instanceof Error ? error.message : "Audit lookup failed" }); } return; }\n  ';
if (!source.includes('/v1/content/') && source.includes(routeMarker)) source = source.replace(routeMarker, routes + routeMarker);
else if (!source.includes('/v1/content/')) throw new Error('Publishing route marker not found');
fs.writeFileSync(file, source);
console.log('3K-5 publishing routes and durable audit wiring applied');
