import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps the built prototype portable: dist/ can be dropped into any
// static host or portfolio sub-folder and embedded with an iframe.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
});
