import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

// --mode esp32: ESP32 に入れる版（インターネットなし）。scripts/build-esp32.mjs から使う
//   Firebase を外す・Google フォントの代わりに中に入れたフォント（/fonts/fonts.css）・Fluent 絵文字は /f/*.webp
export default defineConfig(({ mode }) => {
  const esp32 = mode === 'esp32';
  const stub = fileURLToPath(new URL('./src/esp32/firebase-stub.js', import.meta.url));
  return {
    plugins: [
      react(),
      esp32 && {
        name: 'esp32-offline-html',
        transformIndexHtml: (html) => html
          .replace(/\s*<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, '')
          .replace('</head>', '  <link rel="stylesheet" href="/fonts/fonts.css">\n</head>'),
      },
    ].filter(Boolean),
    define: { __ESP32__: JSON.stringify(esp32) },
    resolve: esp32 ? { alias: { 'firebase/app': stub, 'firebase/firestore': stub } } : {},
  };
});
