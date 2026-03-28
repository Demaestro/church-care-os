import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "server-only": path.resolve(
        process.cwd(),
        "tests/support/server-only-stub.js"
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    restoreMocks: true,
  },
});
