import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

function createPng(size, drawPixel) {
  const rowSize = size * 4 + 1;
  const raw = Buffer.alloc(rowSize * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = drawPixel(x, y, size);
      const offset = rowStart + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const compressed = deflateSync(raw);
  const png = Buffer.alloc(compressed.length + 100);
  let offset = 0;

  const writeChunk = (type, data) => {
    png.writeUInt32BE(data.length, offset);
    offset += 4;
    png.write(type, offset);
    offset += 4;
    data.copy(png, offset);
    offset += data.length;
    const crc = crc32(Buffer.concat([Buffer.from(type), data]));
    png.writeUInt32BE(crc, offset);
    offset += 4;
  };

  png.write("89504e470d0a1a0a", offset, "hex");
  offset += 8;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeChunk("IHDR", ihdr);
  writeChunk("IDAT", compressed);
  writeChunk("IEND", Buffer.alloc(0));

  return png.subarray(0, offset);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function drawIconPixel(x, y, size, withBadge) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.42;
  const dx = x - centerX;
  const dy = y - centerY;
  const inCircle = dx * dx + dy * dy <= radius * radius;

  if (withBadge && x > size * 0.68 && y < size * 0.32) {
    const badgeRadius = size * 0.12;
    const badgeDx = x - size * 0.8;
    const badgeDy = y - size * 0.2;
    if (badgeDx * badgeDx + badgeDy * badgeDy <= badgeRadius * badgeRadius) {
      return [239, 68, 68, 255];
    }
  }

  if (!inCircle) {
    return [0, 0, 0, 0];
  }

  const bubbleLeft = size * 0.22;
  const bubbleRight = size * 0.78;
  const bubbleTop = size * 0.24;
  const bubbleBottom = size * 0.68;
  const inBubble =
    x >= bubbleLeft &&
    x <= bubbleRight &&
    y >= bubbleTop &&
    y <= bubbleBottom;

  if (inBubble) {
    return [255, 255, 255, 255];
  }

  return [37, 99, 235, 255];
}

function createIco(images) {
  const headerSize = 6 + images.length * 16;
  let dataOffset = headerSize;
  const entries = images.map((image) => {
    const entry = {
      width: image.size >= 256 ? 0 : image.size,
      height: image.size >= 256 ? 0 : image.size,
      data: image.png,
    };
    const entryOffset = dataOffset;
    dataOffset += image.png.length;
    return { ...entry, offset: entryOffset };
  });

  const buffer = Buffer.alloc(dataOffset);
  buffer.writeUInt16LE(0, 0);
  buffer.writeUInt16LE(1, 2);
  buffer.writeUInt16LE(images.length, 4);

  let headerOffset = 6;
  for (const entry of entries) {
    buffer[headerOffset] = entry.width;
    buffer[headerOffset + 1] = entry.height;
    buffer[headerOffset + 2] = 0;
    buffer[headerOffset + 3] = 0;
    buffer.writeUInt16LE(1, headerOffset + 4);
    buffer.writeUInt16LE(32, headerOffset + 6);
    buffer.writeUInt32LE(entry.data.length, headerOffset + 8);
    buffer.writeUInt32LE(entry.offset, headerOffset + 12);
    headerOffset += 16;
  }

  for (const entry of entries) {
    entry.data.copy(buffer, entry.offset);
  }

  return buffer;
}

await mkdir(publicDir, { recursive: true });

const sizes = [16, 32, 192, 512];
const pngBySize = new Map();

for (const size of sizes) {
  const png = createPng(size, (x, y, canvasSize) => drawIconPixel(x, y, canvasSize, false));
  pngBySize.set(size, png);
  if (size >= 192) {
    await writeFile(path.join(publicDir, `favicon-${String(size)}x${String(size)}.png`), png);
  }
}

const unread192 = createPng(192, (x, y, canvasSize) => drawIconPixel(x, y, canvasSize, true));
const unread32 = createPng(32, (x, y, canvasSize) => drawIconPixel(x, y, canvasSize, true));

await writeFile(path.join(publicDir, "favicon-192x192-unread.png"), unread192);
await writeFile(
  path.join(publicDir, "favicon.ico"),
  createIco([
    { size: 16, png: pngBySize.get(16) },
    { size: 32, png: pngBySize.get(32) },
  ])
);
await writeFile(
  path.join(publicDir, "favicon-unread.ico"),
  createIco([
    { size: 16, png: unread32 },
    { size: 32, png: unread32 },
  ])
);
