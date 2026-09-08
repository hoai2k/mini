import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const modelsDir = fileURLToPath(new URL('../models/', import.meta.url));
const texturesDir = fileURLToPath(new URL('../3d/textures/', import.meta.url));

/** Serve hopper/models/*.glb at ./models/ in development and emit them in a
 * build, so both editions' entries reach the delivered Hopper models without
 * copying 10 MB of binaries into public/. */
export function hopperModels(): Plugin {
  const files = () => fs.readdirSync(modelsDir).filter((f) => /\.(glb|json)$/.test(f));
  return {
    name: 'hopper-models',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // The painted texture pack: /3d/textures/<path> in development.
        const t = /\/3d\/textures\/([\w./-]+\.(?:png|jpg|ktx2|json))(?:\?|$)/.exec(req.url || '');
        if (t && !t[1].includes('..')) {
          const file = path.join(texturesDir, t[1]);
          if (!fs.existsSync(file)) return next();
          res.setHeader('content-type', file.endsWith('.png') ? 'image/png' : file.endsWith('.jpg') ? 'image/jpeg' : file.endsWith('.json') ? 'application/json' : 'application/octet-stream');
          res.setHeader('cache-control', 'public, max-age=3600');
          fs.createReadStream(file).pipe(res);
          return;
        }
        const m = /\/models\/([\w.-]+\.(?:glb|json))(?:\?|$)/.exec(req.url || '');
        if (!m) return next();
        const file = path.join(modelsDir, m[1]);
        if (!fs.existsSync(file)) return next();
        res.setHeader('content-type', m[1].endsWith('.glb') ? 'model/gltf-binary' : 'application/json');
        res.setHeader('cache-control', 'public, max-age=3600');
        fs.createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      for (const f of files())
        this.emitFile({ type: 'asset', fileName: `models/${f}`, source: fs.readFileSync(path.join(modelsDir, f)) });
    },
  };
}
