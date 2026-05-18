import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicMode = process.env.VITE_PUBLIC_MODE === "1";

export default defineConfig({
  base: "/Alaska-Itinerary/",
  plugins: [react()],
  resolve: {
    alias: {
      "~trip-data": path.resolve(
        here,
        publicMode ? "src/trip-data.public.js" : "src/trip-data.js"
      ),
    },
  },
});
