// Fresh, deterministic travel-poster renderer. Run with `node main.ts`; writes entry.png under MAKEFUN_OUTPUT_DIR (or /output).
// The rasterizer and PNG encoder use only Node's built-in modules.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const OUT_W = 1024;
const OUT_H = 1024;
const SCALE = 2;
const W = OUT_W * SCALE;
const H = OUT_H * SCALE;
const pixels = Buffer.alloc(W * H * 3);

const FONT = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','11001','10101','10011','10011','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  W: ['10001','10001','10001','10101','10101','10101','01010'],
  Y: ['10001','10001','01010','00100','00100','00100','00100']
};
const COPY = 'SOLMARA WHERE THE SUN SETS TWICE THE ISLE OF TWO SUNSETS';
for (const char of new Set(COPY.replaceAll(' ', ''))) {
  if (!FONT[char]) throw new Error(`Missing poster glyph: ${char}`);
}

const rgb = (r, g, b) => [r, g, b];
function smooth(t) { return t * t * (3 - 2 * t); }
function gradient(stops, t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const a = stops[i - 1], b = stops[i];
      const u = smooth((t - a[0]) / (b[0] - a[0]));
      return a[1].map((v, c) => Math.round(v + (b[1][c] - v) * u));
    }
  }
  return stops[stops.length - 1][1];
}
const skyStops = [
  [0, rgb(43, 36, 91)], [.27, rgb(82, 48, 115)], [.57, rgb(154, 72, 119)],
  [.84, rgb(221, 105, 98)], [1, rgb(244, 164, 83)]
];
const seaStops = [
  [0, rgb(17, 68, 78)], [.3, rgb(14, 59, 72)], [.72, rgb(11, 47, 63)], [1, rgb(9, 39, 56)]
];
for (let y = 0; y < H; y++) {
  const logicalY = y / SCALE;
  const color = logicalY < 622
    ? gradient(skyStops, logicalY / 622)
    : gradient(seaStops, (logicalY - 622) / (OUT_H - 622));
  let p = y * W * 3;
  for (let x = 0; x < W; x++, p += 3) {
    pixels[p] = color[0]; pixels[p + 1] = color[1]; pixels[p + 2] = color[2];
  }
}

function rect(x, y, width, height, color, alpha = 1) {
  const x0 = Math.max(0, Math.floor(x * SCALE));
  const y0 = Math.max(0, Math.floor(y * SCALE));
  const x1 = Math.min(W, Math.ceil((x + width) * SCALE));
  const y1 = Math.min(H, Math.ceil((y + height) * SCALE));
  for (let py = y0; py < y1; py++) {
    let p = (py * W + x0) * 3;
    for (let px = x0; px < x1; px++, p += 3) {
      pixels[p] = Math.round(pixels[p] * (1 - alpha) + color[0] * alpha);
      pixels[p + 1] = Math.round(pixels[p + 1] * (1 - alpha) + color[1] * alpha);
      pixels[p + 2] = Math.round(pixels[p + 2] * (1 - alpha) + color[2] * alpha);
    }
  }
}
function circle(cx, cy, radius, color, alpha = 1) {
  const xCenter = cx * SCALE, yCenter = cy * SCALE, r = radius * SCALE;
  for (let py = Math.max(0, Math.floor(yCenter - r)); py < Math.min(H, Math.ceil(yCenter + r)); py++) {
    const dy = py + .5 - yCenter;
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
    const x0 = Math.max(0, Math.ceil(xCenter - dx));
    const x1 = Math.min(W, Math.floor(xCenter + dx));
    let p = (py * W + x0) * 3;
    for (let px = x0; px <= x1; px++, p += 3) {
      pixels[p] = Math.round(pixels[p] * (1 - alpha) + color[0] * alpha);
      pixels[p + 1] = Math.round(pixels[p + 1] * (1 - alpha) + color[1] * alpha);
      pixels[p + 2] = Math.round(pixels[p + 2] * (1 - alpha) + color[2] * alpha);
    }
  }
}
function polygon(points, color) {
  const pts = points.map(([x, y]) => [x * SCALE, y * SCALE]);
  const minY = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1]))));
  const maxY = Math.min(H, Math.ceil(Math.max(...pts.map(p => p[1]))));
  for (let y = minY; y < maxY; y++) {
    const scan = y + .5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= scan && y2 > scan) || (y2 <= scan && y1 > scan))
        xs.push(x1 + (scan - y1) * (x2 - x1) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i]));
      const x1 = Math.min(W, Math.floor(xs[i + 1]));
      let p = (y * W + x0) * 3;
      for (let x = x0; x <= x1; x++, p += 3) {
        pixels[p] = color[0]; pixels[p + 1] = color[1]; pixels[p + 2] = color[2];
      }
    }
  }
}
function line(x1, y1, x2, y2, color, width, alpha = 1) {
  const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
  const steps = Math.max(1, Math.ceil(Math.sqrt(len2) * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    circle(x1 + dx * t, y1 + dy * t, width / 2, color, alpha);
  }
}

// A thin warm horizon separates the two calm colour fields.
rect(0, 620, 1024, 2, [248, 180, 112], .8);

// A pair of suns: the lower amber disc and its smaller rose echo.
circle(376, 531, 82, [241, 157, 76]);
circle(706, 360, 43, [231, 124, 132]);
// Fine cut lines make the lower disc feel like a printed vintage sun.
rect(302, 547, 148, 3, [225, 126, 83], .62);
rect(313, 560, 126, 3, [225, 126, 83], .62);
rect(329, 574, 94, 3, [225, 126, 83], .62);

// Distant warm cloud strokes, kept sparse so the sky remains open.
rect(104, 394, 119, 2, [255, 196, 150], .28);
rect(145, 402, 72, 2, [255, 196, 150], .2);
rect(540, 464, 94, 2, [255, 191, 139], .24);
rect(575, 472, 57, 2, [255, 191, 139], .17);

// Little birds, each a pair of calm dark strokes.
const bird = (x, y, s) => {
  line(x, y, x + s * .48, y + s * .32, [74, 47, 85], 2.2, .85);
  line(x + s * .48, y + s * .32, x + s, y, [74, 47, 85], 2.2, .85);
};
bird(188, 288, 17); bird(231, 314, 12); bird(825, 278, 15); bird(862, 300, 10);

// Gentle, broken gold reflection broadens toward the viewer.
for (let y = 628, row = 0; y < 920; y += 9, row++) {
  const t = (y - 628) / (920 - 628);
  const half = 8 + t * 91;
  const alpha = .3 + .28 * (1 - t);
  const color = row % 3 === 0 ? [250, 194, 111] : [233, 155, 88];
  const offset = row % 2 ? half * .18 : -half * .12;
  const center = 376 + offset;
  rect(center - half, y, half * .62, 3.2, color, alpha);
  rect(center + half * .18, y, half * .82, 3.2, color, alpha * .82);
}

// A single dark headland anchors the right third of the island.
const cliff = [
  [752, 621], [779, 567], [797, 539], [818, 530], [836, 493], [856, 506],
  [875, 468], [899, 480], [920, 446], [943, 465], [963, 440], [986, 456],
  [1024, 432], [1024, 1024], [752, 1024]
];
polygon(cliff, [22, 42, 60]);
polygon([[752,621],[779,567],[797,539],[818,530],[836,493],[856,506],[875,468],[899,480],[920,446],[943,465],[963,440],[986,456],[1024,432],[1024,622]], [28, 55, 69]);

// The slim white lighthouse rises from the ridge, with a warm lantern room.
rect(895, 365, 17, 101, [238, 226, 196]);
polygon([[891, 366], [916, 366], [913, 356], [894, 356]], [245, 226, 187]);
rect(893, 345, 21, 13, [248, 207, 145]);
rect(890, 343, 27, 4, [250, 224, 181]);
polygon([[889, 343], [918, 343], [904, 334]], [63, 48, 68]);
rect(899, 348, 9, 7, [255, 192, 103]);
rect(899, 389, 8, 13, [224, 151, 92]);
rect(899, 422, 8, 13, [224, 151, 92]);
rect(889, 461, 29, 7, [211, 202, 179]);

// Three tiny sailboats give the sea a human scale.
const boat = (x, y, s) => {
  polygon([[x, y], [x + s, y], [x + s * .78, y + s * .24], [x + s * .2, y + s * .24]], [18, 43, 58]);
  rect(x + s * .46, y - s * .76, 1.5, s * .76, [231, 220, 194]);
  polygon([[x + s * .43, y - s * .68], [x + s * .43, y - s * .1], [x + s * .08, y - s * .1]], [239, 221, 188]);
  polygon([[x + s * .52, y - s * .61], [x + s * .52, y - s * .1], [x + s * .87, y - s * .1]], [213, 177, 145]);
};
boat(158, 746, 34); boat(565, 797, 27); boat(677, 711, 29);

// Restrained water bands, drawn behind the border and footer.
for (const [x, y, w] of [[68,671,91],[222,682,70],[470,661,66],[553,679,43],[643,660,54],[159,822,70],[469,856,60],[574,901,78],[312,925,48]]) {
  rect(x, y, w, 1.7, [128, 171, 164], .24);
}

const cream = [255, 239, 205];
function textWidth(text, cell, gap) {
  let width = 0;
  for (const ch of text) width += ch === ' ' ? cell * 2.5 : cell * 5;
  return width + Math.max(0, text.length - 1) * gap;
}
function drawText(text, x, y, cell, gap, color, shadow = null) {
  let cursor = x;
  for (const ch of text) {
    if (ch === ' ') { cursor += cell * 2.5 + gap; continue; }
    const glyph = FONT[ch];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === '1') {
          if (shadow) rect(cursor + col * cell + shadow.dx, y + row * cell + shadow.dy, cell, cell, shadow.color, shadow.alpha);
          rect(cursor + col * cell, y + row * cell, cell, cell, color);
        }
      }
    }
    cursor += cell * 5 + gap;
  }
}

// Main name: increased scale makes the island's name the unmistakable first read.
const title = 'SOLMARA', titleCell = 15, titleGap = 4;
drawText(title, (OUT_W - textWidth(title, titleCell, titleGap)) / 2, 76, titleCell, titleGap, cream,
  { dx: 2, dy: 3, color: [52, 37, 84], alpha: .55 });
const tagline = 'WHERE THE SUN SETS TWICE', tagCell = 4, tagGap = 3;
drawText(tagline, (OUT_W - textWidth(tagline, tagCell, tagGap)) / 2, 194, tagCell, tagGap,
  [255, 229, 196], { dx: 1, dy: 1, color: [61, 42, 87], alpha: .55 });
const footer = 'THE ISLE OF TWO SUNSETS', footCell = 3, footGap = 3;
drawText(footer, (OUT_W - textWidth(footer, footCell, footGap)) / 2, 954, footCell, footGap, cream);

// A paired, hairline cream frame encloses the print.
rect(19, 19, 986, 2, cream, .9); rect(19, 1003, 986, 2, cream, .9);
rect(19, 19, 2, 986, cream, .9); rect(1003, 19, 2, 986, cream, .9);
rect(25, 25, 974, 1, [255, 239, 205], .38); rect(25, 998, 974, 1, [255, 239, 205], .38);
rect(25, 25, 1, 974, [255, 239, 205], .38); rect(998, 25, 1, 974, [255, 239, 205], .38);

function downsample() {
  const out = Buffer.alloc(OUT_W * OUT_H * 3);
  for (let y = 0; y < OUT_H; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const a = ((y * 2) * W + x * 2) * 3;
      const b = a + W * 3;
      const d = (y * OUT_W + x) * 3;
      for (let c = 0; c < 3; c++) out[d + c] = (pixels[a + c] + pixels[a + 3 + c] + pixels[b + c] + pixels[b + 3 + c] + 2) >> 2;
    }
  }
  return out;
}
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const body = Buffer.concat([name, data]);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}
function encodePNG(image) {
  const scanlines = Buffer.alloc(OUT_H * (OUT_W * 3 + 1));
  for (let y = 0; y < OUT_H; y++) {
    const dst = y * (OUT_W * 3 + 1);
    scanlines[dst] = 0;
    image.copy(scanlines, dst + 1, y * OUT_W * 3, (y + 1) * OUT_W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(OUT_W, 0); ihdr.writeUInt32BE(OUT_H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(scanlines, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'entry.png'), encodePNG(downsample()));
