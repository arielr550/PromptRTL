#!/usr/bin/env node
"use strict";

// Builds the exact files Chrome loads: dist/promptrtl/ for "Load unpacked" and
// dist/promptrtl-<version>.zip for the Chrome Web Store. Written without
// dependencies so packaging needs nothing beyond Node.js.

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const PACKAGE_ENTRIES = ["manifest.json", "_locales", "src", "popup", "assets/icons"];
const IGNORED_NAMES = new Set([".DS_Store", "Thumbs.db"]);

function listFiles(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  if (!fs.statSync(absolutePath).isDirectory()) return [relativePath];

  return fs
    .readdirSync(absolutePath)
    .filter((name) => !IGNORED_NAMES.has(name))
    .sort()
    .flatMap((name) => listFiles(path.posix.join(relativePath, name)));
}

function packageFiles() {
  return PACKAGE_ENTRIES.flatMap(listFiles);
}

function stageExtension(outputDirectory = path.join(root, "dist", "promptrtl")) {
  const files = packageFiles();
  fs.rmSync(outputDirectory, { recursive: true, force: true });
  for (const file of files) {
    const destination = path.join(outputDirectory, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, file), destination);
  }
  return { outputDirectory, files };
}

function createZip(files, sourceDirectory) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  // A fixed timestamp (1980-01-01) keeps archives byte-for-byte reproducible.
  const dosTime = 0;
  const dosDate = (1 << 5) | 1;

  for (const file of files) {
    const name = Buffer.from(file, "utf8");
    const content = fs.readFileSync(path.join(sourceDirectory, file));
    const compressed = zlib.deflateRawSync(content, { level: 9 });
    const crc = zlib.crc32(content);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);

    localParts.push(local, name, compressed);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

if (require.main === module) {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  const { outputDirectory, files } = stageExtension();
  const zipPath = path.join(root, "dist", `promptrtl-${version}.zip`);
  fs.writeFileSync(zipPath, createZip(files, outputDirectory));

  for (const file of files) console.log(`  ${file}`);
  console.log(`\n${files.length} files -> ${path.relative(root, zipPath)} (${fs.statSync(zipPath).size} bytes)`);
}

module.exports = { PACKAGE_ENTRIES, packageFiles, stageExtension, createZip };
