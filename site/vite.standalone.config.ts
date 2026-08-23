import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./standalone', import.meta.url)),
  publicDir: false,
  base: './',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./standalone-dist', import.meta.url)),
    emptyOutDir: true,
    cssCodeSplit: false,
  },
});
