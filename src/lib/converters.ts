import * as pdfjsLib from 'pdfjs-dist';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
} from 'docx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

// Register html2canvas-pro globally for jsPDF (supports modern CSS and oklch)
if (typeof window !== 'undefined') {
  (window as unknown as { html2canvas: typeof html2canvas }).html2canvas = html2canvas;
}

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface RawTextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, tx, ty]
  fontName: string;
  hasEOL: boolean;
}

interface ProcessedChunk {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
}

interface ProcessedLine {
  y: number;
  minX: number;
  maxX: number;
  text: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  chunks: ProcessedChunk[];
}

/**
 * Smart PDF to Word (.docx) Converter
 * Accurately extracts font sizes, bold/italic styles, headings, list points, and paragraph flows.
 */
export async function convertPdfToWord(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const docParagraphs: Paragraph[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as unknown as RawTextItem[];

    // Page break between pages
    if (pageNum > 1) {
      docParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '', break: 1 })],
          pageBreakBefore: true,
        })
      );
    }

    if (items.length === 0) {
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[Halaman ${pageNum}: Berisi gambar scan atau dokumen kosong]`,
              italics: true,
              color: '888888',
            }),
          ],
        })
      );
      continue;
    }

    // 1. Extract chunks with true font scales and bold/italic styles
    const chunks: ProcessedChunk[] = [];
    for (const item of items) {
      if (!item.str || item.str.trim() === '') continue;

      const transform = item.transform || [12, 0, 0, 12, 0, 0];
      // True font size from transformation matrix
      const scaleX = transform[0];
      const scaleY = transform[1];
      const trueFontSize = Math.round(Math.hypot(scaleX, scaleY)) || 11;

      const fontLower = (item.fontName || '').toLowerCase();
      const isBold =
        fontLower.includes('bold') ||
        fontLower.includes('black') ||
        fontLower.includes('heavy') ||
        fontLower.includes('semibold') ||
        fontLower.includes('medium') ||
        fontLower.includes('b+');
      const isItalic =
        fontLower.includes('italic') ||
        fontLower.includes('oblique') ||
        fontLower.includes('slanted');

      chunks.push({
        text: item.str,
        x: transform[4],
        y: transform[5],
        width: item.width || item.str.length * trueFontSize * 0.5,
        fontSize: trueFontSize,
        isBold,
        isItalic,
      });
    }

    if (chunks.length === 0) continue;

    // 2. Group chunks into visual lines based on vertical proximity (Y coordinate)
    // In PDF coordinates, top of page has highest Y
    chunks.sort((a, b) => b.y - a.y || a.x - b.x);

    const lines: ProcessedLine[] = [];
    for (const chunk of chunks) {
      let matchedLine = lines.find((l) => Math.abs(l.y - chunk.y) <= 3.5);
      if (!matchedLine) {
        matchedLine = {
          y: chunk.y,
          minX: chunk.x,
          maxX: chunk.x + chunk.width,
          text: '',
          fontSize: chunk.fontSize,
          isBold: chunk.isBold,
          isItalic: chunk.isItalic,
          chunks: [],
        };
        lines.push(matchedLine);
      }
      matchedLine.chunks.push(chunk);
      matchedLine.minX = Math.min(matchedLine.minX, chunk.x);
      matchedLine.maxX = Math.max(matchedLine.maxX, chunk.x + chunk.width);
    }

    // Sort lines from top to bottom
    lines.sort((a, b) => b.y - a.y);

    // 3. Assemble full text and dominant attributes for each line
    for (const line of lines) {
      line.chunks.sort((a, b) => a.x - b.x);

      let assembledText = '';
      let totalChars = 0;
      let boldChars = 0;
      let italicChars = 0;
      let weightedSize = 0;

      for (let i = 0; i < line.chunks.length; i++) {
        const c = line.chunks[i];
        if (i > 0) {
          const prev = line.chunks[i - 1];
          // If distance between chunks > 2pt, insert a space
          if (c.x - (prev.x + prev.width) > 2) {
            assembledText += ' ';
          }
        }
        assembledText += c.text;
        const len = c.text.length;
        totalChars += len;
        if (c.isBold) boldChars += len;
        if (c.isItalic) italicChars += len;
        weightedSize += c.fontSize * len;
      }

      line.text = assembledText.trim();
      line.fontSize = totalChars > 0 ? Math.round(weightedSize / totalChars) : 11;
      line.isBold = totalChars > 0 && boldChars / totalChars > 0.4;
      line.isItalic = totalChars > 0 && italicChars / totalChars > 0.4;
    }

    // Filter out blank lines
    const validLines = lines.filter((l) => l.text.length > 0);
    if (validLines.length === 0) continue;

    // Calculate baseline/dominant body font size for this page
    const sizeFrequencies = new Map<number, number>();
    for (const l of validLines) {
      sizeFrequencies.set(l.fontSize, (sizeFrequencies.get(l.fontSize) || 0) + l.text.length);
    }
    let bodyFontSize = 11;
    let maxFreq = 0;
    for (const [size, freq] of sizeFrequencies.entries()) {
      if (freq > maxFreq) {
        maxFreq = freq;
        bodyFontSize = size;
      }
    }

    // 4. Smart Paragraph Flow Reconstructor
    // Group consecutive lines into structured Paragraphs (Titles, Headings, Lists, or Body Paragraphs)
    interface BlockParagraph {
      type: 'title' | 'heading' | 'list' | 'body';
      runs: Array<{ text: string; bold: boolean; italic: boolean; size: number }>;
      alignment: (typeof AlignmentType)[keyof typeof AlignmentType];
      fontSize: number;
    }

    const blocks: BlockParagraph[] = [];
    let currentBlock: BlockParagraph | null = null;

    for (let i = 0; i < validLines.length; i++) {
      const line = validLines[i];
      const text = line.text;

      // Detect Section Keywords (e.g. "Abstrak", "Pendahuluan", "Bab I", "A. Latar Belakang")
      const isSubHeadingKeyword =
        /^(abstrak|abstract|pendahuluan|latar belakang|tinjauan|metode|hasil|pembahasan|kesimpulan|daftar pustaka|bab\s+[ivx0-9]+|[a-z0-9]\.\s+[a-z])/i.test(
          text
        );

      // Detect Bullet or Numbered List
      const listMatch = text.match(/^([•\-\*–—]|\d+[\.\)]|[a-zA-Z][\.\)])\s+(.*)/);

      // Classify line type
      const isTitle =
        line.fontSize >= bodyFontSize + 3 ||
        (pageNum === 1 && i <= 3 && line.fontSize > bodyFontSize && (line.isBold || text === text.toUpperCase()));
      const isHeading =
        !isTitle &&
        (isSubHeadingKeyword ||
          (line.fontSize >= bodyFontSize + 1 && line.isBold) ||
          (line.isBold && text.length < 80 && !text.endsWith('.')));
      const isList = Boolean(listMatch);

      if (isTitle) {
        // Flush previous block
        currentBlock = null;
        blocks.push({
          type: 'title',
          runs: [
            {
              text,
              bold: true,
              italic: line.isItalic,
              size: Math.max(14, line.fontSize),
            },
          ],
          alignment: AlignmentType.CENTER,
          fontSize: line.fontSize,
        });
      } else if (isHeading) {
        currentBlock = null;
        blocks.push({
          type: 'heading',
          runs: [
            {
              text,
              bold: true,
              italic: line.isItalic,
              size: Math.max(12, line.fontSize),
            },
          ],
          alignment: AlignmentType.LEFT,
          fontSize: line.fontSize,
        });
      } else if (isList && listMatch) {
        currentBlock = null;
        blocks.push({
          type: 'list',
          runs: [
            {
              text: listMatch[2],
              bold: line.isBold,
              italic: line.isItalic,
              size: line.fontSize,
            },
          ],
          alignment: AlignmentType.LEFT,
          fontSize: line.fontSize,
        });
      } else {
        // Regular body text line -> Merge with previous body block if part of same flowing paragraph
        const prevLine = i > 0 ? validLines[i - 1] : null;
        const lineSpacingGap = prevLine ? prevLine.y - line.y : 0;
        const isCloseLine = lineSpacingGap > 0 && lineSpacingGap <= line.fontSize * 1.85;

        if (currentBlock && currentBlock.type === 'body' && isCloseLine) {
          // Append to current flowing paragraph
          currentBlock.runs.push({
            text: ' ' + text,
            bold: line.isBold,
            italic: line.isItalic,
            size: line.fontSize,
          });
        } else {
          // Start a new body paragraph
          currentBlock = {
            type: 'body',
            runs: [
              {
                text,
                bold: line.isBold,
                italic: line.isItalic,
                size: line.fontSize,
              },
            ],
            alignment: AlignmentType.JUSTIFIED,
            fontSize: line.fontSize,
          };
          blocks.push(currentBlock);
        }
      }
    }

    // 5. Convert blocks to Word Document Paragraphs
    for (const b of blocks) {
      if (b.type === 'title') {
        docParagraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 140 },
            children: b.runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: true,
                  italics: r.italic,
                  size: Math.round(r.size * 2), // Word uses half-points (16pt = 32)
                  font: 'Calibri',
                  color: '0F172A',
                })
            ),
          })
        );
      } else if (b.type === 'heading') {
        docParagraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.LEFT,
            spacing: { before: 200, after: 100 },
            children: b.runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: true,
                  italics: r.italic,
                  size: Math.round(r.size * 2),
                  font: 'Calibri',
                  color: '1E293B',
                })
            ),
          })
        );
      } else if (b.type === 'list') {
        docParagraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 90, line: 276 },
            children: b.runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: r.bold,
                  italics: r.italic,
                  size: Math.round(r.size * 2),
                  font: 'Calibri',
                })
            ),
          })
        );
      } else {
        docParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 140, line: 276 }, // 1.15 line spacing, 7pt space after
            children: b.runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: r.bold,
                  italics: r.italic,
                  size: Math.max(22, Math.round(r.size * 2)),
                  font: 'Calibri',
                })
            ),
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch in twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children:
          docParagraphs.length > 0
            ? docParagraphs
            : [new Paragraph({ text: 'Dokumen kosong atau tidak memiliki teks.' })],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * High-Fidelity Word (.docx) to PDF Converter
 * Converts Word docs into standard multi-page A4 PDFs with full font & typography preservation.
 */
export async function convertWordToPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();

  // 1. Extract HTML using mammoth in browser
  const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
  let htmlContent = mammothResult.value;

  if (!htmlContent || htmlContent.trim() === '') {
    const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
    const rawText = rawTextResult.value;
    htmlContent = rawText
      ? rawText
          .split('\n')
          .filter(Boolean)
          .map((p) => `<p>${p}</p>`)
          .join('')
      : '<p>Dokumen tidak memiliki konten teks.</p>';
  }

  // 2. Prepare offscreen container with exact A4 width (794px at 96 DPI)
  // Must use opacity: 1 so html2canvas-pro renders opaque pixels (not blank transparent canvas)
  // Hidden from view using fixed negative z-index beneath page background
  const container = document.createElement('div');
  container.id = 'word-to-pdf-temp-container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.zIndex = '-9999';
  container.style.opacity = '1'; // CRITICAL: Opacity 1 ensures non-blank rendering!
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#111827';
  container.style.fontFamily = "'Segoe UI', Arial, Helvetica, sans-serif";
  container.style.fontSize = '14px';
  container.style.lineHeight = '1.65';
  container.style.padding = '44px 50px';
  container.style.boxSizing = 'border-box';
  container.style.overflow = 'visible';

  // Inject document styles with standard hex/rgb colors to avoid any oklch issues
  container.innerHTML = `
    <style>
      #word-to-pdf-temp-container { background-color: #ffffff !important; color: #111827 !important; }
      #word-to-pdf-temp-container h1 { font-size: 22px; font-weight: bold; margin-bottom: 14px; margin-top: 20px; color: #0f172a; line-height: 1.3; }
      #word-to-pdf-temp-container h2 { font-size: 18px; font-weight: bold; margin-bottom: 12px; margin-top: 18px; color: #1e293b; line-height: 1.35; }
      #word-to-pdf-temp-container h3 { font-size: 15px; font-weight: bold; margin-bottom: 10px; margin-top: 14px; color: #334155; line-height: 1.4; }
      #word-to-pdf-temp-container p { margin-top: 0; margin-bottom: 12px; text-align: justify; text-justify: inter-word; color: #111827; }
      #word-to-pdf-temp-container ul, #word-to-pdf-temp-container ol { margin-left: 24px; margin-bottom: 12px; color: #111827; }
      #word-to-pdf-temp-container li { margin-bottom: 4px; }
      #word-to-pdf-temp-container table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12.5px; page-break-inside: avoid; }
      #word-to-pdf-temp-container th, #word-to-pdf-temp-container td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
      #word-to-pdf-temp-container th { background-color: #f1f5f9; font-weight: 600; color: #0f172a; }
      #word-to-pdf-temp-container img { max-width: 100%; height: auto; margin: 12px 0; page-break-inside: avoid; }
      #word-to-pdf-temp-container blockquote { border-left: 4px solid #6366f1; padding-left: 12px; margin: 12px 0; color: #475569; font-style: italic; }
    </style>
    <div>${htmlContent}</div>
  `;

  document.body.appendChild(container);

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    await doc.html(container, {
      callback: () => {},
      margin: [36, 36, 36, 36], // 0.5 in margins
      autoPaging: 'text',
      width: 523, // 595.28 pt A4 width - 72pt margins
      windowWidth: 794,
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
      },
    });

    const pdfOutput = doc.output('arraybuffer');
    return new Uint8Array(pdfOutput);
  } finally {
    document.body.removeChild(container);
  }
}
