import assert from "node:assert/strict";
import { createMediaStorageAdapter, MemoryMediaStorageAdapter, UnavailableMediaStorageAdapter } from "../src/media-storage";

const previousMode = process.env.MEDIA_STORAGE_MODE;

delete process.env.MEDIA_STORAGE_MODE;
assert.equal(createMediaStorageAdapter() instanceof UnavailableMediaStorageAdapter, true);

process.env.MEDIA_STORAGE_MODE = "memory";
assert.equal(createMediaStorageAdapter() instanceof MemoryMediaStorageAdapter, true);

process.env.MEDIA_STORAGE_MODE = "s3";
const missingBucket = createMediaStorageAdapter();
assert.equal(missingBucket instanceof UnavailableMediaStorageAdapter, true);

if (previousMode === undefined) delete process.env.MEDIA_STORAGE_MODE;
else process.env.MEDIA_STORAGE_MODE = previousMode;

console.log("3K-3 media storage configuration test passed");
