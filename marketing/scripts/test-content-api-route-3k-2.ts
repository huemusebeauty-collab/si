import { readFileSync } from "node:fs";
import { join } from "node:path";

const mainSource = readFileSync(join(__dirname, "..", "src", "main.ts"), "utf8");
const domainApiSource = readFileSync(join(__dirname, "..", "src", "marketing-domain-api.ts"), "utf8");
const lifecycleSource = readFileSync(join(__dirname, "..", "src", "marketing-lifecycle.ts"), "utf8");

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

assert(mainSource.includes('if (method === "PATCH" && kind === "content" && id && !pathname.endsWith("/status"))'), "PATCH content route is not exposed");
assert(mainSource.includes("domainApi.editContent(id, await readJson(request))"), "PATCH content route does not delegate to editContent");
assert(mainSource.includes('if (!pathname.startsWith("/v1/") || !requireAuth(request, response)) return;'), "Content route is not protected by Marketing HQ authentication boundary");
assert(domainApiSource.includes("async editContent(id: string, body: Record<string, unknown>)"), "Domain API editContent method is missing");
assert(domainApiSource.includes("return ok(await this.lifecycle.editContent(id, patch));"), "Domain API editContent does not delegate to lifecycle");
assert(lifecycleSource.includes('Published content is immutable; create a new version instead'), "Published-content immutability guard is missing");
assert(lifecycleSource.includes("export const CONTENT_STATUS_TRANSITIONS"), "Content lifecycle transition map is missing");

console.log("3K-2 content API route contract test passed");
