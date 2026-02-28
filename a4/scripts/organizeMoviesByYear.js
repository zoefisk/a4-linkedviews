// scripts/organizeMoviesByYear.js
import fs from "fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const inputPath = "public/IMBD.csv";
const outputPath = "public/movies_by_year.csv";

// Read raw CSV (TSV actually)
const csvText = fs.readFileSync(inputPath, "utf-8");

// IMPORTANT: this dataset is TAB-separated
const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    delimiter: "\t",
});

// Clean + normalize
const cleaned = records
    .map((r) => {
        const year = Number(r.Year);
        const rating = Number(r["Weighted Mean"]);
        const votes = Number(String(r["Total ratings"] ?? "").replace(/,/g, ""));

        if (!Number.isFinite(year)) return null;
        if (!Number.isFinite(rating) || rating <= 0 || rating > 10) return null;

        return {
            title: r.Title ?? "(unknown title)",
            year,
            rating,
            votes: Number.isFinite(votes) ? votes : "",
        };
    })
    .filter(Boolean);

// Sort by year
cleaned.sort((a, b) => a.year - b.year);

// Write output CSV
const out = stringify(cleaned, {
    header: true,
});

fs.writeFileSync(outputPath, out);

console.log(`✅ Wrote ${cleaned.length} rows to ${outputPath}`);