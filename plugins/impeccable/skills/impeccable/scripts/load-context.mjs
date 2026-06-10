import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCT_NAME = 'PRODUCT.md';
const DESIGN_NAME = 'DESIGN.md';
const LEGACY_NAME = '.impeccable.md';

export function loadContext(cwd = process.cwd()) {
  let migrated = false;
  let productPath = findCaseInsensitive(cwd, PRODUCT_NAME);

  if (!productPath) {
    const legacyPath = findCaseInsensitive(cwd, LEGACY_NAME);
    if (legacyPath) {
      const targetPath = path.join(cwd, PRODUCT_NAME);
      try {
        fs.renameSync(legacyPath, targetPath);
        productPath = targetPath;
        migrated = true;
      } catch {
        productPath = legacyPath;
      }
    }
  }

  const designPath = findCaseInsensitive(cwd, DESIGN_NAME);
  const product = productPath ? safeRead(productPath) : null;
  const design = designPath ? safeRead(designPath) : null;

  return {
    hasProduct: Boolean(product),
    product,
    register: extractRegister(product),
    productPath: productPath ? path.relative(cwd, productPath) : null,
    hasDesign: Boolean(design),
    design,
    designIsSeed: isSeedDesign(design),
    designPath: designPath ? path.relative(cwd, designPath) : null,
    migrated,
  };
}

function extractRegister(markdown) {
  if (!markdown) return null;
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s+Register\s*$/i.test(line.trim()));
  if (start === -1) return null;

  const sectionLines = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line.trim())) break;
    sectionLines.push(line);
  }

  const value = sectionLines
    .map((line) => line.trim().replace(/^[-*]\s+/, '').toLowerCase())
    .find(Boolean);
  return value === 'editorial' || value === 'product' ? value : null;
}

function isSeedDesign(markdown) {
  return Boolean(markdown && /<!--\s*SEED\b/i.test(markdown));
}

function findCaseInsensitive(cwd, targetName) {
  let entries;
  try {
    entries = fs.readdirSync(cwd, { withFileTypes: true });
  } catch {
    return null;
  }

  const target = targetName.toLowerCase();
  const match = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === target);
  return match ? path.join(cwd, match.name) : null;
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function cli() {
  console.log(JSON.stringify(loadContext(process.cwd()), null, 2));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  cli();
}
