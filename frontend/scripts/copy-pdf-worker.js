// Copy pdfjs-dist's runtime assets into `web/` so webpack-dev-server can serve
// them as static files, and the production build picks them up via
// CopyWebpackPlugin.
//
// Three things get copied:
//   - `pdf.worker.min.mjs`  → `/pdf.worker.min.mjs`
//   - `standard_fonts/*`    → `/pdfjs-standard-fonts/`   (the 14 base PDF fonts)
//   - `cmaps/*`             → `/pdfjs-cmaps/`            (CJK + symbol character maps)
//
// Without `standard_fonts` and `cmaps`, PDF.js falls back to substituting
// fonts/glyphs at render time, which makes labels and symbols look subtly
// (sometimes very) different from the original PDF. Shipping these alongside
// the worker is what closes the gap between PDF.js's render and the file
// you'd see in Acrobat or a browser's native PDF viewer.
//
// Runs as `postinstall` (so any teammate running `npm install` is set up) and
// as `prestart` / `preweb` / `prebuild` (belt-and-suspenders).

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.resolve(__dirname, '..', 'node_modules', 'pdfjs-dist');
const WEB_ROOT = path.resolve(__dirname, '..', 'web');

const targets = [
  { src: path.join(PKG_ROOT, 'build', 'pdf.worker.min.mjs'), dst: path.join(WEB_ROOT, 'pdf.worker.min.mjs'), kind: 'file' },
  { src: path.join(PKG_ROOT, 'standard_fonts'), dst: path.join(WEB_ROOT, 'pdfjs-standard-fonts'), kind: 'dir' },
  { src: path.join(PKG_ROOT, 'cmaps'), dst: path.join(WEB_ROOT, 'pdfjs-cmaps'), kind: 'dir' },
];

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyDir(src, dst) {
  // Wipe the destination first so removed upstream files don't linger.
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, { recursive: true });
}

let copied = 0;
for (const { src, dst, kind } of targets) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-pdf-worker] source missing: ${src} — skipping`);
    continue;
  }
  if (kind === 'file') {
    copyFile(src, dst);
  } else {
    copyDir(src, dst);
  }
  console.log(`[copy-pdf-worker] ${path.relative(process.cwd(), src)}  ->  ${path.relative(process.cwd(), dst)}`);
  copied += 1;
}

if (copied === 0) {
  console.warn('[copy-pdf-worker] nothing copied — run `npm install` to populate node_modules');
}
