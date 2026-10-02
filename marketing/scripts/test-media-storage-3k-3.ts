import assert from "node:assert/strict";
import { createMediaStorageAdapter, MemoryMediaStorageAdapter, UnavailableMediaStorageAdapter } from "../src/media-storage";

const previous = {
  mode: process.env.MEDIA_STORAGE_MODE,
  bucket: process.env.MEDIA_STORAGE_BUCKET,
  awsBucket: process.env.AWS_S3_BUCKET,
};

const restore = (key: keyof typeof previous) => {
  const value = previous[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};

try {
  delete process.env.MEDIA_STORAGE_MODE;
  delete process.env.MEDIA_STORAGE_BUCKET;
  delete process.env.AWS_S3_BUCKET;
  assert.equal(createMediaStorageAdapter() instanceof UnavailableMediaStorageAdapter, true);

  process.env.MEDIA_STORAGE_MODE = "memory";
  assert.equal(createMediaStorageAdapter() instanceof MemoryMediaStorageAdapter, true);

  process.env.MEDIA_STORAGE_MODE = "s3";
  delete process.env.MEDIA_STORAGE_BUCKET;
  delete process.env.AWS_S3_BUCKET;
  const missingBucket = createMediaStorageAdapter();
  assert.equal(missingBucket instanceof UnavailableMediaStorageAdapter, true);
} finally {
  restore("mode");
  restore("bucket");
  restore("awsBucket");
}

console.log("3K-3 media storage configuration test passed");
