/**
 * Copies WASM files needed by sql.js and tiktoken into the out/ directory
 * so they can be found at runtime when the extension runs from out/extension.js
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "out");

const filesToCopy = [
  {
    src: path.join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    dest: path.join(outDir, "sql-wasm.wasm"),
  },
  {
    src: path.join(root, "node_modules", "tiktoken", "tiktoken_bg.wasm"),
    dest: path.join(outDir, "tiktoken_bg.wasm"),
  },
];

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const { src, dest } of filesToCopy) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${path.basename(src)} -> out/`);
  } else {
    console.warn(`WASM file not found: ${src}`);
  }
}
