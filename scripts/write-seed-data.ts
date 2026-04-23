import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { generateSeedData } from "./generate-seed-data";

const data = generateSeedData();
const { categories, entries, days } = data;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = resolve(__dirname, "..", "tmp");
mkdirSync(tmpDir, { recursive: true });
const outPath = resolve(tmpDir, "seed-data.json");

// Nest entries into categories for import-compatible format.
// `days` is a top-level sibling; the current import schema doesn't consume it
// (days would need to be wired through import/export separately), but keeping
// it in the seed output lets tools pick it up and matches the store shape.
const exportData = {
  categories: categories.map((cat) => ({
    ...cat,
    entries: entries.filter((e) => e.categoryId === cat.id),
  })),
  days,
};
writeFileSync(outPath, JSON.stringify(exportData, null, 2));

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const totalEntries = entries.length;
const runningEntries = entries.filter((e) => e.running).length;

const startDate = new Date(Date.UTC(2025, 0, 1));
const allStarts = entries.map((e) => e.start);
const endDate = new Date(Math.max(...allStarts));

console.log("=== Seed Data Generated ===");
console.log(`Output: ${outPath}`);
console.log(
  `Date range: ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`
);
console.log(`Total entries: ${totalEntries}`);
console.log(`Running entries: ${runningEntries}`);
console.log(`Days with notes: ${days.length}`);
console.log("");
console.log("Per-category counts:");
for (const cat of categories) {
  const count = entries.filter((e) => e.categoryId === cat.id).length;
  console.log(`  ${cat.title}: ${count}`);
}
