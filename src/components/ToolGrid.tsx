import React from 'react';
import type { PDFTool, ToolId } from '../types';
import {
  Files,
  Split,
  RotateCw,
  Stamp,
  Image as ImageIcon,
  Scissors,
  ArrowRight,
  FileBadge2,
} from 'lucide-react';

interface ToolGridProps {
  tools: PDFTool[];
  onSelectTool: (id: ToolId) => void;
}

const getToolIcon = (iconName: string) => {
  const iconProps = { className: 'w-6 h-6' };
  switch (iconName) {
    case 'FileBadge2':
      return <FileBadge2 {...iconProps} />;
    case 'Files':
      return <Files {...iconProps} />;
    case 'Split':
      return <Split {...iconProps} />;
    case 'RotateCw':
      return <RotateCw {...iconProps} />;
    case 'Stamp':
      return <Stamp {...iconProps} />;
    case 'Image':
      return <ImageIcon {...iconProps} />;
    case 'Scissors':
      return <Scissors {...iconProps} />;
    default:
      return <Files {...iconProps} />;
  }
};

export const ToolGrid: React.FC<ToolGridProps> = ({ tools, onSelectTool }) => {
  if (tools.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
          <Files className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Alat tidak ditemukan</h3>
        <p className="text-sm text-slate-500 mt-1">Coba kata kunci pencarian yang lain.</p>
      </div>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`group relative bg-white rounded-2xl p-6 border ${
              tool.featured
                ? 'border-indigo-300/90 ring-2 ring-indigo-500/10 shadow-sm'
                : 'border-slate-200/80 hover:border-indigo-400/80'
            } shadow-xs hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between`}
          >
            <div>
              {/* Header row with Icon and Badge */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-50 to-violet-50 group-hover:from-indigo-600 group-hover:to-violet-600 text-indigo-600 group-hover:text-white border border-indigo-100 group-hover:border-transparent flex items-center justify-center transition-all duration-300 shadow-xs group-hover:shadow-md group-hover:shadow-indigo-500/20">
                  {getToolIcon(tool.icon)}
                </div>

                {tool.badge && (
                  <span
                    className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      tool.featured
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700 border border-slate-200/60'
                    } transition-colors`}
                  >
                    {tool.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                <span>{tool.title}</span>
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed font-normal">
                {tool.description}
              </p>
            </div>

            {/* Bottom action trigger */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
              <span>Buka Alat</span>
              <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
