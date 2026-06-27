// Configurare Vite pentru frontend-ul React KinetoLive
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
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