import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        host: '0.0.0.0',
        hmr: {
            host: 'localhost',
            port: 5173,
        },
        watch: {
            // Windows/部分磁盘环境下原生文件监听可能不触发，改为轮询保证热更新稳定
            usePolling: true,
            interval: 200,
        },
        proxy: {
            '/api': {
                target: 'http://localhost:9400',
                changeOrigin: true,
            },
        },
    },
})
