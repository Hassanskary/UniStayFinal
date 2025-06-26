import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [plugin()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        https: false, // ‰‘ €· ⁄·Ï HTTP
        port: 55559,  // ‰›” «·»Ê—  «·„ÿ·Ê»
        proxy: {
            '^/weatherforecast': {
                target: 'https://localhost:5001', // €Ì—Â ·Ê ⁄‰œﬂ API ⁄·Ï »Ê—   «‰Ì
                secure: false
            }
        }
    }
});
