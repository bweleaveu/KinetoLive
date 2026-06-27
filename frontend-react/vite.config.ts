// Configurare Vite pentru frontend-ul React KinetoLive
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // server: {
  //   port: 5173,
  //   strictPort: true,
  // },

  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".trycloudflare.com"],
  },

  resolve: {
    tsconfigPaths: true,
  },

  plugins: [
    tailwindcss(),

    tanstackStart({
      server: {
        entry: "server",
      },
    }),

    // Pluginul React trebuie pus dupa pluginul TanStack Start
    viteReact(),
  ],
});
