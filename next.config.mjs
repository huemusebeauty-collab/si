/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sprint 9 — Production Deployment: required for the production
  // Dockerfile (infrastructure/docker/Dockerfile.frontend) to work at
  // all — without this, `.next/standalone` is never generated. Found
  // by actually checking this file before writing the Dockerfile that
  // depends on it, not assumed to already be set.
  output: "standalone",
  // Sprint 2.8 — Frontend Performance: image optimization defaults.
  images: {
    formats: ["image/avif", "image/webp"],
    // Sprint 9 — Sprint 3.8's StorageService (S3/MinIO) now exists,
    // so this is no longer an empty placeholder — points at the same
    // STORAGE_ENDPOINT the backend uses (see .env.production.example),
    // read from an environment variable rather than hardcoded so
    // staging/production can point at different storage hosts.
    remotePatterns: process.env.NEXT_PUBLIC_STORAGE_HOST
      ? [{ protocol: "https", hostname: process.env.NEXT_PUBLIC_STORAGE_HOST }]
      : [],
  },
  // Sprint 2.8 — Frontend Performance: compression at the framework level;
  // CDN-level compression is a Sprint 3+/deployment concern (out of scope).
  compress: true,
};

export default nextConfig;
