import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
  layoutConfig = null,
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

  // Parse layout configuration if provided
  let cfg = {};
  if (typeof layoutConfig === 'string') {
    try { cfg = JSON.parse(layoutConfig); } catch (_) {}
  } else if (layoutConfig && typeof layoutConfig === 'object') {
    cfg = layoutConfig;
  }

  const finalFontSize = Number(cfg.fontSize || fontSize) || 20;
  const finalColorHex = cfg.colorHex || colorHex || '#c1362d';
  const finalFontFamily = cfg.fontFamily || 'Lora';
  const nameLayout = cfg.nameLayout || 'auto'; // 'auto', 'single', 'double'
  const hasCustomPos = cfg.xPercent !== undefined && cfg.yPercent !== undefined;
  const xRatio = hasCustomPos ? (Number(cfg.xPercent) / 100) : centerXRatio;
  const yRatio = hasCustomPos ? (1 - (Number(cfg.yPercent) / 100)) : 0.5718;

  const fontBytes = getFontBytes();
  const loraFont = await pdfDoc.embedFont(fontBytes);

  let selectedFont = loraFont;
  if (finalFontFamily === 'Helvetica' || finalFontFamily === 'Sans') {
    selectedFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  } else if (finalFontFamily === 'Times Roman' || finalFontFamily === 'Times-Roman' || finalFontFamily === 'Serif') {
    selectedFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  } else if (finalFontFamily === 'Courier') {
    selectedFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
  }

  const pageCount = pdfDoc.getPageCount();
  if (pageCount < 1) {
    throw new Error('Fail templat tidak mempunyai sebarang muka surat.');
  }

  const page1 = pdfDoc.getPage(0);
  const width = page1.getWidth();
  const height = page1.getHeight();

  // Parse color
  let r = 193 / 255, g = 54 / 255, b = 45 / 255;
  if (/^#[0-9a-fA-F]{6}$/.test(finalColorHex)) {
    r = parseInt(finalColorHex.slice(1, 3), 16) / 255;
    g = parseInt(finalColorHex.slice(3, 5), 16) / 255;
    b = parseInt(finalColorHex.slice(5, 7), 16) / 255;
  }

  const displayName = String(studentName || '').trim().toUpperCase();
  if (displayName) {
    pdfDoc.setTitle(displayName);
  }

  // Pisahkan nama mengikut pilihan layout (auto, single, atau double)
  const words = displayName.split(/\s+/).filter(Boolean);
  const singleLine = words.join(' ');
  const singleLineWidth = selectedFont.widthOfTextAtSize(singleLine, finalFontSize);

  let lines = [];
  if (nameLayout === 'single') {
    lines = [singleLine];
  } else if (nameLayout === 'double') {
    if (words.length > 1) {
      const mid = Math.ceil(words.length / 2);
      lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    } else {
      lines = [displayName];
    }
  } else {
    // 'auto' mode
    if (singleLineWidth <= maxBoxWidth) {
      lines = [singleLine];
    } else {
      let l1 = [];
      let l2 = [];
      for (const w of words) {
        const candidate = [...l1, w].join(' ');
        if (l2.length === 0 && selectedFont.widthOfTextAtSize(candidate, finalFontSize) <= maxBoxWidth) {
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
  }

  const centerX = width * xRatio;
  const centerY = height * yRatio;

  const drawnCoordinates = [];
  if (lines.length === 1) {
    // 1 Baris:
    // Jika ada posisi tersuai dari web drag & drop, selaraskan titik tengah teks tepat dengan centerY.
    // Huruf besar mempunyai cap-height ~0.70 * fontSize, jadi pusat menegak berada pada (baseline + 0.35 * fontSize).
    // Maka baseline Y dalam PDF = centerY - (0.35 * finalFontSize).
    const textWidth = selectedFont.widthOfTextAtSize(lines[0], finalFontSize);
    const x = Math.max(15, centerX - (textWidth / 2));
    const y = hasCustomPos
      ? centerY - (0.35 * finalFontSize)
      : centerY + 14;

    page1.drawText(lines[0], {
      x,
      y,
      size: finalFontSize,
      font: selectedFont,
      color: rgb(r, g, b)
    });
    drawnCoordinates.push({ line: lines[0], x, y });
  } else {
    // 2 Baris: kedua-duanya tersusun kemas berpusatkan centerY
    const lineSpacing = Math.round(finalFontSize * 1.25);
    const topLineY = hasCustomPos
      ? centerY + (0.5 * lineSpacing) - (0.35 * finalFontSize)
      : centerY + 10 + lineSpacing;
    const bottomLineY = hasCustomPos
      ? centerY - (0.5 * lineSpacing) - (0.35 * finalFontSize)
      : centerY + 10;

    const yPositions = [topLineY, bottomLineY];
    for (let i = 0; i < lines.length; i++) {
      const textWidth = selectedFont.widthOfTextAtSize(lines[i], finalFontSize);
      const x = Math.max(15, centerX - (textWidth / 2));
      const y = yPositions[i] ?? (bottomLineY - (i - 1) * lineSpacing);
      page1.drawText(lines[i], {
        x,
        y,
        size: finalFontSize,
        font: selectedFont,
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
