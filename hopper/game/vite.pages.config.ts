import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// A separate static entry reuses the complete game without a Worker/RSC server.
export default defineConfig({
  root: here('../'),
  base: '/mini/hopper/',
  publicDir: here('./public'),
  cacheDir: here('../../local/hopper/pages-cache'),
  resolve: {
    alias: {
      'next/image': here('./pages/image.tsx'),
      '@': here('./'),
    },
  },
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    outDir: here('../../local/pages/hopper'),
    emptyOutDir: true,
  },
});
