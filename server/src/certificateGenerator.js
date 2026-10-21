import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontPath = path.join(__dirname, 'Lora-VariableFont.ttf');

let cachedFontBytes = null;
function getFontBytes() {
  if (!cachedFontBytes) {
    if (fs.existsSync(fontPath)) {
      cachedFontBytes = fs.readFileSync(fontPath);
    } else {
      throw new Error('Fail fon Lora tidak ditemui di ' + fontPath);
    }
  }
  return cachedFontBytes;
}

/**
 * Jana fail sijil daripada templat PDF 2 muka surat.
 * Muka surat 1 diubah nama pesilat menggunakan fon Lora saiz 20 warna #c1362d.
 * Muka surat 2 dan seterusnya dikekalkan sepenuhnya.
 */
export async function generateCertificatePdf({
  templatePath,
  templateBytes = null,
  studentName,
  outputPath = null,
  fontSize = 20,
  colorHex = '#c1362d',
  centerXRatio = 0.5235,
  maxBoxWidth = 352
}) {
  const bytes = templateBytes || (templatePath && fs.existsSync(templatePath) ? fs.readFileSync(templatePath) : null);
  if (!bytes) {
    throw new Error('Fail templat sijil tidak wujud: ' + templatePath);
  }

  const pdfDoc = await PDFDocument.load(bytes);
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = getFontBytes();
  const loraFont = await pdfDoc.embedFont(fontBytes);

  const pageCount = pdfDoc.getPageCount();
  if (pageCount < 1) {
    throw new Error('Fail templat tidak mempunyai sebarang muka surat.');
  }

  const page1 = pdfDoc.getPage(0);
  const width = page1.getWidth();
  const height = page1.getHeight();

  // Parse color #c1362d
  let r = 193 / 255, g = 54 / 255, b = 45 / 255;
  if (/^#[0-9a-fA-F]{6}$/.test(colorHex)) {
    r = parseInt(colorHex.slice(1, 3), 16) / 255;
    g = parseInt(colorHex.slice(3, 5), 16) / 255;
    b = parseInt(colorHex.slice(5, 7), 16) / 255;
  }

  const finalFontSize = Number(fontSize) || 20; // Kekalkan saiz font 20 sahaja
  const displayName = String(studentName || '').trim().toUpperCase();
  if (displayName) {
    pdfDoc.setTitle(displayName);
  }

  // Pisahkan nama kepada 1 atau 2 baris mengikut lebar kotak (maxBoxWidth = 352)
  const words = displayName.split(/\s+/).filter(Boolean);
  const singleLine = words.join(' ');
  const singleLineWidth = loraFont.widthOfTextAtSize(singleLine, finalFontSize);

  let lines = [];
  if (singleLineWidth <= maxBoxWidth) {
    lines = [singleLine];
  } else {
    let l1 = [];
    let l2 = [];
    for (const w of words) {
      const candidate = [...l1, w].join(' ');
      if (l2.length === 0 && loraFont.widthOfTextAtSize(candidate, finalFontSize) <= maxBoxWidth) {
        l1.push(w);
      } else {
        l2.push(w);
      }
    }
    if (l2.length === 0 && words.length > 1) {
      const mid = Math.ceil(words.length / 2);
      l1 = words.slice(0, mid);
      l2 = words.slice(mid);
    }
    lines = [l1.join(' '), l2.join(' ')].filter(Boolean);
  }

  const centerX = width * centerXRatio;
  const lineY = height * 0.5718; // Kedudukan garisan horizontal pada templat

  const drawnCoordinates = [];
  if (lines.length === 1) {
    // 1 Baris: diletakkan di atas garisan dengan jarak yang kemas
    const textWidth = loraFont.widthOfTextAtSize(lines[0], finalFontSize);
    const x = Math.max(15, centerX - (textWidth / 2));
    const y = lineY + 18;
    page1.drawText(lines[0], {
      x,
      y,
      size: finalFontSize,
      font: loraFont,
      color: rgb(r, g, b)
    });
    drawnCoordinates.push({ line: lines[0], x, y });
  } else {
    // 2 Baris: kedua-duanya kekal saiz 20, tersusun kemas di atas garisan
    const lineSpacing = 24; // Jarak antara baris atas dan baris bawah
    const bottomLineY = lineY + 13.5;
    const topLineY = bottomLineY + lineSpacing;

    const yPositions = [topLineY, bottomLineY];
    for (let i = 0; i < lines.length; i++) {
      const textWidth = loraFont.widthOfTextAtSize(lines[i], finalFontSize);
      const x = Math.max(15, centerX - (textWidth / 2));
      const y = yPositions[i] ?? (bottomLineY - (i - 1) * lineSpacing);
      page1.drawText(lines[i], {
        x,
        y,
        size: finalFontSize,
        font: loraFont,
        color: rgb(r, g, b)
      });
      drawnCoordinates.push({ line: lines[i], x, y });
    }
  }

  // Simpan fail siap yang menggabungkan Page 1 (diubah) dan Page 2 (asal)
  const resultBytes = await pdfDoc.save();

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, resultBytes);
  }

  return {
    bytes: resultBytes,
    pageCount,
    outputPath,
    fontSize: finalFontSize,
    lines,
    coordinates: drawnCoordinates
  };
}
