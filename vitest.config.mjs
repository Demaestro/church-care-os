import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "server-only": path.resolve(rootDir, "tests/support/server-only-stub.js"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    restoreMocks: true,
  },
});
