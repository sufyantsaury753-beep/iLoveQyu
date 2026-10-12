import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ToolGrid } from './components/ToolGrid';
import { Workspace } from './components/Workspace';
import { TrustSection } from './components/TrustSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { OwnerModal } from './components/OwnerModal';
import { PDF_TOOLS } from './data/tools';
import { isOwnerLoggedIn, isSimulatingRegularUser } from './lib/admin';
import type { ToolId } from './types';

export function App() {
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Owner Mode State
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const refreshOwnerStatus = () => {
    const logged = isOwnerLoggedIn() && !isSimulatingRegularUser();
    setIsOwner(logged);
  };

  useEffect(() => {
    refreshOwnerStatus();
  }, []);

  const activeTool = PDF_TOOLS.find((t) => t.id === activeToolId);

  // Filter tools based on search and category
  const filteredTools = PDF_TOOLS.filter((tool) => {
    const matchesSearch =
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || tool.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleSelectTool = (id: ToolId) => {
    setActiveToolId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setActiveToolId(null);
    setSearchQuery('');
    setSelectedCategory('all');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Owner Modal */}
      <OwnerModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        onStatusChange={refreshOwnerStatus}
      />

      <Navbar
        onReset={handleReset}
        onNavigate={handleNavigate}
        isOwner={isOwner}
        onOpenOwnerModal={() => setIsOwnerModalOpen(true)}
      />

      <main className="flex-1">
        {activeTool ? (
          <Workspace tool={activeTool} onBack={handleReset} />
        ) : (
          <>
            <Hero
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />

            <ToolGrid tools={filteredTools} onSelectTool={handleSelectTool} />

            <TrustSection />

            <FAQSection />
          </>
        )}
      </main>

      <Footer onOpenOwnerModal={() => setIsOwnerModalOpen(true)} />
    </div>
  );
}

export default App;
