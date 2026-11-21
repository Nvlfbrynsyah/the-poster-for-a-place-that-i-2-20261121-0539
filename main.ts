// SOLMARA: an imagined island, rendered deterministically for the poster gate.
// Local preview: MAKEFUN_OUTPUT_DIR=out1 node main.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024, S = 2, N = W * S;
const pixels = new Uint8Array(N * N * 3);
type Color = [number, number, number];
const cream: Color = [255, 239, 204];
const mix = (a: Color, b: Color, t: number): Color => a.map((v, k) => v + (b[k] - v) * t) as Color;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
function dot(x: number, y: number, c: Color, a = 1) {
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  const i = (y * N + x) * 3;
  for (let k = 0; k < 3; k++) pixels[i + k] = Math.round(pixels[i + k] * (1 - a) + c[k] * a);
}
function rect(x: number, y: number, w: number, h: number, c: Color, a = 1) {
  for (let j = Math.max(0, Math.floor(y * S)); j < Math.min(N, (y + h) * S); j++)
    for (let i = Math.max(0, Math.floor(x * S)); i < Math.min(N, (x + w) * S); i++) dot(i, j, c, a);
}
function ellipse(cx: number, cy: number, rx: number, ry: number, c: Color, a = 1) {
  for (let y = Math.max(0, Math.floor((cy - ry) * S)); y <= Math.min(N - 1, (cy + ry) * S); y++) {
    const t = (y / S - cy) / ry;
    const dx = rx * Math.sqrt(Math.max(0, 1 - t * t));
    for (let x = Math.max(0, Math.ceil((cx - dx) * S)); x <= Math.min(N - 1, (cx + dx) * S); x++) dot(x, y, c, a);
  }
}
function poly(p: number[][], c: Color, a = 1) {
  const lo = Math.max(0, Math.floor(Math.min(...p.map(v => v[1])) * S));
  const hi = Math.min(N - 1, Math.ceil(Math.max(...p.map(v => v[1])) * S));
  for (let y = lo; y <= hi; y++) {
    const yy = (y + .5) / S, hits: number[] = [];
    for (let i = 0; i < p.length; i++) {
      const q = p[i], r = p[(i + 1) % p.length];
      if ((q[1] <= yy && r[1] > yy) || (r[1] <= yy && q[1] > yy)) hits.push(q[0] + (yy - q[1]) * (r[0] - q[0]) / (r[1] - q[1]));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2)
      for (let x = Math.max(0, Math.ceil(hits[i] * S)); x < Math.min(N, hits[i + 1] * S); x++) dot(x, y, c, a);
  }
}
function line(x: number, y: number, xx: number, yy: number, width: number, c: Color, a = 1) {
  const d = Math.hypot(xx - x, yy - y), nx = -(yy - y) / d * width / 2, ny = (xx - x) / d * width / 2;
  poly([[x + nx, y + ny], [xx + nx, yy + ny], [xx - nx, yy - ny], [x - nx, y - ny]], c, a);
}
function halo(cx: number, cy: number, r: number, c: Color, strength: number) {
  for (let y = Math.max(0, Math.floor((cy - r) * S)); y < Math.min(N, (cy + r) * S); y++)
    for (let x = Math.max(0, Math.floor((cx - r) * S)); x < Math.min(N, (cx + r) * S); x++) {
      const t = clamp(1 - Math.hypot(x / S - cx, y / S - cy) / r);
      if (t) dot(x, y, c, t * t * strength);
    }
}

// A continuous dusk sky and a sea that gains weight toward the foreground.
const sky: [number, Color][] = [[0, [42, 33, 76]], [.42, [111, 59, 103]], [.73, [207, 111, 119]], [1, [255, 186, 111]]];
for (let y = 0; y < N; y++) {
  const py = y / S;
  let c: Color;
  if (py < 558) {
    const t = py / 558;
    let k = 0; while (k < sky.length - 2 && t > sky[k + 1][0]) k++;
    c = mix(sky[k][1], sky[k + 1][1], (t - sky[k][0]) / (sky[k + 1][0] - sky[k][0]));
  } else c = mix([57, 133, 139], [10, 46, 65], Math.pow((py - 558) / 466, .72));
  for (let x = 0; x < N; x++) dot(x, y, c);
}

// Horizontal, rose-edged cloud ribbons leave the paired suns a clear stage.
for (const [x, y, rx, ry] of [[130, 330, 165, 9], [742, 310, 185, 7], [824, 420, 130, 8]]) {
  ellipse(x, y, rx, ry, [177, 100, 133], .28);
  ellipse(x - 12, y - 3, rx * .9, ry * .28, [255, 184, 165], .45);
}
// Feathered concentric glazes carry the light beyond each disc's edge.
function sunGlow(cx: number, cy: number, rings: number[][], color: Color, feather: number) {
  for (const [radius, opacity] of rings) {
    for (let y = Math.max(0, Math.floor((cy - radius) * S)); y < Math.min(558 * S, (cy + radius) * S); y++)
      for (let x = Math.max(0, Math.floor((cx - radius) * S)); x < Math.min(N, (cx + radius) * S); x++) {
        const t = clamp((radius - Math.hypot(x / S - cx, y / S - cy)) / feather);
        if (t) dot(x, y, color, opacity * t * t * (3 - 2 * t));
      }
  }
}
sunGlow(418, 470, [[154, .08], [136, .10], [118, .14], [102, .20]], [255, 204, 125], 18);
sunGlow(418, 342, [[54, .04], [46, .06], [38, .09]], [255, 177, 171], 10);
ellipse(418, 342, 30, 30, [247, 164, 163]);
ellipse(418, 470, 88, 88, [255, 209, 126]);
ellipse(418, 467, 83, 83, [255, 213, 137], .24);
line(40, 558, 744, 558, 1.5, [255, 210, 149], .65);

// One uninterrupted trapezoid of light: narrow at the sun, broad at our feet.
for (let y = 559 * S; y < 973 * S; y++) {
  const t = (y / S - 559) / 414, half = 12 + 164 * t;
  const gold = mix([255, 209, 123], [182, 157, 91], t);
  for (let x = Math.ceil((418 - half) * S); x < (418 + half) * S; x++) {
    const edge = clamp((half - Math.abs(x / S - 418)) / 5);
    dot(x, y, gold, (.87 * Math.pow(1 - t, .85)) * edge);
  }
}
for (let i = 0; i < 27; i++) {
  const t = i / 26, y = 574 + Math.pow(t, 1.45) * 375;
  for (let j = 0; j < 5; j++) {
    const x = 41 + j * 214 + Math.sin(i * 2.3 + j) * 32;
    const len = 15 + t * 73 + 13 * Math.sin(i + j);
    line(x, y, x + len, y - .6, .7 + t * .7, [7, 51, 70], .13 + t * .14);
  }
}
for (const [y, w] of [[580, 24], [605, 36], [646, 58], [697, 78], [764, 116], [849, 155]]) {
  ellipse(418 + Math.sin(y) * 9, y, w / 2, 1.2, [255, 223, 155], .28);
}

// The far shoulder and the near cape have separate, irregular shorelines.
poly([[645, 588], [690, 558], [724, 541], [753, 501], [784, 491], [813, 460], [842, 470], [864, 455], [894, 475], [936, 456], [977, 473], [1024, 465], [1024, 704], [947, 687], [866, 660], [791, 627], [721, 615]], [75, 79, 101]);
poly([[689, 655], [736, 620], [774, 582], [797, 558], [829, 548], [850, 517], [882, 522], [918, 498], [950, 510], [982, 489], [1024, 503], [1024, 803], [976, 778], [923, 743], [867, 723], [828, 693], [772, 685], [735, 667]], [28, 54, 70]);
poly([[850, 550], [891, 545], [930, 525], [966, 533], [1024, 516], [1024, 549], [964, 551], [916, 564], [880, 562]], [58, 76, 85], .56);
poly([[811, 605], [852, 591], [899, 603], [948, 580], [1024, 591], [1024, 606], [947, 599], [900, 619], [853, 611]], [66, 82, 89], .36);
line(695, 660, 773, 691, 2, [200, 184, 147], .55);
line(780, 694, 828, 704, 1.5, [218, 208, 167], .5);

// The lighthouse, tiny balconies and amber glass make the headland habitable.
halo(839, 393, 53, [255, 208, 126], .2);
poly([[824, 466], [830, 398], [846, 398], [853, 466]], cream);
poly([[840, 398], [846, 398], [853, 466], [841, 466]], [197, 174, 160]);
rect(825, 382, 26, 17, [255, 201, 114]);
rect(825, 382, 4, 17, [46, 48, 69]); rect(837, 382, 3, 17, [46, 48, 69]); rect(848, 382, 3, 17, [46, 48, 69]);
poly([[819, 382], [838, 369], [857, 382]], [44, 47, 67]);
line(838, 369, 838, 361, 2, cream);
rect(820, 399, 36, 3, cream); rect(822, 402, 32, 2, [41, 49, 67]);
rect(835, 424, 5, 9, [247, 180, 103]); rect(836, 450, 6, 15, [57, 58, 72]);
poly([[851, 390], [973, 368], [973, 403]], [255, 211, 147], .055);

function cottage(x: number, y: number, w: number, h: number) {
  halo(x + w / 2, y + h / 2, 22, [255, 191, 112], .08);
  rect(x, y, w, h, [241, 219, 185]);
  rect(x + w * .76, y, w * .24, h, [173, 164, 153]);
  poly([[x - 3, y], [x + w * .46, y - 10], [x + w + 3, y]], [113, 82, 91]);
  rect(x + 4, y + 5, 5, 7, [255, 186, 93]); rect(x + w - 10, y + 5, 5, 7, [255, 186, 93]);
  rect(x + w * .45, y + h - 10, 5, 10, [57, 65, 77]);
}
cottage(758, 644, 29, 22); cottage(788, 651, 32, 25); cottage(820, 661, 25, 21);
cottage(789, 622, 25, 21); cottage(824, 637, 27, 22);
line(749, 674, 853, 700, 2, [222, 196, 152], .6);
for (let i = 0; i < 5; i++) line(777 + i * 9, 679 + i * 2.3, 775 + i * 9, 687 + i * 2.3, 1.5, [212, 185, 146], .55);

function boat(x: number, y: number, s: number) {
  ellipse(x + 1, y + 10 * s, 32 * s, 2 * s, [211, 199, 163], .18);
  ellipse(x + 5, y + 18 * s, 22 * s, 1.6 * s, [216, 200, 159], .12);
  line(x, y - 94 * s, x, y, 2 * s, [47, 55, 68]);
  poly([[x - 4 * s, y - 88 * s], [x - 43 * s, y - 10 * s], [x - 4 * s, y - 13 * s]], cream);
  poly([[x + 4 * s, y - 75 * s], [x + 30 * s, y - 14 * s], [x + 4 * s, y - 14 * s]], [243, 213, 171]);
  poly([[x - 40 * s, y - 5 * s], [x + 37 * s, y - 5 * s], [x + 25 * s, y + 5 * s], [x - 26 * s, y + 5 * s]], [27, 44, 63]);
  line(x - 36 * s, y - 5 * s, x + 35 * s, y - 5 * s, 2 * s, [221, 160, 117]);
}
boat(239, 752, 1); boat(579, 587, .31);
for (const [x, y, size] of [[615, 368, 12], [650, 353, 9], [693, 384, 11]]) {
  line(x - size, y - 3, x, y + 2, 2, [65, 52, 78]); line(x, y + 2, x + size, y - 5, 2, [65, 52, 78]);
}

const font: Record<string, string[]> = {
  A: ['01110','11011','11011','11111','11011','11011','11011'],
  C: ['01111','11000','11000','11000','11000','11000','01111'],
  E: ['11111','11000','11000','11110','11000','11000','11111'],
  F: ['11111','11000','11000','11110','11000','11000','11000'],
  H: ['11011','11011','11011','11111','11011','11011','11011'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  L: ['11000','11000','11000','11000','11000','11000','11111'],
  M: ['10001','11011','11111','10101','10001','10001','10001'],
  N: ['11001','11001','11101','11111','11011','11011','11001'],
  O: ['01110','11011','11011','11011','11011','11011','01110'],
  R: ['11110','11011','11011','11110','11100','11010','11011'],
  S: ['01111','11000','11000','01110','00011','00011','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['11011','11011','11011','11011','11011','11011','01110'],
  W: ['10001','10001','10001','10101','11111','11011','10001'],
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
};
function text(str: string, y: number, size: number, gap: number, c: Color, shadow = false) {
  const width = str.length * 5 * size + (str.length - 1) * gap;
  const start = (W - width) / 2;
  for (const ch of str) if (!font[ch]) throw new Error(`Missing glyph ${ch}`);
  function draw(dx: number, dy: number, color: Color, alpha: number) {
    [...str].forEach((ch, i) => font[ch].forEach((row, j) => [...row].forEach((v, k) => {
      if (v === '1') rect(start + i * (5 * size + gap) + k * size + dx, y + j * size + dy, size, size, color, alpha);
    })));
  }
  if (shadow) draw(3, 3, [38, 27, 62], .35);
  draw(0, 0, c, 1);
}
text('SOLMARA', 94, 20, 20, cream, true);
text('WHERE THE SUN SETS TWICE', 266, 2.5, 4, cream);
line(393, 306, 443, 306, 1, cream, .6);
text('THE ISLE OF TWO SUNSETS', 951, 2, 3.5, cream);
rect(26, 26, 972, 1.5, cream, .8); rect(26, 996.5, 972, 1.5, cream, .8);
rect(26, 26, 1.5, 972, cream, .8); rect(996.5, 26, 1.5, 972, cream, .8);

// RGB PNG, box-filtered from the 2x working canvas; no ancillary chunks.
const raw = Buffer.alloc((W * 3 + 1) * W);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) {
  const p = ((y * 2) * N + x * 2) * 3 + k;
  raw[y * (W * 3 + 1) + 1 + x * 3 + k] = Math.round((pixels[p] + pixels[p + 3] + pixels[p + N * 3] + pixels[p + N * 3 + 3]) / 4);
}
const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[i] = c >>> 0;
}
function chunk(name: string, data: Buffer) {
  const type = Buffer.from(name), body = Buffer.concat([type, data]);
  let crc = 0xffffffff; for (const v of body) crc = table[(crc ^ v) & 255] ^ (crc >>> 8);
  const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4);
  return out;
}
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
if (png.length > 1048576) throw new Error('PNG exceeds the gate');
const dir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output'; mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'entry.png'), png);
console.log(`SOLMARA: ${W}x${W}, ${png.length} bytes`);
