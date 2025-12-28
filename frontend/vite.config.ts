import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const allowedHosts = ["progbel.ru", "www.progbel.ru"];

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts,
    host: true,
    port: 5173,
  },
  preview: {
    allowedHosts,
  },
});
