import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Utility to download generated binary data in browser
 */
export function downloadBlob(data: Uint8Array, fileName: string, mimeType = 'application/pdf') {
  const blob = new Blob([data as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get total page count from a PDF file
 */
export async function getPDFPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (err) {
    console.error('Error getting page count:', err);
    return 1;
  }
}

/**
 * Merge multiple PDF files into one in given order
 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  if (files.length === 0) throw new Error('Tidak ada file untuk digabungkan');

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Split PDF: Extract selected page ranges (e.g., "1-3, 5")
 */
export async function splitPDF(file: File, rangeText: string): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = srcDoc.getPageCount();

  const selectedPageIndices = parsePageRanges(rangeText, totalPages);
  if (selectedPageIndices.length === 0) {
    throw new Error('Rentang halaman tidak valid atau di luar jangkauan dokumen');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, selectedPageIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return await newDoc.save();
}

/**
 * Rotate pages in a PDF file
 */
export async function rotatePDF(file: File, angle: 90 | 180 | 270): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + angle) % 360));
  }

  return await pdfDoc.save();
}

/**
 * Add watermark text across all pages in a PDF file
 */
export async function addWatermark(
  file: File,
  watermarkText: string,
  opacity: number = 0.25,
  fontSize: number = 42
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    page.drawText(watermarkText, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - textHeight / 2,
      size: fontSize,
      font: font,
      color: rgb(0.38, 0.4, 0.94), // Indigo hue
      opacity: opacity,
      rotate: degrees(45),
    });
  }

  return await pdfDoc.save();
}

/**
 * Convert images (JPG / PNG) into a single PDF document
 */
export async function imagesToPDF(files: File[]): Promise<Uint8Array> {
  if (files.length === 0) throw new Error('Pilih minimal satu gambar');

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    let image;
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

    try {
      if (isPng) {
        image = await pdfDoc.embedPng(arrayBuffer);
      } else {
        image = await pdfDoc.embedJpg(arrayBuffer);
      }
    } catch {
      // Fallback attempt
      try {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } catch {
        image = await pdfDoc.embedPng(arrayBuffer);
      }
    }

    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return await pdfDoc.save();
}

/**
 * Helper to parse page range strings (e.g., "1-3, 5, 8-10") into 0-indexed numbers
 */
function parsePageRanges(rangeText: string, totalPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeText.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(totalPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

export interface SignaturePlacement {
  pageIndex: number; // 0-based
  xRatio: number; // 0 to 1 relative to page width (from left)
  yRatio: number; // 0 to 1 relative to page height (from top)
  widthRatio: number; // 0 to 1 relative to page width
  heightRatio: number; // 0 to 1 relative to page height
}

/**
 * Embed a signature PNG onto a specific page of a PDF file
 */
export async function signPDF(
  file: File,
  signaturePngDataUrl: string,
  placement: SignaturePlacement
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Extract PNG binary from Data URL
  const base64Data = signaturePngDataUrl.split(',')[1];
  const binaryString = atob(base64Data);
  const pngBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pngBytes[i] = binaryString.charCodeAt(i);
  }

  const embeddedImage = await pdfDoc.embedPng(pngBytes);
  const pages = pdfDoc.getPages();
  const pageIndex = Math.min(Math.max(0, placement.pageIndex), pages.length - 1);
  const targetPage = pages[pageIndex];

  const { width: pageWidth, height: pageHeight } = targetPage.getSize();
  const drawWidth = pageWidth * placement.widthRatio;
  const drawHeight = pageHeight * placement.heightRatio;
  const drawX = pageWidth * placement.xRatio;
  // In pdf-lib, y=0 is at bottom-left corner
  const drawY = pageHeight - (pageHeight * placement.yRatio) - drawHeight;

  targetPage.drawImage(embeddedImage, {
    x: Math.max(0, drawX),
    y: Math.max(0, drawY),
    width: drawWidth,
    height: drawHeight,
  });

  return await pdfDoc.save();
}
