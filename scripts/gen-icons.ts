import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type Rgb = [number, number, number];
const RUBBER: Rgb = [0x1f, 0x1e, 0x1c];
const BLUE: Rgb = [0x2b, 0x5d, 0xd8];
const CHALK: Rgb = [0xed, 0xeb, 0xe6];

// r is the distance from the centre, 1 = edge of the plate.
function plate(r: number): Rgb {
  if (r > 1) return RUBBER;
  if (r > 0.8 && r <= 0.84) return RUBBER; // groove near the rim
  if (r > 0.3) return BLUE;
  if (r > 0.17) return CHALK;
  return RUBBER;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let c = ~0;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** radius: plate radius as a fraction of half the icon size. */
function png(size: number, radius: number): Buffer {
  const SS = 4; // 4×4 supersampling for smooth edges
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const dx = x + (sx + 0.5) / SS - half;
          const dy = y + (sy + 0.5) / SS - half;
          const c = plate(Math.hypot(dx, dy) / (half * radius));
          for (let i = 0; i < 3; i++) sum[i] = (sum[i] as number) + c[i];
        }
      }
      for (let i = 0; i < 3; i++)
        raw[y * stride + 1 + x * 3 + i] = Math.round((sum[i] as number) / (SS * SS));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icon-192.png', png(192, 0.86));
writeFileSync('public/icon-512.png', png(512, 0.86));
// Maskable icons are cropped to a circle of 80% diameter: keep the plate inside it.
writeFileSync('public/icon-maskable-512.png', png(512, 0.72));
writeFileSync('public/apple-touch-icon.png', png(180, 0.8));
