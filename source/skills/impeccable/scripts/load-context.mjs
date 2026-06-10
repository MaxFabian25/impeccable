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
    productPath: productPath ? path.relative(cwd, productPath) : null,
    hasDesign: Boolean(design),
    design,
    designPath: designPath ? path.relative(cwd, designPath) : null,
    migrated,
  };
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
