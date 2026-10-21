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
  centerXRatio = 0.520,
  yRatio = 0.572
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

  let finalFontSize = Number(fontSize) || 20;
  const displayName = String(studentName || '').trim().toUpperCase();

  // Auto-shrink jika nama terlalu panjang melepasi garisan
  let textWidth = loraFont.widthOfTextAtSize(displayName, finalFontSize);
  const maxWidth = width * 0.72;
  if (textWidth > maxWidth && textWidth > 0) {
    finalFontSize = Math.max(12, Math.floor(finalFontSize * (maxWidth / textWidth)));
    textWidth = loraFont.widthOfTextAtSize(displayName, finalFontSize);
  }

  const centerX = width * centerXRatio;
  const x = Math.max(20, centerX - (textWidth / 2));
  const y = height * yRatio;

  // Tulis nama di Page 1
  page1.drawText(displayName, {
    x,
    y,
    size: finalFontSize,
    font: loraFont,
    color: rgb(r, g, b)
  });

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
    coordinates: { x, y }
  };
}
