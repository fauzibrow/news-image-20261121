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

// Exit codes: one per failure type, so a caller can tell a truncated
// file from a bad CRC without parsing stderr. The numbers themselves
// are arbitrary; only that they differ matters.
const EXIT_OK = 0;
const EXIT_IO = 1;
const EXIT_NOT_PNG = 2;
const EXIT_NO_IHDR = 3;
const EXIT_TOO_BIG = 4;
const EXIT_TRUNCATED = 5;
const EXIT_BAD_CRC = 6;
const EXIT_COPY_MISMATCH = 7;

// PNG chunk CRCs use CRC-32 (IEEE 802.3, reversed polynomial
// 0xEDB88320), computed over the chunk type bytes followed by the
// chunk data. Build the 256-entry lookup table once at startup.
const CRC32_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) {
    c = CRC32_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Walk the chunk sequence starting just after the 8-byte magic and
// record every chunk's type, offset, data length and whether its
// stored CRC matches a fresh computation. Stops at IEND, or at the
// first chunk that runs past the end of the file.
type ChunkInfo = {
  type: string;
  offset: number;
  length: number;
  crcOk: boolean;
};

function walkChunks(png: Buffer): ChunkInfo[] {
  const chunks: ChunkInfo[] = [];
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("latin1", offset + 4, offset + 8);
    const dataEnd = offset + 8 + length;
    if (dataEnd + 4 > png.length) break;
    const storedCrc = png.readUInt32BE(dataEnd);
    const computedCrc = crc32(
      Buffer.concat([
        png.subarray(offset + 4, offset + 8),
        png.subarray(offset + 8, dataEnd),
      ]),
    );
    chunks.push({ type, offset, length, crcOk: storedCrc === computedCrc });
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }
  return chunks;
}

let png: Buffer;
try {
  png = readFileSync(entryPath);
} catch (err) {
  console.error(`cannot read ${entryPath}: ${(err as Error).message}`);
  process.exit(EXIT_IO);
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (png.length < 24 || !png.subarray(0, 8).equals(PNG_MAGIC)) {
  console.error("entry.png is not a PNG file");
  process.exit(EXIT_NOT_PNG);
}

// The first chunk of a PNG must be IHDR (13 bytes of header data);
// anything else is not a decodable image, even with a valid magic.
if (png.readUInt32BE(8) !== 13 || png.toString("latin1", 12, 16) !== "IHDR") {
  console.error("entry.png has no IHDR chunk where one is required");
  process.exit(EXIT_NO_IHDR);
}

// In a PNG the width and height are big-endian uint32s at offsets 16
// and 20 (the IHDR chunk). The bounty caps the image at 1024x1024
// pixels and 1 MiB, so check both before writing anything out.
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width > 1024 || height > 1024) {
  console.error(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
  process.exit(EXIT_TOO_BIG);
}
if (png.length > 1024 * 1024) {
  console.error(`entry.png is ${png.length} bytes, over the 1 MiB cap`);
  process.exit(EXIT_TOO_BIG);
}

// The gate takes a whole image, so refuse a truncated file: a PNG ends
// with the 12-byte IEND chunk (zero length, "IEND", then its CRC).
const IEND = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);
if (!png.subarray(png.length - 12).equals(IEND)) {
  console.error("entry.png is truncated: no IEND chunk at the end");
  process.exit(EXIT_TRUNCATED);
}

// Validate every chunk CRC before copying anything out. The magic,
// IHDR, size and IEND checks above catch a wrong or truncated file;
// this catches a file that looks structurally fine but has corrupt
// chunk data — a flipped byte inside an IDAT chunk, for example.
const chunks = walkChunks(png);
const badCrc = chunks.filter((c) => !c.crcOk);

if (process.argv.includes("--verify")) {
  // --verify prints a full validation report and exits without
  // copying: dimensions, file size, and one line per chunk with its
  // CRC result, so a human can see exactly what was checked.
  console.log(`file: ${entryPath}`);
  console.log(`size: ${png.length} bytes (limit 1048576)`);
  console.log(`dimensions: ${width}x${height} (limit 1024x1024)`);
  console.log(`chunks: ${chunks.length}`);
  for (const chunk of chunks) {
    console.log(
      `  ${chunk.type} @${chunk.offset} len=${chunk.length} ` +
        `crc=${chunk.crcOk ? "ok" : "FAIL"}`,
    );
  }
  console.log(
    `crc: ${badCrc.length === 0 ? "all ok" : `${badCrc.length} FAIL`}`,
  );
  process.exit(badCrc.length > 0 ? EXIT_BAD_CRC : EXIT_OK);
}

if (badCrc.length > 0) {
  console.error(
    `entry.png has ${badCrc.length} chunk(s) with a bad CRC: ` +
      badCrc.map((c) => c.type).join(", "),
  );
  process.exit(EXIT_BAD_CRC);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(targetPath, png);

// Prove the copy landed intact: re-read the target and compare it
// byte for byte with the source before reporting success.
const written = readFileSync(targetPath);
if (!written.equals(png)) {
  console.error(`${targetPath} differs from ${entryPath} after writing`);
  process.exit(EXIT_COPY_MISMATCH);
}
const sha256 = createHash("sha256").update(written).digest("hex");
console.log(
  `wrote ${targetPath} (${width}x${height}, ${png.length} bytes, ` +
    `sha256 ${sha256})`,
);
