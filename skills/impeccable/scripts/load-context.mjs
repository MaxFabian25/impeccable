import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCT_NAMES = ['PRODUCT.md', 'Product.md', 'product.md'];
const DESIGN_NAMES = ['DESIGN.md', 'Design.md', 'design.md'];
const LEGACY_NAMES = ['.impeccable.md'];
const FALLBACK_DIRS = ['.agents/context', 'docs'];

export function resolveContextDir(cwd = process.cwd()) {
  const envDir = process.env.IMPECCABLE_CONTEXT_DIR;
  if (envDir && envDir.trim()) {
    const trimmed = envDir.trim();
    return path.isAbsolute(trimmed) ? trimmed : path.resolve(cwd, trimmed);
  }

  if (firstExisting(cwd, [...PRODUCT_NAMES, ...DESIGN_NAMES, ...LEGACY_NAMES])) {
    return cwd;
  }

  for (const rel of FALLBACK_DIRS) {
    const candidate = path.resolve(cwd, rel);
    if (firstExisting(candidate, [...PRODUCT_NAMES, ...DESIGN_NAMES])) {
      return candidate;
    }
  }

  return cwd;
}

export function loadContext(cwd = process.cwd()) {
  let migrated = false;
  const contextDir = resolveContextDir(cwd);
  let productPath = firstExisting(contextDir, PRODUCT_NAMES);

  if (!productPath && contextDir === cwd) {
    const legacyPath = firstExisting(cwd, LEGACY_NAMES);
    if (legacyPath) {
      const targetPath = path.join(cwd, 'PRODUCT.md');
      try {
        fs.renameSync(legacyPath, targetPath);
        productPath = targetPath;
        migrated = true;
      } catch {
        productPath = legacyPath;
      }
    }
  }

  const designPath = firstExisting(contextDir, DESIGN_NAMES);
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
    contextDir,
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

function firstExisting(dir, names) {
  for (const name of names) {
    const found = findCaseInsensitive(dir, name);
    if (found) return found;
  }
  return null;
}

function findCaseInsensitive(dir, targetName) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const target = targetName.toLowerCase();
  const match = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === target);
  return match ? path.join(dir, match.name) : null;
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
