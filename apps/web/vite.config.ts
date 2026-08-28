import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/apps/web/src/lib/api.ts")) return "api-client";
          if (id.includes("/packages/shared/")) return "shared-schemas";
          if (id.includes("/node_modules/@tanstack/")) return "vendor-query";
          if (id.includes("/node_modules/react-router") || id.includes("/node_modules/@remix-run/")) return "vendor-router";
          if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/") || id.includes("/node_modules/scheduler/")) return "vendor-react";
          if (id.includes("/node_modules/zod/")) return "vendor-validation";
          if (id.includes("/node_modules/lucide-react/")) return "vendor-icons";
          if (id.includes("/node_modules/leaflet/")) return "vendor-maps";
          if (id.includes("/node_modules/@zxing/") || id.includes("/node_modules/qrcode/")) return "vendor-scanning";
        },
      },
    },
  },
  server: {
    port: 5173
  }
});
