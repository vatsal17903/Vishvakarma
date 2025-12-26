import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  console.log('🔧 Vite Config Debug:');
  console.log('  Mode:', mode);
  console.log('  VITE_API_URL from env:', env.VITE_API_URL);

  return {
    plugins: [react()],
    // Vite automatically exposes VITE_ prefixed env vars
    envPrefix: 'VITE_',  
    server: {
      host: true, // Expose to local network
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3006',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});
