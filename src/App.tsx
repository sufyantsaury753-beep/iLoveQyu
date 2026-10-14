import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ToolGrid } from './components/ToolGrid';
import { Workspace } from './components/Workspace';
import { TrustSection } from './components/TrustSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { OwnerModal } from './components/OwnerModal';
import { InstallModal } from './components/InstallModal';
import { usePWA } from './hooks/usePWA';
import { PDF_TOOLS } from './data/tools';
import type { ToolId } from './types';
import { WifiOff, Download, X, ExternalLink } from 'lucide-react';

export function App() {
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);

  // Secret Owner Mode State
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  // PWA & Offline State
  const { isInstalled, isOnline, isIOS, isAndroid, isWebView, canInstall, triggerInstall } = usePWA();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isWebViewDismissed, setIsWebViewDismissed] = useState(false);

  const activeTool = PDF_TOOLS.find((t) => t.id === activeToolId);

  const handleSelectTool = (id: ToolId) => {
    setActiveToolId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setActiveToolId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (sectionId: string) => {
    setActiveToolId(null);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleInstallClick = async () => {
    const outcome = await triggerInstall();
    if (outcome === 'modal' || outcome === 'dismissed') {
      setIsInstallModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-emerald-600 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-inner z-50 sticky top-0">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>⚡ Mode Offline Aktif — Seluruh alat PDF tetap berjalan normal tanpa internet!</span>
        </div>
      )}

      {/* In-App Browser Reminder (Telegram/WhatsApp WebView) */}
      {isWebView && !isInstalled && !isWebViewDismissed && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-medium py-2 px-4 flex items-center justify-between gap-2 shadow-xs z-40 sticky top-0">
          <div className="flex items-center gap-2 min-w-0">
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Buka di <strong>Google Chrome</strong> (titik 3 ⋮ &gt; Buka di Browser) untuk pasang aplikasi di HP!
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="underline font-bold hover:text-amber-100 cursor-pointer text-[11px]"
            >
              Panduan
            </button>
            <button
              onClick={() => setIsWebViewDismissed(true)}
              className="p-1 hover:bg-amber-800/50 rounded transition-colors cursor-pointer"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Secret Owner Modal */}
      <OwnerModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        onStatusChange={() => {}}
      />

      {/* Universal Installation Instruction Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isWebView={isWebView}
      />

      <Navbar
        onReset={handleReset}
        onNavigate={handleNavigate}
        onOpenOwnerModal={() => setIsOwnerModalOpen(true)}
        onInstallClick={handleInstallClick}
        isInstalled={isInstalled}
      />

      <main className="flex-1">
        {activeTool ? (
          <Workspace tool={activeTool} onBack={handleReset} />
        ) : (
          <>
            <Hero />

            <ToolGrid tools={PDF_TOOLS} onSelectTool={handleSelectTool} />

            <TrustSection />

            <FAQSection />
          </>
        )}
      </main>

      {/* Mobile Floating Install Pill (when not installed & not dismissed) */}
      {!isInstalled && canInstall && !isBannerDismissed && (
        <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40 bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl backdrop-blur-md border border-slate-700/60 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Pasang Aplikasi iLoveQyu</p>
              <p className="text-[10px] text-slate-400 truncate">Akses cepat & tanpa kuota internet</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
            >
              Pasang
            </button>
            <button
              onClick={() => setIsBannerDismissed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default App;
