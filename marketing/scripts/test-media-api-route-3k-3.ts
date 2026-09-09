import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const patch = await readFile(new URL("./patch-main.js", import.meta.url), "utf8");
const api = await readFile(new URL("../src/media-api.ts", import.meta.url), "utf8");
const repository = await readFile(new URL("../src/media-repository.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../migrations/002_marketing_hq_content_media.sql", import.meta.url), "utf8");

assert.ok(patch.includes('pathname === "/v1/media"'));
assert.ok(patch.includes('const mediaMatch = pathname.match'));
assert.match(patch, /mediaApi\.upload/);
assert.match(patch, /mediaApi\.preview/);
assert.match(patch, /mediaApi\.archive/);
assert.match(api, /dataBase64/);
assert.match(api, /storage\.put/);
assert.match(api, /storage\.get/);
assert.match(repository, /marketing_hq_media_assets/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS marketing_hq_media_assets/);
assert.doesNotMatch(api, /INSERT INTO marketing_hq_media_assets/);
console.log("3K-3 media API route contract test passed");
