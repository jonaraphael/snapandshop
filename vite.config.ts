import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const normalizeBasePath = (value: string | undefined): string => {
  if (!value || value === "/") {
    return "/";
  }
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

export default defineConfig({
  base: normalizeBasePath(process.env.VITE_BASE_PATH),
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/apple-touch-icon.png",
        "icons/favicon-32x32.png",
        "icons/favicon-16x16.png"
      ],
      manifest: {
        name: "Snap&Shop",
        short_name: "Snap&Shop",
        description: "Take a picture of a recipe or your handwritten shopping list, and get a sorted grocery list instantly.",
        theme_color: "#2f4f1f",
        background_color: "#f4f0e6",
        display: "standalone",
        start_url: normalizeBasePath(process.env.VITE_BASE_PATH),
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
  worker: {
    format: "es"
  }
});
