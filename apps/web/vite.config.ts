import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Separa o motor 3D (grande e estável) do código da aplicação para
        // melhorar cache e carregamento (requirements §10).
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) return 'three';
            if (id.includes('react') || id.includes('scheduler')) return 'react';
            if (id.includes('socket.io') || id.includes('engine.io')) return 'net';
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
