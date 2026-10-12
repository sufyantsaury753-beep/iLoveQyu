import React from 'react';
import { FileCheck } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-10 pb-6 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-indigo-100/50 to-violet-100/50 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-3xl mx-auto">
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 mb-5 shadow-xs">
          <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Solusi PDF Generasi Baru — Super Cepat & Tanpa Upload</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
          Olah Dokumen PDF Lebih <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Cepat</span>, Indah, dan <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Privat</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-3.5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Semua file diproses langsung di memori browser kamu menggunakan WebAssembly & JavaScript. Dokumen rahasia tidak pernah dikirim ke server luar.
        </p>
      </div>
    </section>
  );
};
