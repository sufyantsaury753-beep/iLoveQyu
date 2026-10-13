import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  signPDF,
  downloadBlob,
  type SignaturePlacement,
} from '../lib/pdf';
import confetti from 'canvas-confetti';
import {
  PenTool,
  Upload,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Move,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Sliders,
  FileCheck,
} from 'lucide-react';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface PdfSignerProps {
  file: File;
  onCancel: () => void;
}

type TabMode = 'draw' | 'upload';
type InkColor = '#0f172a' | '#1e40af'; // Hitam Formal & Biru Dinas

export const PdfSigner: React.FC<PdfSignerProps> = ({ file, onCancel }) => {
  // Tabs & Signature Creation
  const [tabMode, setTabMode] = useState<TabMode>('draw');
  const [inkColor, setInkColor] = useState<InkColor>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [sigAspectRatio, setSigAspectRatio] = useState<number>(2.5); // width / height
  const [removeBg, setRemoveBg] = useState(true);

  // PDF Preview State
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Placement & Scaling State (in relative percentages 0..100)
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 850,
  });
  // Position of signature box center or top-left in pixels
  const [sigPos, setSigPos] = useState<{ x: number; y: number }>({ x: 340, y: 640 });
  const [sigScale, setSigScale] = useState<number>(1); // 0.6 to 2.0

  // Dragging State
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  // Processing & Download State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Refs
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);

  // -------------------------------------------------------------
  // 1. Load PDF Document on Mount
  // -------------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;

    const loadPdf = async () => {
      try {
        setIsPdfLoading(true);
        setRenderError(null);
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const doc = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDocProxy(doc);
          setTotalPages(doc.numPages);
          // Default to last page if multiple pages (surat lamaran / pernyataan always signed at last page)
          setCurrentPage(doc.numPages);
        }
      } catch (err) {
        console.error('Error loading PDF for signing:', err);
        if (!isCancelled) {
          setRenderError('Gagal memuat dokumen PDF. Pastikan file tidak rusak atau terenkripsi.');
        }
      } finally {
        if (!isCancelled) setIsPdfLoading(false);
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // -------------------------------------------------------------
  // 2. Render PDF Page onto Canvas
  // -------------------------------------------------------------
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDocProxy || !pdfCanvasRef.current || !previewContainerRef.current) return;

    try {
      const page = await pdfDocProxy.getPage(currentPage);
      const containerWidth = Math.min(
        previewContainerRef.current.parentElement?.clientWidth || 600,
        640
      );

      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = Math.max(0.4, (containerWidth - 24) / unscaledViewport.width);
      const viewport = page.getViewport({ scale });

      const canvas = pdfCanvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clean white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        canvas: canvas,
        viewport: viewport,
      }).promise;

      setPreviewSize({
        width: Math.floor(viewport.width),
        height: Math.floor(viewport.height),
      });

      // Default position: Bottom-Right ("Hormat Saya" area)
      setSigPos({
        x: Math.round(viewport.width * 0.60),
        y: Math.round(viewport.height * 0.76),
      });
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [pdfDocProxy, currentPage]);

  useEffect(() => {
    if (pdfDocProxy) {
      renderCurrentPage();
    }
  }, [pdfDocProxy, currentPage, renderCurrentPage]);

  // Re-render on window resize
  useEffect(() => {
    const handleResize = () => {
      if (pdfDocProxy) renderCurrentPage();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDocProxy, renderCurrentPage]);

  // -------------------------------------------------------------
  // 3. Drawing Pad Canvas Handlers (Smooth Pointer Events)
  // -------------------------------------------------------------
  const clearDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if already released
    }

    // Save trimmed signature data URL
    saveCanvasAsTrimmedPng();
  };

  const saveCanvasAsTrimmedPng = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    // Check if canvas has any drawn pixels
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 10) {
          hasPixels = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasPixels) {
      setSignatureDataUrl(null);
      return;
    }

    // Add slight padding around signature
    const padding = 8;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    const cropW = Math.max(1, maxX - minX);
    const cropH = Math.max(1, maxY - minY);

    // Render to cropped canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return;

    croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    const dataUrl = croppedCanvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setSigAspectRatio(cropW / cropH);
  };

  // -------------------------------------------------------------
  // 4. Upload Image & Background Remover Handlers
  // -------------------------------------------------------------
  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        processUploadedImage(img, removeBg);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processUploadedImage = (img: HTMLImageElement, shouldRemoveBg: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);

    if (shouldRemoveBg) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Smart transparency for paper scans
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

        if (brightness > 200) {
          // White/light grey paper -> fully transparent
          data[i + 3] = 0;
        } else if (brightness > 150) {
          // Anti-aliased transition edge
          const alphaRatio = (200 - brightness) / 50;
          data[i + 3] = Math.round(alphaRatio * 255);
        } else {
          // Ink stroke: make contrast sharp & dark
          data[i + 3] = 255;
          if (inkColor === '#1e40af') {
            data[i] = 30;
            data[i + 1] = 64;
            data[i + 2] = 175;
          } else {
            data[i] = 15;
            data[i + 1] = 23;
            data[i + 2] = 42;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setSigAspectRatio(img.width / img.height);
  };

  // -------------------------------------------------------------
  // 5. Drag & Drop Signature Overlay on PDF Preview
  // -------------------------------------------------------------
  // Calculate display width & height of signature box
  const baseBoxWidth = Math.max(90, Math.round(previewSize.width * 0.26));
  const baseBoxHeight = Math.max(35, Math.round(baseBoxWidth / (sigAspectRatio || 2.5)));

  const displaySigWidth = Math.round(baseBoxWidth * sigScale);
  const displaySigHeight = Math.round(baseBoxHeight * sigScale);

  const handlePointerDownSig = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingSig(true);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: sigPos.x,
      initialY: sigPos.y,
    };
  };

  const handlePointerMoveSig = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSig) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const newX = Math.max(
      0,
      Math.min(previewSize.width - displaySigWidth, dragStartRef.current.initialX + deltaX)
    );
    const newY = Math.max(
      0,
      Math.min(previewSize.height - displaySigHeight, dragStartRef.current.initialY + deltaY)
    );

    setSigPos({ x: newX, y: newY });
  };

  const handlePointerUpSig = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSig) return;
    setIsDraggingSig(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Quick Preset Alignments
  const alignBottomRight = () => {
    setSigPos({
      x: Math.round(previewSize.width * 0.60),
      y: Math.round(previewSize.height * 0.77),
    });
  };

  const alignBottomLeft = () => {
    setSigPos({
      x: Math.round(previewSize.width * 0.08),
      y: Math.round(previewSize.height * 0.77),
    });
  };

  const alignBottomCenter = () => {
    setSigPos({
      x: Math.round((previewSize.width - displaySigWidth) / 2),
      y: Math.round(previewSize.height * 0.77),
    });
  };

  // -------------------------------------------------------------
  // 6. Final PDF Signing & Download Execution
  // -------------------------------------------------------------
  const handleApplySignature = async () => {
    if (!signatureDataUrl) {
      alert('Harap buat atau unggah tanda tangan terlebih dahulu.');
      return;
    }

    try {
      setIsProcessing(true);

      const placement: SignaturePlacement = {
        pageIndex: currentPage - 1, // 0-based index
        xRatio: sigPos.x / previewSize.width,
        yRatio: sigPos.y / previewSize.height,
        widthRatio: displaySigWidth / previewSize.width,
        heightRatio: displaySigHeight / previewSize.height,
      };

      const signedBytes = await signPDF(file, signatureDataUrl, placement);
      const outputName = `bertandatangan_${file.name}`;

      downloadBlob(signedBytes, outputName);
      setIsSuccess(true);

      confetti({
        particleCount: 90,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#6366F1', '#10B981', '#F59E0B'],
      });
    } catch (err) {
      console.error('Gagal menerapkan tanda tangan:', err);
      alert('Terjadi kesalahan saat menerapkan tanda tangan ke dokumen.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Step 1: Signature Creation Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
              <PenTool className="w-3.5 h-3.5" />
              Langkah 1: Buat Tanda Tangan
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Pilih Metode Tanda Tangan Digital
            </h3>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTabMode('draw')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                tabMode === 'draw'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✍️ Gambar di Layar
            </button>
            <button
              type="button"
              onClick={() => setTabMode('upload')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                tabMode === 'upload'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📤 Unggah Foto/Scan
            </button>
          </div>
        </div>

        {/* Tab 1: Draw on Canvas */}
        {tabMode === 'draw' && (
          <div className="mt-5 space-y-4">
            {/* Ink & Pen Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Warna Tinta:</span>
                <button
                  type="button"
                  onClick={() => {
                    setInkColor('#0f172a');
                    if (signatureDataUrl) clearDrawCanvas();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    inkColor === '#0f172a'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white" />
                  Hitam Resmi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInkColor('#1e40af');
                    if (signatureDataUrl) clearDrawCanvas();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    inkColor === '#1e40af'
                      ? 'border-blue-700 bg-blue-700 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white" />
                  Biru Dinas
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Ketebalan:</span>
                {[
                  { label: 'Tipis', width: 2 },
                  { label: 'Sedang', width: 3.5 },
                  { label: 'Tebal', width: 5 },
                ].map((s) => (
                  <button
                    key={s.width}
                    type="button"
                    onClick={() => setStrokeWidth(s.width)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                      strokeWidth === s.width
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Box */}
            <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl bg-slate-50/50 p-2 overflow-hidden transition-colors">
              <canvas
                ref={drawCanvasRef}
                width={700}
                height={200}
                onPointerDown={startDrawing}
                onPointerMove={drawMove}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                className="w-full h-44 sm:h-52 bg-white rounded-xl touch-none cursor-crosshair shadow-2xs"
              />

              {!signatureDataUrl && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-center px-4">
                  <PenTool className="w-8 h-8 mb-2 stroke-[1.5] text-slate-300" />
                  <p className="text-xs sm:text-sm font-medium text-slate-500">
                    Coretkan tanda tangan Anda di sini (layar sentuh HP atau mouse)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Garis tanda tangan akan otomatis disesuaikan secara transparan
                  </p>
                </div>
              )}
            </div>

            {/* Clear Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={clearDrawCanvas}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Hapus & Ulangi</span>
              </button>

              {signatureDataUrl && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  Tanda tangan siap diposisikan
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Upload Signature Photo */}
        {tabMode === 'upload' && (
          <div className="mt-5 space-y-4">
            <div className="p-6 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl bg-slate-50/50 text-center transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-800">
                Unggah Foto Tanda Tangan Anda (PNG / JPG)
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Tulis tanda tangan di selembar kertas putih, lalu foto dengan kamera HP.
              </p>

              <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer shadow-xs transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Foto dari Galeri / Berkas</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleUploadSignature}
                  className="hidden"
                />
              </label>
            </div>

            {/* Smart Paper Background Remover Toggle */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <label className="flex items-center gap-2 font-bold text-indigo-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeBg}
                    onChange={(e) => setRemoveBg(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Hapus Latar Belakang Kertas Otomatis (Transparan)</span>
                </label>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Menghilangkan warna kertas putih/abu-abu sehingga tanda tangan menjadi stempel transparan rapi dan tidak menutupi teks dokumen.
                </p>
              </div>
            </div>

            {signatureDataUrl && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Foto berhasil diproses & transparan!</span>
                </div>
                <img
                  src={signatureDataUrl}
                  alt="Signature Preview"
                  className="h-9 max-w-[120px] object-contain bg-white rounded border border-emerald-200 p-1"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: PDF Page Navigation & Drag-and-Drop Placement */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
              <Move className="w-3.5 h-3.5" />
              Langkah 2: Posisikan Tanda Tangan
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Geser Tanda Tangan ke Lokasi yang Tepat
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik dan seret kotak tanda tangan di atas pratinjau dokumen ke atas garis nama Anda.
            </p>
          </div>

          {/* Page Navigator */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-xl bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-700 px-2">
                Halaman {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-xl bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Quick Jump to Last Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                className={`ml-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  currentPage === totalPages
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:text-indigo-600'
                }`}
              >
                Halaman Akhir
              </button>
            </div>
          )}
        </div>

        {/* Positioning Quick Actions & Scale Slider */}
        <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600">Posisi Standar:</span>
            <button
              type="button"
              onClick={alignBottomRight}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              📍 Pojok Kanan Bawah (Formal)
            </button>
            <button
              type="button"
              onClick={alignBottomCenter}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              📍 Tengah Bawah
            </button>
            <button
              type="button"
              onClick={alignBottomLeft}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              📍 Pojok Kiri Bawah
            </button>
          </div>

          {/* Size Slider */}
          <div className="flex items-center gap-3">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Ukuran: {Math.round(sigScale * 100)}%
            </span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={sigScale}
              onChange={(e) => setSigScale(parseFloat(e.target.value))}
              className="w-28 sm:w-36 accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Visual PDF Page Preview with Interactive Draggable Overlay */}
        <div className="flex justify-center bg-slate-100/80 p-4 sm:p-6 rounded-2xl border border-slate-200 overflow-x-auto">
          {isPdfLoading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                Memuat pratinjau dokumen PDF...
              </p>
            </div>
          ) : renderError ? (
            <div className="py-16 text-center text-rose-600 max-w-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-bold">{renderError}</p>
            </div>
          ) : (
            <div
              ref={previewContainerRef}
              className="relative shadow-md rounded-lg bg-white select-none overflow-hidden"
              style={{
                width: `${previewSize.width}px`,
                height: `${previewSize.height}px`,
              }}
            >
              {/* PDF Background Canvas */}
              <canvas
                ref={pdfCanvasRef}
                className="w-full h-full block"
              />

              {/* Draggable Signature Overlay Box */}
              {signatureDataUrl ? (
                <div
                  onPointerDown={handlePointerDownSig}
                  onPointerMove={handlePointerMoveSig}
                  onPointerUp={handlePointerUpSig}
                  className={`absolute touch-none cursor-move transition-shadow ${
                    isDraggingSig
                      ? 'ring-2 ring-indigo-600 shadow-xl opacity-90 scale-102'
                      : 'hover:ring-2 hover:ring-indigo-400 shadow-md'
                  }`}
                  style={{
                    left: `${sigPos.x}px`,
                    top: `${sigPos.y}px`,
                    width: `${displaySigWidth}px`,
                    height: `${displaySigHeight}px`,
                    border: '1.5px dashed #4F46E5',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    borderRadius: '6px',
                  }}
                  title="Geser posisi tanda tangan"
                >
                  <img
                    src={signatureDataUrl}
                    alt="Signature Stamp"
                    className="w-full h-full object-contain pointer-events-none select-none p-0.5"
                    draggable={false}
                  />

                  {/* Grip Handle Indicator */}
                  <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs text-[10px] pointer-events-none">
                    <Move className="w-3 h-3 stroke-[2.5]" />
                  </div>
                </div>
              ) : (
                <div className="absolute bottom-12 right-12 p-3 bg-amber-500/90 text-white rounded-xl text-xs font-semibold shadow-md backdrop-blur-xs flex items-center gap-2 pointer-events-none animate-pulse">
                  <PenTool className="w-4 h-4" />
                  <span>Buat tanda tangan di Langkah 1 untuk menempatkannya di sini</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {isSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold">
              Dokumen berhasil ditandatangani dan otomatis terunduh!
            </p>
            <p className="text-emerald-700">
              Format teks dan kerapian halaman tetap asli 100% tanpa watermark.
            </p>
          </div>
        </div>
      )}

      {/* Action Footer Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Ganti File Dokumen
        </button>

        <button
          type="button"
          onClick={handleApplySignature}
          disabled={!signatureDataUrl || isProcessing}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-98"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Membubuhkan Tanda Tangan...</span>
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" />
              <span>Terapkan Tanda Tangan & Unduh PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
