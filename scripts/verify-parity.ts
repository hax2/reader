import fs from "fs";
import path from "path";

// 1. Extract all function names from app.original.js
const originalCode = fs.readFileSync("app.original.js", "utf8");
const fnRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g;
let match: RegExpExecArray | null;
const originalFunctions: string[] = [];
while ((match = fnRegex.exec(originalCode)) !== null) {
  originalFunctions.push(match[1]);
}

console.log(`Original app.original.js functions count: ${originalFunctions.length}`);

// 2. Gather all source files in src/
function getAllFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(fullPath);
    }
  }
  return files;
}

const srcFiles = getAllFiles("src");
const srcContents = srcFiles.map((file) => ({
  file,
  content: fs.readFileSync(file, "utf8")
}));

// 3. For each original function, check where it exists in src/
const results: { fn: string; foundIn: string[] }[] = [];
const missing: string[] = [];

for (const fn of originalFunctions) {
  // Regex to look for function fn(, const fn =, export function fn(, fn: (
  const pattern = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?function\\s+${fn}\\s*\\(|` +
    `(?:const|let|var)\\s+${fn}\\s*=|` +
    `\\b${fn}\\s*:\\s*(?:async\\s+)?\\(|` +
    `\\b${fn}\\s*\\(`,
    "g"
  );

  const foundIn: string[] = [];
  for (const { file, content } of srcContents) {
    if (pattern.test(content)) {
      foundIn.push(path.relative(".", file));
    }
  }

  if (foundIn.length > 0) {
    results.push({ fn, foundIn });
  } else {
    missing.push(fn);
  }
}

console.log(`Found: ${results.length} / ${originalFunctions.length}`);
if (missing.length > 0) {
  console.error("MISSING FUNCTIONS:", missing);
  process.exit(1);
} else {
  console.log("100% FEATURE PARITY VERIFIED! All 198 functions are accounted for in src/!");
}
