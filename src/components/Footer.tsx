import React from 'react';
import { FileText, Heart, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              iLove<span className="text-indigo-400">Qyu</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium ml-2">
              Privat & Cepat
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              100% Client-Side Engine
            </span>
            <span>•</span>
            <span>Zero Data Stored</span>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
            <span>© {new Date().getFullYear()} iLoveQyu by</span>
            <a
              href="https://piantsa.my.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
            >
              piantsa
            </a>
            <span>. All rights reserved.</span>
          </p>
          <p className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
            <span>Dibuat dengan</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current inline" />
            <span>untuk privasi dokumen Anda.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
