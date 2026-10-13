import React, { useState, useRef, useEffect } from 'react';
import type { PDFTool, UploadedFileItem } from '../types';
import {
  formatBytes,
  getPDFPageCount,
  mergePDFs,
  splitPDF,
  rotatePDF,
  addWatermark,
  imagesToPDF,
  downloadBlob,
  addPageNumbers,
  type PageNumberPosition,
  type PageNumberFormat,
} from '../lib/pdf';
import {
  INDONESIA_PRESETS,
  smartCompressToTarget,
  type CompressionResult,
} from '../lib/compressor';
import {
  checkDeviceQuota,
  type DeviceQuotaInfo,
} from '../lib/fingerprint';
import { PaywallModal } from './PaywallModal';
import { PdfSigner } from './PdfSigner';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Trash2,
  MoveUp,
  MoveDown,
  RotateCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Plus,
  Loader2,
  Lock,
  Building2,
  GraduationCap,
  Scale,
  Sliders,
  Check,
  TrendingDown,
  Hash,
} from 'lucide-react';

interface WorkspaceProps {
  tool: PDFTool;
  onBack: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ tool, onBack }) => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastDownloadedData, setLastDownloadedData] = useState<{
    data: Uint8Array;
    fileName: string;
  } | null>(null);

  // Device Fingerprint Quota State
  const [deviceQuota, setDeviceQuota] = useState<DeviceQuotaInfo | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{
    data: Uint8Array;
    fileName: string;
  } | null>(null);

  // Tool Specific Options
  const [splitRange, setSplitRange] = useState('1');
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkFontSize, setWatermarkFontSize] = useState(45);

  // Page Numbering Specific Options
  const [pageNumberPosition, setPageNumberPosition] = useState<PageNumberPosition>('bottom-right');
  const [pageNumberFormat, setPageNumberFormat] = useState<PageNumberFormat>('number');
  const [skipFirstPageCover, setSkipFirstPageCover] = useState(false);
  const [pageNumberStart, setPageNumberStart] = useState(1);
  const [pageNumberFontSize, setPageNumberFontSize] = useState(11);

  // CPNS / BUMN / LPSE Specific Options
  const [selectedPresetId, setSelectedPresetId] = useState<'cpns' | 'bumn' | 'lpse' | 'custom'>('cpns');
  const selectedPreset = INDONESIA_PRESETS.find((p) => p.id === selectedPresetId) || INDONESIA_PRESETS[0];
  const [customTargetKB, setCustomTargetKB] = useState(450);
  const [compressProgress, setCompressProgress] = useState(0);
  const [compressProgressText, setCompressProgressText] = useState('');
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageTool = tool.id === 'images-to-pdf';
  const accepts = isImageTool
    ? 'image/png, image/jpeg, image/jpg'
    : 'application/pdf';

  // Load Device Fingerprint & Quota on Mount
  useEffect(() => {
    checkDeviceQuota().then(setDeviceQuota);
  }, []);

  // File Upload Handlers
  const handleFilesSelected = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setErrorMessage(null);
    setLastDownloadedData(null);
    setCompressionResult(null);
    setPendingDownload(null);

    const newItems: UploadedFileItem[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      let pageCount = 1;

      if (!isImageTool && file.type === 'application/pdf') {
        pageCount = await getPDFPageCount(file);
      }

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        pageCount,
      });
    }

    if (
      tool.id === 'split' ||
      tool.id === 'rotate' ||
      tool.id === 'watermark' ||
      tool.id === 'cpns-compress'
    ) {
      // These process 1 document at a time
      setFiles([newItems[0]]);
      if (newItems[0]?.pageCount) {
        setSplitRange(`1-${newItems[0].pageCount}`);
      }
    } else {
      setFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setCompressionResult(null);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFiles.length) return prev;
      const temp = newFiles[index];
      newFiles[index] = newFiles[targetIndex];
      newFiles[targetIndex] = temp;
      return newFiles;
    });
  };

  // Execution Process
  const handleProcess = async () => {
    if (files.length === 0) {
      setErrorMessage('Pilih file terlebih dahulu sebelum memproses.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setCompressionResult(null);
    setStatusMessage('Memproses dokumen di browsermu...');

    try {
      let resultData: Uint8Array;
      let outputName = 'dokumen_iloveqyu.pdf';

      if (tool.id === 'cpns-compress') {
        const file = files[0].file;
        const targetKB =
          selectedPresetId === 'custom'
            ? customTargetKB
            : INDONESIA_PRESETS.find((p) => p.id === selectedPresetId)?.targetKB || 480;

        const result = await smartCompressToTarget(file, targetKB, (prog, text) => {
          setCompressProgress(prog);
          setCompressProgressText(text);
        });

        setCompressionResult(result);
        resultData = result.data;
        outputName = `${selectedPresetId}_${files[0].name}`;
      } else if (tool.id === 'merge') {
        resultData = await mergePDFs(files.map((f) => f.file));
        outputName = `merged_${Date.now()}.pdf`;
      } else if (tool.id === 'split' || tool.id === 'page-extractor') {
        const file = files[0].file;
        resultData = await splitPDF(file, splitRange);
        outputName = `split_${files[0].name}`;
      } else if (tool.id === 'rotate') {
        const file = files[0].file;
        resultData = await rotatePDF(file, rotateAngle);
        outputName = `rotated_${files[0].name}`;
      } else if (tool.id === 'watermark') {
        const file = files[0].file;
        resultData = await addWatermark(file, watermarkText, watermarkOpacity, watermarkFontSize);
        outputName = `watermarked_${files[0].name}`;
      } else if (tool.id === 'page-number') {
        const file = files[0].file;
        resultData = await addPageNumbers(file, {
          position: pageNumberPosition,
          format: pageNumberFormat,
          skipFirstPage: skipFirstPageCover,
          startNumber: pageNumberStart,
          fontSize: pageNumberFontSize,
        });
        outputName = `bernomor_${files[0].name}`;
      } else if (tool.id === 'images-to-pdf') {
        resultData = await imagesToPDF(files.map((f) => f.file));
        outputName = `images_${Date.now()}.pdf`;
      } else {
        throw new Error('Fitur belum diimplementasikan');
      }

      // All current tools are 100% free for public benefit
      downloadBlob(resultData, outputName);
      setLastDownloadedData({ data: resultData, fileName: outputName });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'],
      });

      setStatusMessage(
        tool.id === 'cpns-compress'
          ? 'Selesai! Berkas berhasil dioptimasi sesuai standar resmi dan otomatis terunduh.'
          : tool.id === 'page-number'
          ? 'Selesai! Nomor halaman berhasil dibubuhkan dan dokumen otomatis terunduh.'
          : 'Selesai! Dokumen berhasil diproses dan otomatis terunduh.'
      );
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses PDF.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaywallUnlocked = async () => {
    setIsPaywallOpen(false);
    const updated = await checkDeviceQuota();
    setDeviceQuota(updated);

    if (pendingDownload) {
      downloadBlob(pendingDownload.data, pendingDownload.fileName);
      setLastDownloadedData(pendingDownload);
      setPendingDownload(null);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'],
      });

      setStatusMessage('Pembayaran terkonfirmasi! Dokumen berhasil diunduh.');
    }
  };

  const handleDownloadAgain = () => {
    if (!lastDownloadedData) return;
    downloadBlob(lastDownloadedData.data, lastDownloadedData.fileName);
  };

  const getPresetIcon = (id: string, isSelected: boolean = false) => {
    const iconClass = isSelected ? 'w-6 h-6 text-white' : 'w-5 h-5 text-indigo-600';
    switch (id) {
      case 'cpns':
        return <GraduationCap className={iconClass} />;
      case 'bumn':
        return <Building2 className={isSelected ? 'w-6 h-6 text-white' : 'w-5 h-5 text-violet-600'} />;
      case 'lpse':
        return <Scale className={isSelected ? 'w-6 h-6 text-white' : 'w-5 h-5 text-amber-600'} />;
      default:
        return <Sliders className={isSelected ? 'w-6 h-6 text-white' : 'w-5 h-5 text-slate-600'} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUnlockedSuccess={handlePaywallUnlocked}
        deviceId={deviceQuota?.deviceId || 'dev_syncing'}
      />

      {/* Back Button & Tool Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/80">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Semua Alat</span>
        </button>

        <div className="flex items-center gap-3">
          {tool.id === 'cpns-compress' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Check className="w-3.5 h-3.5" />
                100% Gratis Selamanya
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Memori Lokal • Zero Cloud Storage</span>
          </div>
        </div>
      </div>

      {/* Active Tool Intro Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-200/80 shadow-xs mb-6 sm:mb-8">
        <div>
          {/* Badge & Category Header */}
          {tool.badge && (
            <div className="mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 whitespace-nowrap shadow-2xs">
                {tool.badge}
              </span>
            </div>
          )}

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug mb-2">
            {tool.title}
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            {tool.description}
          </p>

          {/* Status Gratis Resmi */}
          {tool.id === 'cpns-compress' && (
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] sm:text-xs text-emerald-700 font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>100% Gratis & Tanpa Batas • Format Resmi BKN, BUMN & LPSE</span>
            </div>
          )}
        </div>
      </div>

      {/* If tool is 'sign' and file is selected, render dedicated interactive PdfSigner */}
      {tool.id === 'sign' && files.length > 0 ? (
        <PdfSigner
          file={files[0].file}
          onCancel={() => {
            setFiles([]);
            setLastDownloadedData(null);
            setStatusMessage(null);
          }}
        />
      ) : (
        <>
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-indigo-500 bg-white hover:bg-slate-50/50'
            } shadow-xs mb-8`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accepts}
              multiple={tool.id === 'merge' || tool.id === 'images-to-pdf'}
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Pilih file {isImageTool ? 'gambar (JPG, PNG)' : 'PDF'} atau tarik ke sini
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {tool.id === 'cpns-compress'
                ? 'Pilih scan KTP, Ijazah, Transkrip, atau Surat Lamaran Anda.'
                : tool.id === 'sign'
                ? 'Pilih surat lamaran, surat pernyataan, atau formulir PDF yang ingin Anda tanda tangani.'
                : tool.id === 'page-number'
                ? 'Pilih berkas PDF skripsi, makalah, atau laporan yang ingin diberi nomor halaman.'
                : tool.id === 'merge' || tool.id === 'images-to-pdf'
                ? 'Dapat memilih beberapa file sekaligus untuk digabungkan.'
                : 'Pilih file dokumen untuk diproses secara instan.'}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>Jelajahi Berkas</span>
            </div>
          </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs mb-8">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              File Dipilih ({files.length})
            </h4>
            {(tool.id === 'merge' || tool.id === 'images-to-pdf') && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah File Lain
              </button>
            )}
          </div>

          <div className="space-y-3">
            {files.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700">
                        {formatBytes(item.size)}
                      </span>
                      {item.pageCount && !isImageTool ? (
                        <>
                          <span>•</span>
                          <span>{item.pageCount} Halaman</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-4">
                  {tool.id === 'merge' && files.length > 1 && (
                    <>
                      <button
                        disabled={idx === 0}
                        onClick={() => moveFile(idx, 'up')}
                        title="Geser ke atas"
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        disabled={idx === files.length - 1}
                        onClick={() => moveFile(idx, 'down')}
                        title="Geser ke bawah"
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => removeFile(item.id)}
                    title="Hapus file"
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool-specific Settings Panel */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs mb-8">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Pengaturan Tindakan
          </h4>

          {/* CPNS / BUMN / LPSE Smart Presets */}
          {tool.id === 'cpns-compress' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
                  Pilih Standar Verifikasi Portal Resmi
                </label>

                {/* Mobile View: Circular Icon Buttons (Native Mobile App Aesthetic) */}
                <div className="sm:hidden mb-2">
                  <div className="grid grid-cols-4 gap-2">
                    {INDONESIA_PRESETS.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      const shortNames: Record<string, string> = {
                        cpns: 'BKN/CPNS',
                        bumn: 'BUMN',
                        lpse: 'LPSE',
                        custom: 'Kustom',
                      };
                      const shortSizes: Record<string, string> = {
                        cpns: '500 KB',
                        bumn: '1 MB',
                        lpse: '2 MB',
                        custom: 'Bebas',
                      };

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPresetId(preset.id)}
                          className="flex flex-col items-center group cursor-pointer focus:outline-none"
                        >
                          {/* Circular Button */}
                          <div
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 relative ${
                              isSelected
                                ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 ring-4 ring-indigo-100 scale-105'
                                : 'bg-gradient-to-tr from-slate-50 to-indigo-50/50 text-indigo-600 border border-slate-200/90 hover:border-indigo-300'
                            }`}
                          >
                            {getPresetIcon(preset.id, isSelected)}
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-xs border border-indigo-200">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>

                          {/* Label Underneath */}
                          <span
                            className={`mt-2 text-[11px] font-bold text-center leading-tight truncate w-full px-0.5 ${
                              isSelected ? 'text-indigo-600 font-extrabold' : 'text-slate-800'
                            }`}
                          >
                            {shortNames[preset.id] || preset.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight mt-0.5">
                            {shortSizes[preset.id] || preset.sublabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Preset Detail Info Card on Mobile */}
                  {selectedPreset && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/90 text-xs animate-in fade-in duration-150">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-indigo-950 text-xs truncate">
                          {selectedPreset.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                          {selectedPreset.sublabel}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {selectedPreset.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tablet & Desktop View: Modern Card Grid */}
                <div className="hidden sm:grid grid-cols-2 gap-3.5">
                  {INDONESIA_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/10'
                            : 'border-slate-200 hover:border-indigo-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shadow-xs">
                              {getPresetIcon(preset.id, false)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                              <p className="text-xs font-semibold text-indigo-600">
                                {preset.sublabel}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="mt-2.5 text-xs text-slate-600 leading-relaxed font-normal">
                          {preset.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Size Input */}
              {selectedPresetId === 'custom' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Batas Maksimal Ukuran Dokumen (Kilobyte / KB):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="50"
                      max="10000"
                      step="50"
                      value={customTargetKB}
                      onChange={(e) => setCustomTargetKB(parseInt(e.target.value, 10) || 300)}
                      className="w-36 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <span className="text-sm font-semibold text-slate-600">KB</span>
                  </div>
                </div>
              )}

              {/* Real-time processing progress bar */}
              {isProcessing && (
                <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>{compressProgressText || 'Sedang memproses...'}</span>
                    </span>
                    <span>{compressProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-indigo-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full transition-all duration-300"
                      style={{ width: `${compressProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Compression Results Summary */}
              {compressionResult && !isProcessing && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Hasil Optimasi Berkas
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Hemat {compressionResult.reductionPercentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <p className="text-[11px] text-slate-500 font-medium">Ukuran Asli</p>
                      <p className="text-sm font-bold text-slate-700">
                        {formatBytes(compressionResult.originalSize)}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <p className="text-[11px] text-slate-500 font-medium">Ukuran Hasil</p>
                      <p className="text-sm font-bold text-indigo-600">
                        {formatBytes(compressionResult.compressedSize)}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-slate-500 font-medium">Batas Maksimal</p>
                      <p className="text-sm font-bold text-slate-700">
                        &lt; {compressionResult.targetKBLimit} KB
                      </p>
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      compressionResult.meetsRequirement
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        compressionResult.meetsRequirement
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    />
                    <div className="text-xs">
                      <p className="font-bold">
                        {compressionResult.meetsRequirement
                          ? `✅ Berkas Lolos Syarat Verifikasi Resmi Portal (${formatBytes(
                              compressionResult.compressedSize
                            )} < ${compressionResult.targetKBLimit} KB)`
                          : 'Ukuran telah dioptimalkan secara maksimal namun masih mendekati batas.'}
                      </p>
                      <p className="mt-0.5 text-slate-600">
                        Dokumen siap diunggah ke SSCASN BKN / Rekrutmen BUMN / LPSE.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Merge Settings */}
          {tool.id === 'merge' && (
            <p className="text-sm text-slate-600">
              Dokumen akan digabungkan dari atas ke bawah sesuai urutan daftar di atas. Kamu dapat
              menggunakan tombol panah untuk mengubah posisinya.
            </p>
          )}

          {/* Split / Page Extractor Settings */}
          {(tool.id === 'split' || tool.id === 'page-extractor') && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Rentang Halaman yang Ingin Diambil
              </label>
              <input
                type="text"
                value={splitRange}
                onChange={(e) => setSplitRange(e.target.value)}
                placeholder="Contoh: 1-3, 5, 8"
                className="w-full sm:w-80 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
              <p className="text-xs text-slate-500">
                Gunakan tanda hubung untuk rentang (misal: <code>1-3</code>) dan koma untuk halaman
                terpisah (misal: <code>1-3, 5</code>). Total halaman file ini:{' '}
                <strong>{files[0]?.pageCount || 1}</strong>.
              </p>
            </div>
          )}

          {/* Rotate Settings */}
          {tool.id === 'rotate' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Arah Sudut Putaran
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { angle: 90 as const, label: 'Putar 90° (Searah Jarum Jam)' },
                  { angle: 180 as const, label: 'Putar 180° (Balik)' },
                  { angle: 270 as const, label: 'Putar 270° (Berlawanan)' },
                ].map((item) => (
                  <button
                    key={item.angle}
                    type="button"
                    onClick={() => setRotateAngle(item.angle)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all cursor-pointer ${
                      rotateAngle === item.angle
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Watermark Settings */}
          {tool.id === 'watermark' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teks Watermark / Stempel
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="Contoh: CONFIDENTIAL, RAHASIA, DRAFT"
                  className="w-full sm:w-96 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tingkat Transparansi ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ukuran Font ({watermarkFontSize}px)
                  </label>
                  <input
                    type="range"
                    min="24"
                    max="72"
                    step="2"
                    value={watermarkFontSize}
                    onChange={(e) => setWatermarkFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Page Number Settings */}
          {tool.id === 'page-number' && (
            <div className="space-y-6">
              {/* Position Grid */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Posisi Nomor Halaman pada Lembar Kertas</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5 max-w-md">
                  {[
                    { id: 'top-left' as const, label: 'Atas Kiri' },
                    { id: 'top-center' as const, label: 'Atas Tengah' },
                    { id: 'top-right' as const, label: 'Atas Kanan (Skripsi)' },
                    { id: 'bottom-left' as const, label: 'Bawah Kiri' },
                    { id: 'bottom-center' as const, label: 'Bawah Tengah (Bab I)' },
                    { id: 'bottom-right' as const, label: 'Bawah Kanan (Standar)' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setPageNumberPosition(pos.id)}
                      className={`py-3 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        pageNumberPosition === pos.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{pos.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Penomoran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Gaya & Format Penomoran
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'number' as const, label: '1, 2, 3...', sub: 'Angka Biasa' },
                    { id: 'page-of' as const, label: 'Halaman 1 dari N', sub: 'Format Resmi' },
                    { id: 'page-slash' as const, label: 'Halaman 1/N', sub: 'Format Ringkas' },
                    { id: 'dash' as const, label: '- 1 -', sub: 'Tanda Strip' },
                    { id: 'roman' as const, label: 'i, ii, iii...', sub: 'Romawi Kecil' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setPageNumberFormat(fmt.id)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        pageNumberFormat === fmt.id
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <p className={`text-xs font-bold ${pageNumberFormat === fmt.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {fmt.label}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{fmt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover / First Page Skip & Start Number */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipFirstPageCover}
                    onChange={(e) => setSkipFirstPageCover(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Lewati Halaman Pertama (Sampul / Cover Dokumen)
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6.5 leading-relaxed">
                  Aktifkan ini jika dokumen memiliki lembar sampul / cover agar halaman pertama tetap bersih tanpa nomor (standar penulisan karya ilmiah & skripsi).
                </p>

                <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Mulai Hitungan Dari:</span>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={pageNumberStart}
                      onChange={(e) => setPageNumberStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Ukuran Font:</span>
                    {[
                      { size: 9, label: 'Kecil (9pt)' },
                      { size: 11, label: 'Standar (11pt)' },
                      { size: 13, label: 'Besar (13pt)' },
                    ].map((s) => (
                      <button
                        key={s.size}
                        type="button"
                        onClick={() => setPageNumberFontSize(s.size)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          pageNumberFontSize === s.size
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Images to PDF Settings */}
          {tool.id === 'images-to-pdf' && (
            <p className="text-sm text-slate-600">
              Setiap gambar akan dijadikan satu halaman penuh PDF dengan resolusi asli gambar.
            </p>
          )}
        </div>
      )}

      {/* Notifications / Error Feedback */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <p className="font-semibold">Gagal Memproses Dokumen</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {statusMessage && !errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
          <div className="flex-1">
            <p className="font-semibold">{statusMessage}</p>
            {lastDownloadedData && (
              <button
                onClick={handleDownloadAgain}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Dokumen Lagi
              </button>
            )}
          </div>
        </div>
      )}

      {/* Process CTA Button */}
      {files.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-end pt-4">
          <button
            onClick={() => {
              setFiles([]);
              setCompressionResult(null);
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Reset Pilihan
          </button>

          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-98"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {tool.id === 'cpns-compress'
                    ? `${compressProgressText || 'Mengoptimasi Berkas...'} (${compressProgress}%)`
                    : 'Memproses Dokumen...'}
                </span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>
                  {tool.id === 'cpns-compress'
                    ? 'Optimasi Sesuai Syarat Sekarang'
                    : tool.id === 'merge'
                    ? 'Gabungkan PDF Sekarang'
                    : tool.id === 'split'
                    ? 'Pisahkan Halaman Sekarang'
                    : tool.id === 'rotate'
                    ? 'Putar Halaman Sekarang'
                    : tool.id === 'watermark'
                    ? 'Pasang Watermark Sekarang'
                    : tool.id === 'page-number'
                    ? 'Beri Nomor Halaman Sekarang'
                    : 'Konversi ke PDF Sekarang'}
                </span>
              </>
            )}
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
};
