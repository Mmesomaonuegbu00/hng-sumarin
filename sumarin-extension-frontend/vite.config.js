import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/scripts/background.js'),
        content: resolve(__dirname, 'src/scripts/content.js'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
      },
    },
  },
  // 👇 Add this — tells PostCSS where to resolve CSS imports from
  css: {
    postcss: {
      plugins: [],
    },
  },
});