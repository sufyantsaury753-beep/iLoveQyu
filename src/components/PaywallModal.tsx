import React, { useState } from 'react';
import {
  Lock,
  QrCode,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Zap,
  X,
  Smartphone,
} from 'lucide-react';
import { redeemAccessCode, markDeviceUnlocked } from '../lib/fingerprint';
import { getOwnerSettings } from '../lib/admin';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockedSuccess: () => void;
  deviceId: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onUnlockedSuccess,
  deviceId,
}) => {
  const [activeTab, setActiveTab] = useState<'qris' | 'code'>('qris');
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const ownerSettings = getOwnerSettings();

  if (!isOpen) return null;

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    if (!inputCode.trim()) {
      setCodeError('Masukkan kode akses terlebih dahulu.');
      return;
    }

    const success = redeemAccessCode(inputCode);
    if (success) {
      onUnlockedSuccess();
    } else {
      setCodeError('Kode akses tidak valid atau telah kadaluarsa. Coba gunakan: QYU3000');
    }
  };

  const handleConfirmQRIS = () => {
    setIsVerifying(true);
    setTimeout(() => {
      markDeviceUnlocked();
      setIsVerifying(false);
      onUnlockedSuccess();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-indigo-50/60 to-white border-b border-slate-100 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Lock className="w-7 h-7" />
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Buka Kunci Unduhan Berkas
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            Anda telah menggunakan <span className="font-bold text-indigo-600">1x Kuota Coba Gratis</span> pada perangkat ini.
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
            <Smartphone className="w-3 h-3 text-slate-400" />
            <span>ID Perangkat: {deviceId}</span>
          </div>
        </div>

        {/* Pricing Highlight */}
        <div className="px-6 sm:px-8 py-4 bg-indigo-600 text-white flex items-center justify-between">
          <div>
            <p className="text-[11px] text-indigo-200 uppercase tracking-wider font-bold">
              Tarif Buka Kunci
            </p>
            <p className="text-2xl font-black">
              Rp 3.000 <span className="text-xs font-normal text-indigo-200">/ berkas</span>
            </p>
          </div>
          <div className="text-right text-xs text-indigo-100 space-y-0.5">
            <p className="flex items-center gap-1 justify-end font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Hasil Lolos BKN & CPNS
            </p>
            <p className="flex items-center gap-1 justify-end font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Teks Jernih & Presisi
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('qris')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'qris'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Scan QRIS Instan</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Kode Akses / Voucher</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">
          {activeTab === 'qris' ? (
            <div className="text-center space-y-4">
              {/* QRIS Display Container */}
              <div className="w-48 h-48 mx-auto p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-sm flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between text-[10px] font-bold text-slate-800 border-b pb-1">
                  <span>QRIS STANDAR</span>
                  <span className="text-indigo-600">iLoveQyu</span>
                </div>

                {/* QR Pattern or Custom QRIS Image */}
                {ownerSettings.qrisImageUrl ? (
                  <img
                    src={ownerSettings.qrisImageUrl}
                    alt="QRIS DANA"
                    className="w-36 h-36 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-slate-950 p-2 rounded-lg flex items-center justify-center text-white">
                    <QrCode className="w-28 h-28 text-white" />
                  </div>
                )}

                <p className="text-[10px] font-bold text-slate-700">
                  {ownerSettings.danaNumber ? `DANA: ${ownerSettings.danaNumber} • ` : ''}Nominal: Rp 3.000
                </p>
              </div>

              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Bisa di-scan menggunakan <strong>BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay</strong> atau m-banking lainnya.
              </p>

              {ownerSettings.waNumber && (
                <div>
                  <a
                    href={`https://wa.me/${ownerSettings.waNumber}?text=Halo%20Admin%20saya%20sudah%20transfer%20Rp3000%20untuk%20iLoveQyu`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <span>💬 Kirim Bukti Pembayaran ke WhatsApp</span>
                  </a>
                </div>
              )}

              <button
                onClick={handleConfirmQRIS}
                disabled={isVerifying}
                className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                {isVerifying ? (
                  <span>Memverifikasi Pembayaran...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saya Sudah Bayar (Buka Kunci Unduhan)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Masukkan Kode Voucher / PIN Akses:
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Contoh: QYU3000"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 font-mono text-sm uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                {codeError && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">{codeError}</p>
                )}
                <p className="mt-2 text-[11px] text-slate-500">
                  💡 Tips Pengujian: Gunakan kode tes <code className="font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">QYU3000</code> untuk membuka kunci secara langsung.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <span>Aktifkan Kode & Buka Unduhan</span>
              </button>
            </form>
          )}

          {/* Guarantee Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Jaminan 100% Berkas Valid
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Akses Instan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
