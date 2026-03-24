import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  // Netlify explicitly needs base: '/' for correct path resolution
  base: "/",

  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],

  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "client", "src"),
      "@shared": path.resolve(process.cwd(), "shared"),
      "@assets": path.resolve(process.cwd(), "attached_assets"),
    },
  },


  // Replit project ka root "client" folder
  root: path.resolve(process.cwd(), "client"),

  // Build output jo GitHub repo me upload karna hai
  build: {
    // dist/ ke andar final static site
    outDir: path.resolve(process.cwd(), "dist"),
    emptyOutDir: true,
    // Performance optimizations
    target: "esnext",
    minify: "esbuild", // Faster than terser
    cssMinify: true,
    sourcemap: false, // Disable in production for smaller bundles
    // CommonJS options for better compatibility with Lucide and other libs
    commonjsOptions: {
      transformMixedEsModules: true,
      ignoreDynamicRequires: true,
      // Force include lucide-react and all node_modules for proper bundling
      include: [/lucide-react/, /node_modules/],
    },
    // Code splitting optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes("node_modules")) {
            // React and core
            if (id.includes("react") || id.includes("react-dom") || id.includes("scheduler")) {
              return "vendor-react";
            }
            // Radix UI components (large library)
            if (id.includes("@radix-ui")) {
              return "vendor-radix";
            }
            // TanStack Query
            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }
            // Lucide icons - ensure proper bundling (inline to avoid dynamic import issues)
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            // Other large libraries
            if (id.includes("framer-motion") || id.includes("embla-carousel")) {
              return "vendor-animations";
            }
            // Everything else
            return "vendor";
          }
        },
        // Optimize chunk file names
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    // Chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
  },

  // Optimize deps for better build performance
  optimizeDeps: {
    include: [
      "lucide-react",
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@radix-ui/react-icons",
    ],
    esbuildOptions: {
      // Target ESNext for better compatibility
      target: "esnext",
    },
  },

  server: {
    port: 5174,
    host: "0.0.0.0",
    allowedHosts: true,
    strictPort: true, // Force port 5174, fail if taken
    // 🚀 STRIKE 104: Cache Exorcism - Prevent browser caching in dev
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:5002",
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path: string) => path,
        configure: (proxy: any) => {
          proxy.on('error', (err: any, _req: any, _res: any) => {
            console.error("[Vite Proxy Error]", err.code, err.message);
          });
          proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
            console.log("[Vite Proxy] Forwarding:", req.method, req.url, "->", proxyReq.path);
          });
        },
      },
    },
  },
});
