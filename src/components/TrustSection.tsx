import React from 'react';
import { ShieldCheck, Zap, Infinity as InfinityIcon } from 'lucide-react';

export const TrustSection: React.FC = () => {
  const features = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-indigo-600" />,
      title: 'Zero Server Uploads',
      description:
        'Dokumen Anda tidak pernah dikirim ke server mana pun. Seluruh operasi penggabungan, pemotongan, dan pengubahan dilakukan 100% di dalam RAM browser Anda.',
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      title: 'Kecepatan Instan',
      description:
        'Tanpa waktu tunggu upload atau download berkas dari cloud. Performa digerakkan langsung oleh prosesor perangkat Anda dengan engine WebAssembly & JS.',
    },
    {
      icon: <InfinityIcon className="w-6 h-6 text-emerald-600" />,
      title: 'Bebas Batas & Privasi Penuh',
      description:
        'Tidak ada antrean tunggu berbayar, tidak ada watermark paksaan, dan tanpa perlu mendaftar akun. Kapan pun Anda butuh, iLoveQyu selalu siap pakai.',
    },
  ];

  return (
    <section id="features" className="py-20 bg-white border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs font-bold tracking-widest text-indigo-600 uppercase">
            MENGAPA ILOVEQYU?
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
            Keamanan Privasi Maksimal Tanpa Kompromi
          </p>
          <p className="mt-3 text-slate-600 text-sm">
            Platform utilitas dokumen modern yang menghargai hak privasi data Anda sepenuhnya.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-slate-50 border border-slate-200/70 hover:border-indigo-300 transition-all duration-300 hover:shadow-md hover:shadow-indigo-500/5 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center mb-6 shadow-xs group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
