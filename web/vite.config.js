import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/catalog-api": {
        target: "http://localhost:5081",
        rewrite: path => path.replace(/^\/catalog-api/, "")
      },
      "/orders-api": {
        target: "http://localhost:5082",
        rewrite: path => path.replace(/^\/orders-api/, "")
      }
    }
  }
});
