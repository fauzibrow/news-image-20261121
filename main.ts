// Entry program for the make.fun news-image bounty (news-image-20261121).
// The judged entry is the poster in entry.png: a one-page front page
// summing up Saturday 21 November 2026's world news — Iran hits US
// bases in Bahrain, Mexican forces capture "El Chapo Isidro", and an
// AI sell-off wipes out the Nasdaq's 2026 gains — plus a UTC timeline,
// a world map with numbered pins, ten drawn picture stories and 27
// more briefs grouped by region, 40 stories in total. This program
// copies that poster into the output directory, after checking it is
// a complete PNG inside the 1024x1024 and 1 MiB limits, so a broken
// image fails here instead of reaching the judge.
//
// Local test:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const entryPath = join(repoDir, "entry.png");
const targetPath = join(outDir, "entry.png");

let png: Buffer;
try {
  png = readFileSync(entryPath);
} catch (err) {
  console.error(`cannot read ${entryPath}: ${(err as Error).message}`);
  process.exit(1);
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (png.length < 24 || !png.subarray(0, 8).equals(PNG_MAGIC)) {
  console.error("entry.png is not a PNG file");
  process.exit(1);
}

// The first chunk of a PNG must be IHDR (13 bytes of header data);
// anything else is not a decodable image, even with a valid magic.
if (png.readUInt32BE(8) !== 13 || png.toString("latin1", 12, 16) !== "IHDR") {
  console.error("entry.png has no IHDR chunk where one is required");
  process.exit(1);
}

// In a PNG the width and height are big-endian uint32s at offsets 16
// and 20 (the IHDR chunk). The bounty caps the image at 1024x1024
// pixels and 1 MiB, so check both before writing anything out.
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width > 1024 || height > 1024) {
  console.error(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
  process.exit(1);
}
if (png.length > 1024 * 1024) {
  console.error(`entry.png is ${png.length} bytes, over the 1 MiB cap`);
  process.exit(1);
}

// The gate takes a whole image, so refuse a truncated file: a PNG ends
// with the 12-byte IEND chunk (zero length, "IEND", then its CRC).
const IEND = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);
if (!png.subarray(png.length - 12).equals(IEND)) {
  console.error("entry.png is truncated: no IEND chunk at the end");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(targetPath, png);

// Prove the copy landed intact: re-read the target and compare it
// byte for byte with the source before reporting success.
const written = readFileSync(targetPath);
if (!written.equals(png)) {
  console.error(`${targetPath} differs from ${entryPath} after writing`);
  process.exit(1);
}
const sha256 = createHash("sha256").update(written).digest("hex");
console.log(
  `wrote ${targetPath} (${width}x${height}, ${png.length} bytes, ` +
    `sha256 ${sha256})`,
);
