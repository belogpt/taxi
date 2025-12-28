import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const allowedHostsEnv = process.env.VITE_ALLOWED_HOSTS;
const allowedHosts =
  !allowedHostsEnv ||
  allowedHostsEnv === "*" ||
  allowedHostsEnv.toLowerCase() === "true"
    ? true
    : allowedHostsEnv.split(",").map((host) => host.trim()).filter(Boolean);

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
