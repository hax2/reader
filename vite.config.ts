import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-root-static',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) {
            return next();
          }

          const cleanUrl = decodeURIComponent(req.url.split('?')[0]);
          const safePath = path.normalize(cleanUrl).replace(/^(\.\.[\/\\])+/, '');
          const filePath = path.join(process.cwd(), safePath);

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap: Record<string, string> = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.webp': 'image/webp',
              '.m4a': 'audio/mp4',
              '.mp3': 'audio/mpeg',
              '.json': 'application/json',
              '.txt': 'text/plain',
              '.vtt': 'text/vtt'
            };

            const contentType = mimeMap[ext];
            if (contentType) {
              const stat = fs.statSync(filePath);
              const fileSize = stat.size;
              const range = req.headers.range;

              res.setHeader('Accept-Ranges', 'bytes');
              res.setHeader('Content-Type', contentType);

              if (range && ext === '.m4a') {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = end - start + 1;
                res.writeHead(206, {
                  'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                  'Content-Length': chunksize,
                  'Content-Type': contentType
                });
                if (req.method === 'HEAD') {
                  res.end();
                } else {
                  fs.createReadStream(filePath, { start, end }).pipe(res);
                }
                return;
              }

              res.setHeader('Content-Length', fileSize);
              if (req.method === 'HEAD') {
                res.end();
              } else {
                fs.createReadStream(filePath).pipe(res);
              }
              return;
            }
          }
          next();
        });
      }
    }
  ],
  base: './',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
