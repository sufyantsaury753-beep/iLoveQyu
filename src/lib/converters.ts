import * as pdfjsLib from 'pdfjs-dist';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface TextItemType {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, tx, ty]
  fontName: string;
  hasEOL: boolean;
}

/**
 * Convert PDF document to Microsoft Word (.docx)
 * Privacy-first: 100% Client-side in browser memory
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
    const items = textContent.items as unknown as TextItemType[];

    // If not first page, add a page break indicator or title
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
              text: `[Halaman ${pageNum} (Tidak ada teks terbaca / Berupa gambar scan)]`,
              italics: true,
              color: '888888',
            }),
          ],
        })
      );
      continue;
    }

    // Group items into lines based on vertical position (Y coordinate: transform[5])
    interface LineGroup {
      y: number;
      items: TextItemType[];
    }

    const lines: LineGroup[] = [];
    // Sort items vertically top-to-bottom (higher Y in PDF is top of page), then left-to-right (tx: transform[4])
    const sortedItems = [...items].sort((a, b) => {
      const yA = a.transform ? a.transform[5] : 0;
      const yB = b.transform ? b.transform[5] : 0;
      // If Y difference is small (within 4 points), consider them same line
      if (Math.abs(yA - yB) < 4) {
        const xA = a.transform ? a.transform[4] : 0;
        const xB = b.transform ? b.transform[4] : 0;
        return xA - xB;
      }
      return yB - yA; // top to bottom
    });

    for (const item of sortedItems) {
      if (!item.str || item.str.trim() === '') continue;
      const y = item.transform ? item.transform[5] : 0;
      let matchedLine = lines.find((l) => Math.abs(l.y - y) < 4);

      if (!matchedLine) {
        matchedLine = { y, items: [] };
        lines.push(matchedLine);
      }
      matchedLine.items.push(item);
    }

    // Sort lines from top to bottom
    lines.sort((a, b) => b.y - a.y);

    for (const line of lines) {
      // Sort items in line from left to right
      line.items.sort((a, b) => {
        const xA = a.transform ? a.transform[4] : 0;
        const xB = b.transform ? b.transform[4] : 0;
        return xA - xB;
      });

      const lineText = line.items.map((i) => i.str).join(' ').trim();
      if (!lineText) continue;

      // Detect approximate font height
      const avgHeight =
        line.items.reduce((acc, curr) => acc + (curr.height || 12), 0) /
        line.items.length;

      // Determine heading level or regular paragraph
      if (avgHeight >= 18) {
        docParagraphs.push(
          new Paragraph({
            text: lineText,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200, before: 100 },
          })
        );
      } else if (avgHeight >= 15) {
        docParagraphs.push(
          new Paragraph({
            text: lineText,
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 150, before: 80 },
          })
        );
      } else {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: lineText,
                size: Math.max(18, Math.round(avgHeight * 2)), // docx font size is in half-points (24 = 12pt)
                font: 'Calibri',
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs.length > 0 ? docParagraphs : [
          new Paragraph({ text: 'Dokumen kosong atau tidak memiliki teks.' }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Convert Word (.docx) document to PDF
 * Privacy-first: 100% Client-side in browser memory
 */
export async function convertWordToPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();

  // 1. Extract HTML using mammoth in browser
  const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
  let htmlContent = mammothResult.value;

  if (!htmlContent || htmlContent.trim() === '') {
    // Fallback to raw text extraction if HTML is empty
    const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
    const rawText = rawTextResult.value;
    htmlContent = rawText
      ? rawText.split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('')
      : '<p>Dokumen tidak memiliki konten teks.</p>';
  }

  // 2. Prepare container with standard document styling
  const container = document.createElement('div');
  container.id = 'word-to-pdf-temp-container';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '700px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1e293b';
  container.style.fontFamily = 'Arial, Helvetica, sans-serif';
  container.style.fontSize = '14px';
  container.style.lineHeight = '1.6';
  container.style.padding = '40px';
  container.style.boxSizing = 'border-box';

  // Inject beautiful document typography styles
  container.innerHTML = `
    <style>
      #word-to-pdf-temp-container h1 { font-size: 24px; font-weight: bold; margin-bottom: 16px; margin-top: 24px; color: #0f172a; }
      #word-to-pdf-temp-container h2 { font-size: 20px; font-weight: bold; margin-bottom: 14px; margin-top: 20px; color: #1e293b; }
      #word-to-pdf-temp-container h3 { font-size: 16px; font-weight: bold; margin-bottom: 12px; margin-top: 16px; color: #334155; }
      #word-to-pdf-temp-container p { margin-bottom: 12px; }
      #word-to-pdf-temp-container ul, #word-to-pdf-temp-container ol { margin-left: 24px; margin-bottom: 12px; }
      #word-to-pdf-temp-container li { margin-bottom: 6px; }
      #word-to-pdf-temp-container table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
      #word-to-pdf-temp-container th, #word-to-pdf-temp-container td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
      #word-to-pdf-temp-container th { background-color: #f1f5f9; font-weight: 600; }
      #word-to-pdf-temp-container img { max-width: 100%; height: auto; margin: 12px 0; }
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
      margin: [40, 40, 40, 40],
      autoPaging: 'text',
      width: 515, // A4 width 595.28 - 80pt margins
      windowWidth: 700,
    });

    const pdfOutput = doc.output('arraybuffer');
    return new Uint8Array(pdfOutput);
  } finally {
    document.body.removeChild(container);
  }
}
