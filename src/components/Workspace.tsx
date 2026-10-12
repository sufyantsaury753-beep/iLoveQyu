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
} from '../lib/pdf';
import {
  INDONESIA_PRESETS,
  smartCompressToTarget,
  type CompressionResult,
} from '../lib/compressor';
import { convertPdfToWord, convertWordToPdf } from '../lib/converters';
import {
  checkDeviceQuota,
  recordFreeTrialUsed,
  type DeviceQuotaInfo,
} from '../lib/fingerprint';
import { PaywallModal } from './PaywallModal';
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
  Smartphone,
  Crown,
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

  // CPNS / BUMN / LPSE Specific Options
  const [selectedPresetId, setSelectedPresetId] = useState<'cpns' | 'bumn' | 'lpse' | 'custom'>('cpns');
  const [customTargetKB, setCustomTargetKB] = useState(450);
  const [compressProgress, setCompressProgress] = useState(0);
  const [compressProgressText, setCompressProgressText] = useState('');
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageTool = tool.id === 'images-to-pdf';
  const isWordInputTool = tool.id === 'word-to-pdf';
  const accepts = isImageTool
    ? 'image/png, image/jpeg, image/jpg'
    : isWordInputTool
    ? '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword'
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

    const newItems: UploadedFileItem[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      let pageCount = 1;

      if (!isImageTool && !isWordInputTool && file.type === 'application/pdf') {
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
      tool.id === 'cpns-compress' ||
      tool.id === 'pdf-to-word' ||
      tool.id === 'word-to-pdf'
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
      } else if (tool.id === 'images-to-pdf') {
        resultData = await imagesToPDF(files.map((f) => f.file));
        outputName = `images_${Date.now()}.pdf`;
      } else if (tool.id === 'pdf-to-word') {
        const file = files[0].file;
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setStatusMessage('Mengekstrak teks & menyusun dokumen Word (.docx)...');
        const docxBlob = await convertPdfToWord(file);
        outputName = `${baseName}.docx`;
        const arrayBuffer = await docxBlob.arrayBuffer();
        resultData = new Uint8Array(arrayBuffer);
      } else if (tool.id === 'word-to-pdf') {
        const file = files[0].file;
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setStatusMessage('Membaca Word (.docx) & merender ke PDF...');
        resultData = await convertWordToPdf(file);
        outputName = `${baseName}.pdf`;
      } else {
        throw new Error('Fitur belum diimplementasikan');
      }

      // Check Quota Enforcement for the paid/special tool
      if (tool.id === 'cpns-compress') {
        const quota = await checkDeviceQuota();
        setDeviceQuota(quota);

        if (!quota.hasUsedFreeTrial || quota.isVipUnlocked) {
          // Free trial or VIP: download automatically
          downloadBlob(resultData, outputName);
          setLastDownloadedData({ data: resultData, fileName: outputName });

          if (!quota.isVipUnlocked) {
            await recordFreeTrialUsed();
            const updated = await checkDeviceQuota();
            setDeviceQuota(updated);
          }

          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.65 },
            colors: ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'],
          });

          setStatusMessage('Selesai! 1x Kuota Coba Gratis telah Anda gunakan. Berkas berhasil diunduh.');
        } else {
          // Free trial already consumed! Trigger Paywall Modal!
          setPendingDownload({ data: resultData, fileName: outputName });
          setIsPaywallOpen(true);
          setStatusMessage('Dokumen selesai dioptimasi! Buka kunci untuk mengunduh.');
        }
      } else {
        // Normal tools remain completely free
        const mime = outputName.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf';
        downloadBlob(resultData, outputName, mime);
        setLastDownloadedData({ data: resultData, fileName: outputName });

        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'],
        });

        setStatusMessage('Selesai! Dokumen berhasil diproses dan otomatis terunduh.');
      }
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

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'],
      });

      setStatusMessage('Pembayaran terkonfirmasi! Dokumen berhasil diunduh.');
    }
  };

  const handleDownloadAgain = async () => {
    if (!lastDownloadedData) return;

    if (tool.id === 'cpns-compress') {
      const quota = await checkDeviceQuota();
      if (!quota.hasUsedFreeTrial || quota.isVipUnlocked) {
        downloadBlob(lastDownloadedData.data, lastDownloadedData.fileName);
      } else {
        setPendingDownload(lastDownloadedData);
        setIsPaywallOpen(true);
      }
    } else {
      const mime = lastDownloadedData.fileName.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';
      downloadBlob(lastDownloadedData.data, lastDownloadedData.fileName, mime);
    }
  };

  const getPresetIcon = (id: string) => {
    switch (id) {
      case 'cpns':
        return <GraduationCap className="w-5 h-5 text-indigo-600" />;
      case 'bumn':
        return <Building2 className="w-5 h-5 text-violet-600" />;
      case 'lpse':
        return <Scale className="w-5 h-5 text-amber-600" />;
      default:
        return <Sliders className="w-5 h-5 text-slate-600" />;
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
          {tool.id === 'cpns-compress' && deviceQuota && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold">
              {deviceQuota.isVipUnlocked ? (
                <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  VIP Unlocked
                </span>
              ) : !deviceQuota.hasUsedFreeTrial ? (
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  1x Coba Gratis
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  <Lock className="w-3.5 h-3.5" />
                  Rp 3.000 / berkas
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Memori Lokal • Zero Cloud Storage</span>
          </div>
        </div>
      </div>

      {/* Active Tool Intro Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {tool.title}
              </h2>
            </div>
            <p className="text-sm text-slate-600">{tool.description}</p>

            {tool.id === 'cpns-compress' && deviceQuota && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 font-mono">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span>Sidik Jari Perangkat: <strong>{deviceQuota.deviceId}</strong></span>
              </div>
            )}
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            {tool.badge || 'Client-Side'}
          </span>
        </div>
      </div>

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
          Pilih file {isImageTool ? 'gambar (JPG, PNG)' : isWordInputTool ? 'Word (.docx)' : 'PDF'} atau tarik ke sini
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          {tool.id === 'cpns-compress'
            ? 'Pilih scan KTP, Ijazah, Transkrip, atau Surat Lamaran Anda.'
            : tool.id === 'pdf-to-word'
            ? 'Pilih dokumen PDF untuk diubah menjadi file Microsoft Word (.docx).'
            : tool.id === 'word-to-pdf'
            ? 'Pilih dokumen Word (.docx) untuk dikonversi menjadi format PDF.'
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
                      {item.pageCount && !isImageTool && (
                        <>
                          <span>•</span>
                          <span>{item.pageCount} Halaman</span>
                        </>
                      )}
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
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Pilih Standar Verifikasi Portal Resmi
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                              {getPresetIcon(preset.id)}
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

          {/* Images to PDF Settings */}
          {tool.id === 'images-to-pdf' && (
            <p className="text-sm text-slate-600">
              Setiap gambar akan dijadikan satu halaman penuh PDF dengan resolusi asli gambar.
            </p>
          )}

          {/* PDF to Word Settings */}
          {tool.id === 'pdf-to-word' && (
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-sm text-slate-700">
              <p className="font-semibold text-indigo-900 mb-1">Konversi Cerdas ke Microsoft Word (.docx)</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Teks, judul, dan struktur halaman akan diekstrak langsung di browsermu dan disusun menjadi file .docx yang dapat diedit langsung di Microsoft Word, WPS Office, maupun Google Docs.
              </p>
            </div>
          )}

          {/* Word to PDF Settings */}
          {tool.id === 'word-to-pdf' && (
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-sm text-slate-700">
              <p className="font-semibold text-indigo-900 mb-1">Konversi Cepat Word (.docx) ke PDF</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dokumen Word Anda akan dikonversi ke format PDF berstandar A4 dengan tipografi yang rapi, 100% diproses di browser tanpa upload ke server luar.
              </p>
            </div>
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
                    : tool.id === 'pdf-to-word'
                    ? 'Konversi ke Word (.docx) Sekarang'
                    : tool.id === 'word-to-pdf'
                    ? 'Konversi ke PDF Sekarang'
                    : tool.id === 'merge'
                    ? 'Gabungkan PDF Sekarang'
                    : tool.id === 'split'
                    ? 'Pisahkan Halaman Sekarang'
                    : tool.id === 'rotate'
                    ? 'Putar Halaman Sekarang'
                    : tool.id === 'watermark'
                    ? 'Pasang Watermark Sekarang'
                    : 'Konversi ke PDF Sekarang'}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
