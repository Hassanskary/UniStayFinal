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
        https: false, // ����� ��� HTTP
        port: 55559,  // ��� ������ �������
        proxy: {
            '^/weatherforecast': {
                target: 'https://localhost:5001', // ���� �� ���� API ��� ���� ����
                secure: false
            }
        }
    }
});
