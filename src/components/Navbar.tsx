import React from 'react';
import { FileText, Heart, Download } from 'lucide-react';

interface NavbarProps {
  onReset: () => void;
  onNavigate: (sectionId: string) => void;
  onOpenOwnerModal?: () => void;
  onInstallClick?: () => void;
  isInstalled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onReset,
  onNavigate,
  onOpenOwnerModal,
  onInstallClick,
  isInstalled,
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200/70 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 group text-left focus:outline-none cursor-pointer"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
            <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white p-0.5 rounded-full border-2 border-white shadow-xs">
              <Heart className="w-2.5 h-2.5 fill-current" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                iLove<span className="text-indigo-600">Qyu</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">PRIVATE PDF TOOLS</p>
          </div>
        </button>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            onClick={onReset}
            className="hover:text-indigo-600 transition-colors cursor-pointer"
          >
            Semua Alat
          </button>
          <button
            onClick={() => onNavigate('features')}
            className="hover:text-indigo-600 transition-colors cursor-pointer"
          >
            Keamanan
          </button>
          <button
            onClick={() => onNavigate('faq')}
            className="hover:text-indigo-600 transition-colors cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Right Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Install App Button */}
          {!isInstalled && onInstallClick && (
            <button
              type="button"
              onClick={onInstallClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-xs shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Install Aplikasi</span>
              <span className="sm:hidden">Install</span>
            </button>
          )}

          {/* Secret Version Button: Click to open Owner Modal */}
          <button
            type="button"
            onClick={onOpenOwnerModal}
            title="v1.0"
            className="flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer select-none active:scale-95 focus:outline-none"
          >
            <span>v1.0</span>
          </button>
        </div>
      </div>
    </header>
  );
};
