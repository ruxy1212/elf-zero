import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://172.25.224.149:3001";
const WS_BACKEND_URL = process.env.VITE_WS_BACKEND_URL || "ws://172.25.224.149:3001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "process.env": {},
    global: "globalThis",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      "/health": {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      "/ws": {
        target: WS_BACKEND_URL,
        ws: true,
      },
    },
  },
});
