import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type Rgb = [number, number, number];
// Pedana di gara palette (src/styles/index.css).
const ARENA: Rgb = [0x0b, 0x0c, 0x0e];
const BLUE: Rgb = [0x24, 0x53, 0xd6];
const LUCE: Rgb = [0xf2, 0xf1, 0xec];
const PEDANA: Rgb = [0xb8, 0x87, 0x5a];

/**
 * The 20 kg plate: blue disc, light hub, thin wood ring on the rim, on the arena ground.
 * x and y go from -1 to 1 across the icon; scale < 1 shrinks the artwork into the safe zone
 * of maskable and Apple icons.
 */
function pixel(x: number, y: number, scale: number): Rgb {
  const r = Math.hypot(x / scale, y / scale) / 0.62; // 1 = edge of the plate
  if (r > 1) return ARENA;
  if (r > 0.88) return PEDANA; // the thin ring on the rim
  if (r > 0.3) return BLUE;
  if (r > 0.17) return LUCE; // the hub
  return ARENA;
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

function png(size: number, scale: number): Buffer {
  const SS = 4; // 4×4 supersampling for smooth edges
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((col + (sx + 0.5) / SS) / size) * 2 - 1;
          const y = ((row + (sy + 0.5) / SS) / size) * 2 - 1;
          const c = pixel(x, y, scale);
          for (let i = 0; i < 3; i++) sum[i] = (sum[i] as number) + c[i];
        }
      }
      for (let i = 0; i < 3; i++)
        raw[row * stride + 1 + col * 3 + i] = Math.round((sum[i] as number) / (SS * SS));
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

writeFileSync('public/icon-192.png', png(192, 1));
writeFileSync('public/icon-512.png', png(512, 1));
// Maskable icons are cropped to a circle of 80% diameter: keep the artwork inside it.
writeFileSync('public/icon-maskable-512.png', png(512, 0.8));
writeFileSync('public/apple-touch-icon.png', png(180, 0.92));
