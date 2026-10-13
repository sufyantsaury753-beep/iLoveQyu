import React from 'react';
import { X, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IosInstallModal: React.FC<IosInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200/80 relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Smartphone className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          Pasang iLoveQyu di iPhone / iPad
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          Ikuti 2 langkah mudah berikut untuk menggunakan aplikasi tanpa kuota internet:
        </p>

        {/* Steps */}
        <div className="space-y-3.5 text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>Ketuk ikon Bagikan</span>
                <Share className="w-3.5 h-3.5 text-indigo-600 inline" />
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Ikon kotak panah ke atas di bilah menu bawah Safari.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t border-slate-200/70">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>Pilih "Tambah ke Layar Utama"</span>
                <PlusSquare className="w-3.5 h-3.5 text-indigo-600 inline" />
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Gulir ke bawah dan ketuk opsi <strong>"Add to Home Screen"</strong>, lalu klik <strong>"Tambah"</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Offline Benefit */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 py-2 px-3 rounded-xl">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Bisa dipakai offline saat tidak ada sinyal!</span>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer"
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
};
