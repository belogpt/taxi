import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Allow all host headers so the preview/dev server works behind proxies or on custom domains
// like progbel.ru. Vite accepts a boolean here to disable host blocking altogether.
const allowedHosts = true;

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts,
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    allowedHosts,
    host: "0.0.0.0",
  },
});
