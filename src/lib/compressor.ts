import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface CompressionResult {
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
  targetKBLimit: number;
  meetsRequirement: boolean;
  reductionPercentage: number;
}

export interface PresetInfo {
  id: 'cpns' | 'bumn' | 'lpse' | 'custom';
  label: string;
  sublabel: string;
  targetKB: number;
  description: string;
  badge: string;
}

export const INDONESIA_PRESETS: PresetInfo[] = [
  {
    id: 'cpns',
    label: 'BKN / CPNS & PPPK',
    sublabel: 'Maks. 500 KB',
    targetKB: 480, // slightly under 500 KB for safety
    description: 'Syarat mutlak portal SSCASN BKN untuk scan KTP, Ijazah, & Surat Lamaran.',
    badge: 'Paling Banyak Dicari',
  },
  {
    id: 'bumn',
    label: 'Rekrutmen Bersama BUMN',
    sublabel: 'Maks. 1.000 KB (1 MB)',
    targetKB: 950, // safe buffer
    description: 'Standar batas unggah berkas portofolio & CV pada portal rekrutmen BUMN.',
    badge: 'Resmi BUMN',
  },
  {
    id: 'lpse',
    label: 'Dokumen Tender LPSE',
    sublabel: 'Maks. 2.000 KB (2 MB)',
    targetKB: 1900,
    description: 'Standar kelengkapan dokumen lelang & prakualifikasi pengadaan pemerintah.',
    badge: 'Pengadaan / LPSE',
  },
  {
    id: 'custom',
    label: 'Target Kustom',
    sublabel: 'Tentukan Sendiri',
    targetKB: 300,
    description: 'Masukkan angka batas ukuran KB yang kamu inginkan secara spesifik.',
    badge: 'Fleksibel',
  },
];

/**
 * Smart Target Compressor for Indonesian official portal requirements
 */
export async function smartCompressToTarget(
  file: File,
  targetKB: number,
  onProgress?: (progress: number, status: string) => void
): Promise<CompressionResult> {
  const targetBytes = targetKB * 1024;
  const originalSize = file.size;

  onProgress?.(10, 'Membaca struktur dokumen...');
  const arrayBuffer = await file.arrayBuffer();

  // Load with pdfjs
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  onProgress?.(25, `Mendeteksi ${numPages} halaman dokumen...`);

  // Target budget per page (with margin for PDF overhead)
  const availableImageBytes = targetBytes * 0.90;
  const bytesPerPage = availableImageBytes / numPages;

  // Adaptively estimate scale and quality based on bytes per page
  let scale = 1.3;
  let quality = 0.75;

  if (bytesPerPage < 80 * 1024) {
    // Under 80KB per page -> aggressive compression needed
    scale = 0.95;
    quality = 0.55;
  } else if (bytesPerPage < 160 * 1024) {
    // 80KB - 160KB per page -> medium compression
    scale = 1.15;
    quality = 0.68;
  } else if (bytesPerPage < 300 * 1024) {
    // 160KB - 300KB per page -> standard compression
    scale = 1.35;
    quality = 0.76;
  } else {
    // Generous budget -> high resolution
    scale = 1.5;
    quality = 0.84;
  }

  // Create new clean PDF document
  let outputDoc = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pageProgress = 30 + Math.round(((pageNum - 1) / numPages) * 50);
    onProgress?.(pageProgress, `Mengoptimasi halaman ${pageNum} dari ${numPages}...`);

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Render to canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Gagal menginisialisasi canvas pemrosesan.');

    // White background to avoid transparent artifacts
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      canvas: canvas,
      viewport: viewport,
    }).promise;

    // Convert canvas to compressed JPEG
    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
    const jpegBytes = dataUrlToUint8Array(jpegDataUrl);

    // Embed into output PDF
    const embeddedImage = await outputDoc.embedJpg(jpegBytes);
    const newPage = outputDoc.addPage([viewport.width / scale, viewport.height / scale]);

    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: viewport.width / scale,
      height: viewport.height / scale,
    });
  }

  onProgress?.(85, 'Menyusun berkas PDF akhir...');
  let compressedData = await outputDoc.save();

  // If still slightly over the target and quality can be reduced, do a quick secondary pass
  if (compressedData.length > targetBytes && quality > 0.45) {
    onProgress?.(90, 'Menyesuaikan agar pas di bawah batas target...');
    const refinedDoc = await PDFDocument.create();
    const refinedScale = Math.max(0.85, scale * 0.85);
    const refinedQuality = Math.max(0.42, quality * 0.75);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: refinedScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) break;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        canvas: canvas,
        viewport: viewport,
      }).promise;

      const jpegDataUrl = canvas.toDataURL('image/jpeg', refinedQuality);
      const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
      const embeddedImage = await refinedDoc.embedJpg(jpegBytes);
      const newPage = refinedDoc.addPage([viewport.width / refinedScale, viewport.height / refinedScale]);

      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: viewport.width / refinedScale,
        height: viewport.height / refinedScale,
      });
    }

    compressedData = await refinedDoc.save();
  }

  onProgress?.(100, 'Selesai! Dokumen memenuhi kualifikasi.');

  const compressedSize = compressedData.length;
  const reductionPercentage = Math.max(
    0,
    Math.round(((originalSize - compressedSize) / originalSize) * 100)
  );

  return {
    data: compressedData,
    originalSize,
    compressedSize,
    targetKBLimit: targetKB,
    meetsRequirement: compressedSize <= targetBytes,
    reductionPercentage,
  };
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
