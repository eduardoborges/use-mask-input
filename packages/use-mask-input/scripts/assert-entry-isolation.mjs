/**
 * Fails the build if an entry point pulls in a framework it has no business
 * importing.
 *
 * The Vue entry must never reference react or react-dom: a Vue app installing
 * this package should not get React in its bundle, and `react` is only an
 * optional peer dependency now, so it may not even be installed.
 *
 * Checked against the emitted files rather than the source, because that is
 * what consumers actually download, and because tsdown code-splits — the shared
 * chunk has to stay framework-free too, or the isolation is a fiction.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const DIST = new URL('../dist/', import.meta.url).pathname;

/** entry -> module specifiers it must not reference, transitively. */
const RULES = {
  'vue.mjs': ['react', 'react-dom', 'vee-validate'],
  'vue.cjs': ['react', 'react-dom', 'vee-validate'],
};

// Three shapes, and the bare side-effect import is easy to forget: `import"x"`
// has no `from`, so a pattern anchored on `from` silently misses it.
const IMPORT_RE = new RegExp([
  /from\s*["']([^"']+)["']/, //            import x from "y"  /  export … from "y"
  /require\(\s*["']([^"']+)["']\s*\)/, //  require("y")
  /\bimport\s*["']([^"']+)["']/, //        import "y"
].map((r) => `(?:${r.source})`).join('|'), 'g');

async function specifiersOf(file) {
  const code = await readFile(join(DIST, file), 'utf8');
  const found = new Set();

  for (const match of code.matchAll(IMPORT_RE)) {
    found.add(match[1] ?? match[2] ?? match[3]);
  }

  return found;
}

/** Follows relative chunk imports so shared chunks are covered too. */
async function reachableSpecifiers(entry, seen = new Set()) {
  if (seen.has(entry)) return new Set();
  seen.add(entry);

  const direct = await specifiersOf(entry);
  const all = new Set();

  for (const spec of direct) {
    if (spec.startsWith('.')) {
      const nested = await reachableSpecifiers(spec.replace(/^\.\//, ''), seen);
      nested.forEach((s) => all.add(s));
    } else {
      all.add(spec);
    }
  }

  return all;
}

const built = await readdir(DIST);
const failures = [];

for (const [entry, forbidden] of Object.entries(RULES)) {
  if (!built.includes(entry)) {
    failures.push(`${entry}: not emitted`);
    continue;
  }

  const specs = await reachableSpecifiers(entry);
  const leaked = forbidden.filter((f) => specs.has(f));

  if (leaked.length > 0) {
    failures.push(`${entry}: must not reference ${leaked.join(', ')}`);
  }
}

if (failures.length > 0) {
  console.error('Entry isolation check failed:');
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}

console.log(`Entry isolation OK (${Object.keys(RULES).join(', ')})`);
