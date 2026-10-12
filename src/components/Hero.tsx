import React from 'react';
import { Search, ShieldCheck, Zap, Lock, FileCheck } from 'lucide-react';

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
}) => {
  const categories = [
    { id: 'all', label: 'Semua Alat' },
    { id: 'organize', label: 'Susun & Pisah' },
    { id: 'security', label: 'Watermark & Proteksi' },
    { id: 'convert', label: 'Gambar & Format' },
  ];

  return (
    <section className="relative pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-indigo-100/50 to-violet-100/50 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-3xl mx-auto">
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 mb-6 shadow-xs">
          <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Solusi PDF Generasi Baru — Super Cepat & Tanpa Upload</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
          Olah Dokumen PDF Lebih <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Cepat</span>, Indah, dan <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Privat</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Semua file diproses langsung di memori browser kamu menggunakan WebAssembly & JavaScript. Dokumen rahasia tidak pernah dikirim ke server luar.
        </p>

        {/* Trust quick-tags */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-500" /> 100% Aman & Privat
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Proses Instan Lokal
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Tanpa Kuota / Batas File
          </span>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="mt-8 max-w-xl mx-auto space-y-4">
          <div className="relative group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari alat (misal: Merge, Split, Watermark, Rotate)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded-md hover:bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
