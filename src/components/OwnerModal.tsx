import React, { useState, useEffect } from 'react';
import {
  Crown,
  Lock,
  X,
  CheckCircle2,
  RotateCcw,
  LogOut,
  Save,
  Sliders,
} from 'lucide-react';
import {
  isOwnerLoggedIn,
  verifyOwnerPIN,
  logoutOwner,
  getOwnerSettings,
  saveOwnerSettings,
  setSimulationMode,
  isSimulatingRegularUser,
  type OwnerSettings,
} from '../lib/admin';
import { resetDeviceQuota } from '../lib/fingerprint';

interface OwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

export const OwnerModal: React.FC<OwnerModalProps> = ({
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const [isLogged, setIsLogged] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<OwnerSettings>({
    isOwnerActive: false,
    qrisImageUrl: '',
    danaNumber: '',
    waNumber: '',
  });
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const logged = isOwnerLoggedIn();
      setIsLogged(logged);
      setIsSimulating(isSimulatingRegularUser());
      if (logged) {
        setSettings(getOwnerSettings());
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!pinInput.trim()) {
      setPinError('Masukkan PIN master pemilik.');
      return;
    }

    const success = verifyOwnerPIN(pinInput);
    if (success) {
      setIsLogged(true);
      setSettings(getOwnerSettings());
      setPinInput('');
      onStatusChange();
    } else {
      setPinError('PIN salah! Coba gunakan PIN default: 753');
    }
  };

  const handleLogout = () => {
    logoutOwner();
    setSimulationMode(false);
    setIsLogged(false);
    onStatusChange();
  };

  const handleToggleSimulation = (simulate: boolean) => {
    setSimulationMode(simulate);
    setIsSimulating(simulate);
    onStatusChange();
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveOwnerSettings(settings);
    setSaveNotification('Pengaturan DANA & QRIS berhasil disimpan!');
    setTimeout(() => setSaveNotification(null), 3000);
    onStatusChange();
  };

  const handleResetQuota = async () => {
    await resetDeviceQuota();
    setSaveNotification('Kuota pengujian perangkat berhasil di-reset!');
    setTimeout(() => setSaveNotification(null), 3000);
    onStatusChange();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold tracking-tight">
            Panel Pemilik Aplikasi
          </h3>
          <p className="text-xs text-indigo-200 mt-0.5">
            Khusus Pembuat: <strong>Sufyan Tsaury</strong>
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          {!isLogged ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-sm text-slate-600">
                  Untuk mengaktifkan hak akses pemilik dan membuka seluruh fitur tanpa batasan biaya, masukkan PIN rahasia Anda.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  PIN Master Pemilik:
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Masukkan PIN (Default: 753)"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 font-mono text-sm tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                {pinError && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">{pinError}</p>
                )}
                <p className="mt-2 text-[11px] text-slate-400">
                  💡 PIN Bawaan: <code className="font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">753</code> (atau <code>sufyan123</code>).
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Masuk Sebagai Pemilik (Sufyan Tsaury)</span>
              </button>
            </form>
          ) : (
            /* Logged-in Owner Dashboard */
            <div className="space-y-6">
              {/* Notification Banner */}
              {saveNotification && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveNotification}</span>
                </div>
              )}

              {/* Status Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Crown className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                      Status Akun Anda
                    </p>
                    <p className="text-sm font-extrabold text-indigo-700">
                      {isSimulating ? 'Simulasi User Biasa' : 'Akses Bebas Pemilik (Aktif)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-700">VIP</span>
                </div>
              </div>

              {/* Simulation Mode Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Uji Tampilan Pengguna Biasa:
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Aktifkan ini jika ingin mengetes pop-up bayar Rp 3.000 seolah Anda pengunjung biasa.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleSimulation(!isSimulating)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSimulating
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {isSimulating ? 'Mode User Aktif' : 'Tes Mode User'}
                  </button>
                </div>
              </div>

              {/* QRIS & DANA Settings Form */}
              <form onSubmit={handleSaveSettings} className="space-y-3.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Pengaturan Rekening DANA & QRIS Kamu</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nomor Akun DANA (Contoh: 08xxxxxxxxxx):
                  </label>
                  <input
                    type="text"
                    value={settings.danaNumber}
                    onChange={(e) =>
                      setSettings({ ...settings, danaNumber: e.target.value })
                    }
                    placeholder="Contoh: 085712345678"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp Konfirmasi (Contoh: 628xxxxxxxxxx):
                  </label>
                  <input
                    type="text"
                    value={settings.waNumber}
                    onChange={(e) =>
                      setSettings({ ...settings, waNumber: e.target.value })
                    }
                    placeholder="Contoh: 6285712345678"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Link URL Foto QRIS DANA (Opsional):
                  </label>
                  <input
                    type="text"
                    value={settings.qrisImageUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, qrisImageUrl: e.target.value })
                    }
                    placeholder="https://... atau biarkan kosong untuk pakai QR bawaan"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Pengaturan DANA</span>
                </button>
              </form>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                <button
                  onClick={handleResetQuota}
                  className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Kuota Trial</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Mode Pemilik</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
