import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/. The Pages workflow sets BASE_PATH;
// local builds use a relative base so dist/ also works when opened from any folder.
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
});
