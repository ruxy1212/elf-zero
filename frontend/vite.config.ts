import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "child_process";

function getWslIp(): string {
  try {
    const ip = execSync("wsl -d Ubuntu hostname -I").toString().trim().split(" ")[0];
    if (ip && ip.length > 6) {
      return ip;
    }
  } catch {
    // fallback
  }
  return "127.0.0.1";
}

const wslIp = getWslIp();
const BACKEND_URL = process.env.VITE_BACKEND_URL || `http://${wslIp}:3001`;
const WS_BACKEND_URL = process.env.VITE_WS_BACKEND_URL || `ws://${wslIp}:3001`;

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
