import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { generateSeedData } from "./generate-seed-data";

const data = generateSeedData();
const { categories } = data;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = resolve(__dirname, "..", "tmp");
mkdirSync(tmpDir, { recursive: true });
const outPath = resolve(tmpDir, "seed-data.json");
writeFileSync(outPath, JSON.stringify(data, null, 2));

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const totalEntries = categories.reduce((sum, c) => sum + c.entries.length, 0);
const runningEntries = categories.reduce(
  (sum, c) => sum + c.entries.filter((e) => e.running).length,
  0
);

const startDate = new Date(Date.UTC(2025, 0, 1));
const allStarts = categories.flatMap((c) => c.entries.map((e) => e.start));
const endDate = new Date(Math.max(...allStarts));

console.log("=== Seed Data Generated ===");
console.log(`Output: ${outPath}`);
console.log(
  `Date range: ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`
);
console.log(`Total entries: ${totalEntries}`);
console.log(`Running entries: ${runningEntries}`);
console.log("");
console.log("Per-category counts:");
for (const cat of categories) {
  console.log(`  ${cat.title}: ${cat.entries.length}`);
}
