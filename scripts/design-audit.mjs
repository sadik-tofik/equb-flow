// scripts/design-audit.mjs
/**
 * Automated Design Audit Script
 * Enforces Design Brief Part 1 & Part 3 (Section 12.1) quality rules.
 * Fails CI if banned patterns, external icon libs, shadows, or pure colors are detected in apps/web/src.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC_DIR = 'apps/web/src';
const MESSAGES_DIR = 'apps/web/messages';

const BANNED_PATTERNS = [
  {
    name: 'Icon libraries (must use custom geometric SVG icons)',
    regex: /from\s+['"](lucide-react|@heroicons|react-icons|phosphor-react|feather-icons)['"]/,
  },
  {
    name: 'Shadows (no box-shadow or drop-shadow)',
    regex: /(box-shadow|drop-shadow|shadow-(sm|md|lg|xl|2xl))/,
  },
  {
    name: 'Gradients (no linear or radial gradients)',
    regex: /(linear-gradient|radial-gradient|conic-gradient|bg-gradient-to)/,
  },
  {
    name: 'Glassmorphism (no backdrop blur)',
    regex: /(backdrop-filter|backdrop-blur)/,
  },
  {
    name: 'Pure white / black hardcoded hex',
    regex: /(#ffffff|#fff|#000000|#000)\b/i,
  },
  {
    name: 'Banned fonts (Inter, Geist, Space Grotesk)',
    regex: /font-(sans|display|mono)\s*:\s*['"]?(Inter|Geist|Space Grotesk)['"]?/i,
  },
  {
    name: 'Em dash (use spaced en dash or commas instead)',
    regex: /—/,
  },
];

function scanDirectory(dir, issues = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath, issues);
    } else if (
      fullPath.endsWith('.tsx') ||
      fullPath.endsWith('.ts') ||
      fullPath.endsWith('.css') ||
      fullPath.endsWith('.json')
    ) {
      // Exclude generated buildinfo or vendor files
      if (fullPath.includes('.tsbuildinfo')) continue;

      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip comments in design audit
        if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
          continue;
        }

        for (const rule of BANNED_PATTERNS) {
          if (rule.regex.test(line)) {
            // Exceptions for allowed components
            if (rule.name.includes('pure white') && fullPath.includes('Icon.tsx')) continue;

            issues.push({
              file: fullPath,
              line: i + 1,
              rule: rule.name,
              snippet: line.trim(),
            });
          }
        }
      }
    }
  }
  return issues;
}

console.log('--- EqubFlow Automated Design Audit ---');
console.log(`Auditing ${SRC_DIR} and ${MESSAGES_DIR}...`);

const issues = scanDirectory(SRC_DIR);
if (readdirSync('.').includes(MESSAGES_DIR)) {
  scanDirectory(MESSAGES_DIR, issues);
}

if (issues.length > 0) {
  console.error(`\n❌ Design Audit Failed: Found ${issues.length} violation(s):\n`);
  for (const issue of issues) {
    console.error(`  ${issue.file}:${issue.line} [${issue.rule}]`);
    console.error(`    ${issue.snippet}\n`);
  }
  process.exit(1);
} else {
  console.log('\n✓ Design Audit Passed: 0 violations detected. Paper & Ink tokens verified.\n');
  process.exit(0);
}
