import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fontFileMap = {
  Lora: path.join(__dirname, 'Lora-VariableFont.ttf'),
  Cinzel: path.join(__dirname, 'Cinzel-VariableFont.ttf'),
  Montserrat: path.join(__dirname, 'Montserrat-VariableFont.ttf'),
};

const cachedFontBuffers = {};
function getFontBytes(family = 'Lora') {
  if (cachedFontBuffers[family]) return cachedFontBuffers[family];
  const targetPath = fontFileMap[family] || fontFileMap.Lora;
  if (fs.existsSync(targetPath)) {
    cachedFontBuffers[family] = fs.readFileSync(targetPath);
    return cachedFontBuffers[family];
  }
  if (fs.existsSync(fontFileMap.Lora)) {
    cachedFontBuffers.Lora = fs.readFileSync(fontFileMap.Lora);
    return cachedFontBuffers.Lora;
  }
  throw new Error('Fail fon tidak ditemui: ' + targetPath);
}

/**
 * Jana fail sijil daripada templat PDF.
 * Menyokong saiz font, warna font, jenis font, kedudukan X & Y (drag & drop),
 * serta pilihan format nama (sebaris, dua baris, atau auto).
 */
export async function generateCertificatePdf({
  templatePath,
  templateBytes = null,
  studentName,
  outputPath = null,
  fontSize = 20,
  colorHex = '#c1362d',
  fontFamily = 'Lora',
  posXRatio = null,
  posYRatio = null,
  leftRatio = null,
  topRatio = null,
  nameLayout = 'auto', // 'auto', 'sebaris', 'dua_baris'
  maxBoxWidth = 380
}) {
  const bytes = templateBytes || (templatePath && fs.existsSync(templatePath) ? fs.readFileSync(templatePath) : null);
  if (!bytes) {
    throw new Error('Fail templat sijil tidak wujud: ' + templatePath);
  }

  const pdfDoc = await PDFDocument.load(bytes);
  pdfDoc.registerFontkit(fontkit);

  // 1. Pilih & semat fon (Embed Font)
  let activeFont;
  const fFam = String(fontFamily || 'Lora').trim();
  if (fFam === 'Times-Roman' || fFam === 'Times') {
    activeFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  } else if (fFam === 'Helvetica') {
    activeFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  } else {
    // Custom fontkit fonts: Lora, Cinzel, Montserrat
    const fontBytes = getFontBytes(fFam);
    activeFont = await pdfDoc.embedFont(fontBytes);
  }

  const pageCount = pdfDoc.getPageCount();
  if (pageCount < 1) {
    throw new Error('Fail templat tidak mempunyai sebarang muka surat.');
  }

  const page1 = pdfDoc.getPage(0);
  const width = page1.getWidth();
  const height = page1.getHeight();

  // 2. Parse Warna Hex
  let r = 193 / 255, g = 54 / 255, b = 45 / 255;
  if (/^#[0-9a-fA-F]{6}$/.test(colorHex)) {
    r = parseInt(colorHex.slice(1, 3), 16) / 255;
    g = parseInt(colorHex.slice(3, 5), 16) / 255;
    b = parseInt(colorHex.slice(5, 7), 16) / 255;
  }

  let finalFontSize = Number(fontSize) || 20;
  const displayName = String(studentName || '').trim().toUpperCase();
  if (displayName) {
    pdfDoc.setTitle(displayName);
  }

  // 3. Pengendalian Format Nama (Sebaris vs Dua Baris vs Auto)
  const words = displayName.split(/\s+/).filter(Boolean);
  const singleLine = words.join(' ');
  const singleLineWidth = activeFont.widthOfTextAtSize(singleLine, finalFontSize);

  let lines = [];
  const layoutMode = String(nameLayout || 'auto').toLowerCase();

  if (layoutMode === 'sebaris') {
    // Paksa nama dalam 1 baris
    lines = [singleLine];
    // Jika melebihi lebar maksimum, skala saiz font secara automatik
    if (singleLineWidth > maxBoxWidth && maxBoxWidth > 0) {
      const scaleFactor = maxBoxWidth / singleLineWidth;
      finalFontSize = Math.max(11, Math.floor(finalFontSize * scaleFactor));
    }
  } else if (layoutMode === 'dua_baris') {
    // Paksa nama dalam 2 baris
    if (words.length <= 1) {
      lines = [singleLine];
    } else {
      let splitIdx = words.findIndex((w, idx) => idx > 0 && /^(bin|binti|bt|b\.|a\/l|a\/p)$/i.test(w));
      if (splitIdx === -1) {
        splitIdx = Math.ceil(words.length / 2);
      }
      const l1 = words.slice(0, splitIdx).join(' ');
      const l2 = words.slice(splitIdx).join(' ');
      lines = [l1, l2].filter(Boolean);
    }
  } else {
    // 'auto' - Pisahkan jika melebihi had lebar
    if (singleLineWidth <= maxBoxWidth) {
      lines = [singleLine];
    } else {
      let l1 = [];
      let l2 = [];
      for (const w of words) {
        const candidate = [...l1, w].join(' ');
        if (l2.length === 0 && activeFont.widthOfTextAtSize(candidate, finalFontSize) <= maxBoxWidth) {
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

  // 4. Pengiraan Koordinat Posisi X & Y
  // leftRatio / posXRatio: 0.0 hingga 1.0 dari sisi kiri (default 0.5 = tengah)
  const effectiveLeft = leftRatio !== null && leftRatio !== undefined
    ? Number(leftRatio)
    : (posXRatio !== null && posXRatio !== undefined ? Number(posXRatio) : 0.5);
  const centerX = width * (effectiveLeft > 0 ? effectiveLeft : 0.5);

  // topRatio / posYRatio: 0.0 hingga 1.0 dari sisi atas
  let pdfCenterY;
  const effectiveTop = topRatio !== null && topRatio !== undefined
    ? Number(topRatio)
    : (posYRatio !== null && posYRatio !== undefined ? Number(posYRatio) : null);

  if (effectiveTop !== null && !isNaN(effectiveTop) && effectiveTop > 0 && effectiveTop <= 1) {
    if (effectiveTop >= 0.55 && effectiveTop <= 0.65 && topRatio === null) {
      // Nisbah dari bawah (legacy PDF bottom offset 0.5718)
      pdfCenterY = (height * effectiveTop) + 18;
    } else {
      // Nisbah dari atas (web UI coordinate: 0.0 atas, 1.0 bawah)
      pdfCenterY = height * (1 - effectiveTop);
    }
  } else {
    // Lalai: ~40.7% dari atas (bersamaan posisi rasmi)
    pdfCenterY = height * 0.593;
  }

  const drawnCoordinates = [];
  if (lines.length === 1) {
    const textWidth = activeFont.widthOfTextAtSize(lines[0], finalFontSize);
    const x = Math.max(10, centerX - (textWidth / 2));
    const y = pdfCenterY - (finalFontSize * 0.35);
    page1.drawText(lines[0], {
      x,
      y,
      size: finalFontSize,
      font: activeFont,
      color: rgb(r, g, b)
    });
    drawnCoordinates.push({ line: lines[0], x, y });
  } else {
    const lineSpacing = Math.round(finalFontSize * 1.25);
    const topLineY = pdfCenterY + (lineSpacing * 0.5) - (finalFontSize * 0.35);
    const bottomLineY = pdfCenterY - (lineSpacing * 0.5) - (finalFontSize * 0.35);

    const yPositions = [topLineY, bottomLineY];
    for (let i = 0; i < lines.length; i++) {
      const textWidth = activeFont.widthOfTextAtSize(lines[i], finalFontSize);
      const x = Math.max(10, centerX - (textWidth / 2));
      const y = yPositions[i] ?? (bottomLineY - (i - 1) * lineSpacing);
      page1.drawText(lines[i], {
        x,
        y,
        size: finalFontSize,
        font: activeFont,
        color: rgb(r, g, b)
      });
      drawnCoordinates.push({ line: lines[i], x, y });
    }
  }

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
