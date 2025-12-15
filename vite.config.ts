
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Removed redundant process.env definition as it's handled by Vite's env mechanism
  // and provided via index.html shim for legacy/SDK support.
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
