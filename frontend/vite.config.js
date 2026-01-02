import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 強制清除緩存重新構建
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 強制使用唯一的文件名（添加構建時間戳到 hash）
        entryFileNames: 'assets/[name].[hash].v20260102.js',
        chunkFileNames: 'assets/[name].[hash].v20260102.js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

