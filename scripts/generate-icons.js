import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  const rawBytes = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      rawBytes[offset++] = r;
      rawBytes[offset++] = g;
      rawBytes[offset++] = b;
      rawBytes[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawBytes);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        if ((crc ^ byte) & 1) {
          crc = (crc >>> 1) ^ 0xedb88320;
        } else {
          crc = crc >>> 1;
        }
        byte >>>= 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = crc32(crcBuf);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function renderAppIcon(size, isMaskable = false) {
  const radius = isMaskable ? 0 : Math.round(size * 0.22);
  const center = size / 2;

  return createPNG(size, size, (x, y) => {
    // Check rounded rect corner if not maskable
    if (!isMaskable) {
      const dx = Math.max(0, Math.abs(x - center) - (center - radius));
      const dy = Math.max(0, Math.abs(y - center) - (center - radius));
      if (dx * dx + dy * dy > radius * radius) {
        return [0, 0, 0, 0]; // Transparent
      }
    }

    // Gradient background: #4F46E5 (79, 70, 229) to #7C3AED (124, 58, 237)
    const t = (x + y) / (size * 2);
    let r = Math.round(79 * (1 - t) + 124 * t);
    let g = Math.round(70 * (1 - t) + 58 * t);
    let b = Math.round(229 * (1 - t) + 237 * t);
    let a = 255;

    // Document bounds (centered, ~55% of icon size)
    const docW = size * (isMaskable ? 0.44 : 0.52);
    const docH = size * (isMaskable ? 0.58 : 0.66);
    const docLeft = center - docW / 2;
    const docTop = center - docH / 2;
    const docRight = docLeft + docW;
    const docBottom = docTop + docH;
    const foldSize = docW * 0.28;

    // Inside document
    if (x >= docLeft && x <= docRight && y >= docTop && y <= docBottom) {
      // Top right folded corner
      const foldX = docRight - foldSize;
      const foldY = docTop + foldSize;

      if (x > foldX && y < foldY && (x - foldX) + (y - docTop) > foldSize) {
        // Outside the fold -> background
      } else if (x > foldX && y < foldY) {
        // The fold flap (slightly darker shade)
        r = 218;
        g = 222;
        b = 233;
      } else {
        // Main white document body
        r = 255;
        g = 255;
        b = 255;

        // Draw horizontal content stripes (PDF text lines)
        const lineLeft = docLeft + docW * 0.18;
        const lineRight = docRight - docW * 0.18;
        const line1Y = docTop + docH * 0.36;
        const line2Y = docTop + docH * 0.48;
        const line3Y = docTop + docH * 0.60;
        const line4Y = docTop + docH * 0.72;
        const lineH = Math.max(2, size * 0.024);

        const inLine1 = x >= lineLeft && x <= docLeft + docW * 0.48 && y >= line1Y && y <= line1Y + lineH;
        const inLine2 = x >= lineLeft && x <= lineRight && y >= line2Y && y <= line2Y + lineH;
        const inLine3 = x >= lineLeft && x <= lineRight && y >= line3Y && y <= line3Y + lineH;
        const inLine4 = x >= lineLeft && x <= docLeft + docW * 0.55 && y >= line4Y && y <= line4Y + lineH;

        if (inLine1 || inLine2 || inLine3 || inLine4) {
          // Indigo line stripe
          r = 99;
          g = 102;
          b = 241;
        }

        // Draw a heart / feather badge in bottom right of doc
        const badgeR = docW * 0.18;
        const badgeCx = docRight - docW * 0.22;
        const badgeCy = docBottom - docH * 0.20;
        const bdx = x - badgeCx;
        const bdy = y - badgeCy;
        if (bdx * bdx + bdy * bdy <= badgeR * badgeR) {
          // Vibrant Rose Badge
          r = 244;
          g = 63;
          b = 94;
        }
      }
    }

    return [r, g, b, a];
  });
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating 192x192 icon...');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), renderAppIcon(192, false));

console.log('Generating 512x512 icon...');
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), renderAppIcon(512, false));

console.log('Generating 512x512 maskable icon...');
fs.writeFileSync(path.join(publicDir, 'icon-512-maskable.png'), renderAppIcon(512, true));

console.log('Generating apple-touch-icon.png...');
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderAppIcon(180, false));

console.log('All icons generated successfully!');
