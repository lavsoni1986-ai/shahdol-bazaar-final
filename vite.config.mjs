import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import history from "connect-history-api-fallback";
import path from "node:path";

export default defineConfig({
  root: "client",
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./client/src"),
      "@shared": path.resolve(process.cwd(), "./shared"),
    },
  },
  build: {
    outDir: "../dist/client",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("react-dom") || id.includes("/react/")) {
            return "vendor";
          }

          if (id.includes("@tanstack/react-query")) {
            return "query";
          }

          if (
            id.includes("recharts") ||
            id.includes("react-chartjs-2") ||
            id.includes("chart.js")
          ) {
            return "charts";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          if (id.includes("@radix-ui")) {
            return "radix";
          }

          const normalized = id.replace(/\\/g, "/");
          const marker = "/node_modules/";
          const markerIndex = normalized.lastIndexOf(marker);
          if (markerIndex !== -1) {
            let packagePath = normalized.slice(markerIndex + marker.length);
            if (packagePath.startsWith(".pnpm/")) {
              const pnpmPath = packagePath.slice(".pnpm/".length);
              const pnpmMarkerIndex = pnpmPath.lastIndexOf("/node_modules/");
              if (pnpmMarkerIndex !== -1) {
                packagePath = pnpmPath.slice(pnpmMarkerIndex + "/node_modules/".length);
              }
            }

            const segments = packagePath.split("/");
            const packageName =
              segments[0]?.startsWith("@") && segments.length > 1
                ? `${segments[0]}/${segments[1]}`
                : segments[0];

            if (packageName) {
              return `pkg-${packageName
                .replace(/[@\\/]/g, "-")
                .replace(/[^a-zA-Z0-9-]/g, "-")}`;
            }
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5174,
    fs: {
      allow: [path.resolve(process.cwd(), ".")],
    },
    proxy: {
      "/api": {
        target: "http://localhost:5002",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.headers["x-district-slug"]) {
              proxyReq.setHeader("x-district-slug", req.headers["x-district-slug"]);
            }
          });
        },
      },
      "/districts": {
        target: "http://localhost:5002",
        changeOrigin: true,
        secure: false,
      },
    },
    middlewareMode: false,
    setupMiddlewares(middlewares) {
      middlewares.unshift(history());
      return middlewares;
    },
  },
});

