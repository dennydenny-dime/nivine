import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'import.meta.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
        'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL),
        'import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        'import.meta.env.REACT_APP_SUPABASE_URL': JSON.stringify(env.REACT_APP_SUPABASE_URL),
        'import.meta.env.REACT_APP_SUPABASE_ANON_KEY': JSON.stringify(env.REACT_APP_SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              react: ['react', 'react-dom'],
              firebase: ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/firestore'],
              socket: ['socket.io-client'],
            },
          },
        },
      },
    };
});
