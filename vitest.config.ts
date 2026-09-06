import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Sprint 2.10 — coverage reporting configured; no enforced threshold
      // yet (component set is still foundation-stage, not business logic).
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
