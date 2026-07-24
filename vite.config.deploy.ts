import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'

function stubPwaRegister(): Plugin {
  const id = 'virtual:pwa-register'
  const resolved = `\0${id}`
  return {
    name: 'stub-pwa-register',
    resolveId(source) {
      if (source === id) return resolved
    },
    load(source) {
      if (source === resolved) {
        return `export function registerSW() { return () => {} }`
      }
    },
  }
}

/** Deploy build without vite-plugin-pwa package. */
export default defineConfig({
  plugins: [react(), stubPwaRegister()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('tone')) return 'vendor-tone';
          if (id.includes('framer-motion') || id.includes('/motion/')) return 'vendor-motion';
          if (id.includes('socket.io')) return 'vendor-socket';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
            return 'vendor-react';
          }
          if (id.includes('axios') || id.includes('zustand') || id.includes('@tanstack')) {
            return 'vendor-data';
          }
        },
      },
    },
  },
})
