import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'
import path from 'path';
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    },
    base: '/main/', // Ensures that the extension routes correctly to /main
  server: {
    host: '0.0.0.0', // Allow connections from your local network
    port: 3000, // Or any other port you prefer
  },

  
}});
