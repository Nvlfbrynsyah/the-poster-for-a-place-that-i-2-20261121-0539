// Deterministic poster renderer for the make.fun image gate. Run with Node 22.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const S = 2, W = 1024, H = 1024, SW = W * S, SH = H * S;
const pixels = new Uint8Array(SW * SH * 3);
const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
function color(y: number, stops: [number, number, number, number][]) {
  let i = 0; while (i < stops.length - 2 && y > stops[i + 1][0]) i++;
  const a = stops[i], b = stops[i + 1], t = (y - a[0]) / (b[0] - a[0]);
  return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)];
}
const sky = [[0, 42, 37, 83], [280, 104, 54, 108], [530, 212, 91, 102], [700, 245, 164, 91]] as [number, number, number, number][];
for (let y = 0; y < 690 * S; y++) {
  const c = color(y / S, sky);
  for (let x = 0; x < SW; x++) { const p = (y * SW + x) * 3; pixels[p] = c[0]; pixels[p + 1] = c[1]; pixels[p + 2] = c[2]; }
}
const put = (x: number, y: number, c: number[]) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= SW || y >= SH) return; const p = (y * SW + x) * 3; pixels[p] = c[0]; pixels[p + 1] = c[1]; pixels[p + 2] = c[2]; };
function rect(x: number, y: number, w: number, h: number, c: number[]) { for (let yy = Math.floor(y); yy < y + h; yy++) for (let xx = Math.floor(x); xx < x + w; xx++) put(xx, yy, c); }
function circle(cx: number, cy: number, r: number, c: number[]) { for (let y = Math.floor(cy-r); y <= cy+r; y++) for (let x = Math.floor(cx-r); x <= cx+r; x++) if ((x-cx)**2+(y-cy)**2 <= r*r) put(x,y,c); }
function line(x1: number, y1: number, x2: number, y2: number, thick: number, c: number[]) { const n = Math.ceil(Math.hypot(x2-x1,y2-y1)); for(let i=0;i<=n;i++) circle(x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,thick/2,c); }
// Sea, a soft horizon glow, and broken horizontal water bands.
for (let y = 690*S; y < SH; y++) { const t=(y/S-690)/334, c=[mix(19,8,t),mix(94,49,t),mix(99,75,t)]; for(let x=0;x<SW;x++){const p=(y*SW+x)*3; pixels[p]=c[0];pixels[p+1]=c[1];pixels[p+2]=c[2];} }
for (const [y,x,w] of [[716,100,270],[748,610,230],[779,210,400],[818,20,220],[850,675,290],[901,270,300],[947,90,240]] as number[][]) rect(x*S,y*S,w*S,2*S,[48,132,128]);
// Twin sunset discs and a tapered gold path across the still water.
circle(512*S, 624*S, 76*S, [255,191,111]); circle(690*S, 481*S, 43*S, [243,139,146]);
for(let y=690;y<955;y+=2){const half=(y-690)*0.32+8; rect((512-half)*S,y*S,half*2*S,2*S,[mix(240,77,(y-690)/265),mix(172,116,(y-690)/265),mix(89,103,(y-690)/265)]);}
for(const [y,x,w] of [[738,477,69],[764,454,118],[797,437,152],[836,407,210],[878,373,278],[922,340,345]] as number[][]) rect(x*S,y*S,w*S,2*S,[244,179,103]);
// One unmistakable headland and its beacon.
const cliff: [number,number][]=[[700,765],[737,750],[770,723],[806,711],[842,683],[878,669],[914,641],[960,618],[1024,607],[1024,1024],[700,1024]];
for(let y=607*S;y<SH;y++)for(let x=600*S;x<SW;x++){const px=x/S,py=y/S;let inside=false;for(let i=0,j=cliff.length-1;i<cliff.length;j=i++){const [xi,yi]=cliff[i],[xj,yj]=cliff[j];if((yi>py)!==(yj>py)&&px<(xj-xi)*(py-yi)/(yj-yi)+xi)inside=!inside;}if(inside)put(x,y,[31,47,60]);}
rect(850*S,597*S,25*S,76*S,[242,226,193]); rect(845*S,589*S,35*S,9*S,[252,230,191]); rect(854*S,575*S,17*S,14*S,[245,228,195]); rect(851*S,570*S,23*S,5*S,[43,53,67]);
rect(857*S,610*S,5*S,10*S,[255,184,91]); rect(866*S,610*S,5*S,10*S,[255,184,91]);
// Three quiet sails and a few birds.
for(const [x,y] of [[218,804],[741,851],[574,888]]) { line(x*S,y*S,(x+20)*S,y*S,2*S,[240,226,196]); line((x+9)*S,(y-26)*S,(x+9)*S,y*S,2*S,[240,226,196]); line((x+7)*S,(y-22)*S,(x-2)*S,(y-4)*S,3*S,[240,226,196]); line((x+12)*S,(y-18)*S,(x+23)*S,(y-3)*S,3*S,[240,226,196]); }
for(const [x,y] of [[730,290],[790,325],[260,360],[320,338]]) { line((x-8)*S,y*S,x*S,(y-6)*S,2*S,[73,49,72]); line(x*S,(y-6)*S,(x+8)*S,y*S,2*S,[73,49,72]); }
// Original 5x7 bitmap alphabet, expanded for a bold, legible title.
const glyph: Record<string,string[]> = {A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],W:['10001','10001','10001','10101','10101','10101','01010'],Y:['10001','10001','01010','00100','00100','00100','00100']};
function text(str:string,y:number,scale:number,spacing:number,c:number[],width:number){const total=str.length*(5*scale+spacing)-spacing;let x=Math.round((SW-total)/2);for(const ch of str){const g=glyph[ch];if(g)for(let r=0;r<7;r++)for(let q=0;q<5;q++)if(g[r][q]==='1')rect(x+q*scale,y*S+r*scale,scale,scale,c);x+=5*scale+spacing;}}
text('SOLMARA',70,14*S,3*S,[255,241,211],0);
text('WHERE THE SUN SETS TWICE',207,3*S,2*S,[255,230,205],0);
text('THE ISLE OF TWO SUNSETS',968,2*S,2*S,[255,231,197],0);
// Cream keyline and a second inset rule.
rect(18*S,18*S,988*S,2*S,[255,232,194]); rect(18*S,1004*S,988*S,2*S,[255,232,194]); rect(18*S,18*S,2*S,988*S,[255,232,194]); rect(1004*S,18*S,2*S,988*S,[255,232,194]);
const crcTable = new Uint32Array(256); for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
function crc(b:Uint8Array){let c=0xffffffff;for(const v of b)c=crcTable[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type:string,data:Uint8Array){const name=Buffer.from(type), body=Buffer.concat([name,data]), out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);body.copy(out,4);out.writeUInt32BE(crc(body),8+data.length);return out;}
// 2x box-filter to final RGB image, then encode unfiltered scanlines.
const rgb=Buffer.alloc(W*H*3);for(let y=0;y<H;y++)for(let x=0;x<W;x++)for(let ch=0;ch<3;ch++){let sum=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)sum+=pixels[(((y*2+dy)*SW+x*2+dx)*3)+ch];rgb[(y*W+x)*3+ch]=sum/4;}
const raw=Buffer.alloc((W*3+1)*H);for(let y=0;y<H;y++)rgb.copy(raw,y*(W*3+1)+1,y*W*3,(y+1)*W*3);
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
const out=process.env.MAKEFUN_OUTPUT_DIR ?? '/output';await mkdir(out,{recursive:true});await writeFile(join(out,'entry.png'),png);
