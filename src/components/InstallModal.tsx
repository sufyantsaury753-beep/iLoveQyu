import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Smartphone, CheckCircle2, MoreVertical, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS?: boolean;
  isAndroid?: boolean;
  isWebView?: boolean;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  isIOS = false,
  isAndroid = false,
  isWebView = false,
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');

  useEffect(() => {
    if (isIOS) {
      setActiveTab('ios');
    } else if (isAndroid) {
      setActiveTab('android');
    }
  }, [isIOS, isAndroid, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 relative text-center max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Tutup panduan"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Smartphone className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          Pasang Aplikasi iLoveQyu di HP
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Aplikasi PWA resmi: langsung terpasang di layar HP tanpa Play Store & bisa dibuka <strong>offline</strong>!
        </p>

        {/* In-App Browser (WebView) Warning Banner */}
        {isWebView && (
          <div className="mb-4 text-left p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <ExternalLink className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Membuka dari WhatsApp / Telegram?
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  Android membatasi pasang aplikasi di dalam chat. Ketuk <strong>Titik Tiga (⋮)</strong> di pojok kanan atas layar ini, lalu pilih <strong>"Buka di Browser / Chrome"</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'android'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <span>🤖 Android (Chrome)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ios'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <span>🍎 iPhone / iPad</span>
          </button>
        </div>

        {/* Content Tab: Android */}
        {activeTab === 'android' && (
          <div className="space-y-3 text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-xs">
                1
              </div>
              <div>
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Ketuk Menu Titik Tiga</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                    <MoreVertical className="w-3 h-3 inline mr-0.5" /> ⋮
                  </span>
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Terletak di pojok kanan paling atas layar browser Google Chrome atau Samsung Internet Anda.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200/70">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-xs">
                2
              </div>
              <div>
                <p className="font-bold text-slate-800">
                  Pilih <span className="text-indigo-600">"Instal aplikasi"</span> atau <span className="text-indigo-600">"Tambahkan ke Layar Utama"</span>
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Gulir daftar menu ke bawah dan klik opsi instalasi tersebut.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200/70">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-xs">
                3
              </div>
              <div>
                <p className="font-bold text-slate-800">
                  Klik <span className="text-emerald-600">"Instal"</span> pada jendela konfirmasi
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Ikon iLoveQyu akan langsung muncul di beranda HP Anda layaknya aplikasi bawaan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab: iOS */}
        {activeTab === 'ios' && (
          <div className="space-y-3 text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-xs">
                1
              </div>
              <div>
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Ketuk ikon Bagikan</span>
                  <Share className="w-3.5 h-3.5 text-indigo-600 inline" />
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Ikon kotak panah ke atas di bilah menu bawah browser Safari.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200/70">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-xs">
                2
              </div>
              <div>
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Pilih "Tambah ke Layar Utama"</span>
                  <PlusSquare className="w-3.5 h-3.5 text-indigo-600 inline" />
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Gulir ke bawah dan ketuk menu <strong>"Add to Home Screen"</strong>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200/70">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-xs">
                3
              </div>
              <div>
                <p className="font-bold text-slate-800">
                  Ketuk tombol <span className="text-indigo-600">"Tambah"</span> di pojok kanan atas
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Aplikasi siap digunakan kapan saja dari layar depan iPhone Anda.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PWA Advantages Reassurance */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <div className="bg-emerald-50 border border-emerald-200/60 p-2.5 rounded-xl flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-emerald-800">100% Offline</p>
              <p className="text-[10px] text-emerald-700 leading-tight">Hemat kuota & cepat tanpa sinyal</p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200/60 p-2.5 rounded-xl flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-indigo-800">Aman Resmi</p>
              <p className="text-[10px] text-indigo-700 leading-tight">Tanpa peringatan virus APK luar</p>
            </div>
          </div>
        </div>

        {/* Offline Benefit pill */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 py-2 px-3 rounded-xl">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Privasi 100% — Seluruh dokumen diproses lokal di HP</span>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
};
