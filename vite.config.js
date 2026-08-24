import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://testnet.vibevibe.fun',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const address = new URLSearchParams(path.split('?')[1]).get('address');
          return `/api/v1/chains/46630/launches/${address || ''}`;
        },
      },
    },
  },
});
