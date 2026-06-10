/**
 * Parse a Stitch-style DESIGN.md into the compact model used by live mode.
 * This is intentionally dependency-free and permissive: if a section is
 * absent or informal, return the structure we can infer instead of failing.
 */

const CANONICAL_SECTIONS = {
  overview: 'Overview',
  colors: 'Colors',
  typography: 'Typography',
  elevation: 'Elevation',
  components: 'Components',
  "do's and don'ts": "Do's and Don'ts",
  "do's and donts": "Do's and Don'ts",
};

const VALUE_RE = /(`([^`]+)`|\((#[0-9a-fA-F]{3,8}|oklch\([^)]+\)|rgba?\([^)]+\)|[^)]+)\))/;

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

function normalizeHeading(raw) {
  return raw
    .replace(/^\s*\d+\.\s*/, '')
    .split(':')[0]
    .trim()
    .replace(/[’]/g, "'")
    .toLowerCase();
}

function canonicalSection(raw) {
  const normalized = normalizeHeading(raw);
  if (CANONICAL_SECTIONS[normalized]) return CANONICAL_SECTIONS[normalized];
  for (const [key, value] of Object.entries(CANONICAL_SECTIONS)) {
    if (normalized.includes(key)) return value;
  }
  return null;
}

function splitSections(markdown) {
  const body = stripFrontmatter(markdown);
  const lines = body.split(/\r?\n/);
  const sections = {};
  let title = null;
  let current = null;

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 && !title) {
      title = h1[1].trim();
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const name = canonicalSection(h2[1]);
      current = name ? { name, lines: [] } : null;
      if (current) sections[name] = current;
      continue;
    }

    if (current) current.lines.push(line);
  }

  return { title, sections };
}

function splitSubsections(lines) {
  const sections = [{ name: null, lines: [] }];
  let current = sections[0];
  for (const line of lines) {
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      current = { name: h3[1].trim(), lines: [] };
      sections.push(current);
      continue;
    }
    current.lines.push(line);
  }
  return sections;
}

function stripInlineMarkdown(value) {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function collectParagraphs(lines) {
  const paragraphs = [];
  let current = [];
  const flush = () => {
    if (current.length > 0) {
      paragraphs.push(stripInlineMarkdown(current.join(' ')));
      current = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^###\s+/.test(line)) {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return paragraphs.filter(Boolean);
}

function collectBullets(lines) {
  return lines
    .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1])
    .filter(Boolean);
}

function parseNameValueBullet(bullet) {
  const match = bullet.match(/^\*\*([^*]+)\*\*\s*:?\s*(.*)$/);
  const name = match ? stripInlineMarkdown(match[1]) : null;
  const rest = match ? match[2] : bullet;
  const valueMatch = rest.match(VALUE_RE);
  const value = valueMatch ? (valueMatch[2] || valueMatch[3] || '').trim() : '';
  const description = stripInlineMarkdown(
    rest
      .replace(VALUE_RE, '')
      .replace(/^[:\s-]+/, '')
      .trim(),
  );
  return name || value ? { name: name || value, value, description } : null;
}

function extractNamedRules(lines, section) {
  const rules = [];
  const joined = lines.join('\n');
  const re = /\*\*(The [^*]+?Rule)\.?\*\*\s*([^*\n][\s\S]*?)(?=\n\s*\*\*The [^*]+?Rule|$)/g;
  let match;
  while ((match = re.exec(joined)) !== null) {
    rules.push({
      name: stripInlineMarkdown(match[1]).replace(/\.$/, ''),
      body: stripInlineMarkdown(match[2].replace(/\s+/g, ' ')),
      section,
    });
  }
  return rules;
}

function parseOverview(section) {
  if (!section) return null;
  const text = section.lines.join('\n');
  const northStar = text.match(/\*\*Creative North Star:\s*"([^"]+)"\*\*/)?.[1] || null;
  const paragraphs = collectParagraphs(section.lines)
    .filter((p) => !p.startsWith('Creative North Star') && !p.startsWith('Key Characteristics'));
  const keyCharacteristics = collectBullets(section.lines);
  return {
    northStar,
    overview: paragraphs.join('\n\n'),
    keyCharacteristics,
  };
}

function parseColors(section) {
  if (!section) return null;
  const groups = [];
  for (const sub of splitSubsections(section.lines)) {
    const colors = collectBullets(sub.lines).map(parseNameValueBullet).filter(Boolean);
    if (colors.length > 0) {
      groups.push({ role: sub.name || 'Palette', colors });
    }
  }
  return {
    groups,
    rules: extractNamedRules(section.lines, 'colors'),
  };
}

function parseTypography(section) {
  if (!section) return null;
  const fonts = {};
  for (const bullet of collectBullets(section.lines)) {
    const item = parseNameValueBullet(bullet);
    if (!item?.name) continue;
    const role = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    fonts[role] = {
      name: item.name,
      family: item.description.split(/[,.]/)[0]?.trim() || item.value || '',
      purpose: item.description,
    };
  }
  return {
    fonts,
    rules: extractNamedRules(section.lines, 'typography'),
  };
}

function parseElevation(section) {
  if (!section) return null;
  const shadows = collectBullets(section.lines)
    .map(parseNameValueBullet)
    .filter((item) => item && (/shadow/i.test(item.name) || /box-shadow|rgba|oklch/i.test(item.value)));
  return {
    shadows,
    rules: extractNamedRules(section.lines, 'elevation'),
  };
}

function parseComponents(section) {
  if (!section) return null;
  const items = [];
  for (const sub of splitSubsections(section.lines).filter((s) => s.name)) {
    items.push({
      name: sub.name,
      description: collectParagraphs(sub.lines).join(' '),
      bullets: collectBullets(sub.lines).map(stripInlineMarkdown),
    });
  }
  return { items };
}

function parseDosDonts(section) {
  if (!section) return { dos: [], donts: [] };
  const dos = [];
  const donts = [];
  let mode = null;
  for (const line of section.lines) {
    if (/^###\s+do/i.test(line)) mode = 'dos';
    if (/^###\s+don/i.test(line)) mode = 'donts';
    const bullet = line.match(/^\s*[-*]\s+(.+)$/)?.[1];
    if (!bullet) continue;
    const cleaned = stripInlineMarkdown(bullet);
    if (mode === 'donts' || /^don't/i.test(cleaned)) donts.push(cleaned);
    else dos.push(cleaned);
  }
  return { dos, donts };
}

export function parseDesignMd(markdown) {
  const { title, sections } = splitSections(markdown);
  return {
    title,
    overview: parseOverview(sections.Overview),
    colors: parseColors(sections.Colors),
    typography: parseTypography(sections.Typography),
    elevation: parseElevation(sections.Elevation),
    components: parseComponents(sections.Components),
    dosDonts: parseDosDonts(sections["Do's and Don'ts"]),
  };
}
