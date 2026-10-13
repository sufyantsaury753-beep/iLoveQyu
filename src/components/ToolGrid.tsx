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
  FileText,
  FileType,
  PenTool,
} from 'lucide-react';

interface ToolGridProps {
  tools: PDFTool[];
  onSelectTool: (id: ToolId) => void;
}

const getToolIcon = (iconName: string, isMobile = false) => {
  const iconProps = { className: isMobile ? 'w-6 h-6' : 'w-6 h-6' };
  switch (iconName) {
    case 'PenTool':
      return <PenTool {...iconProps} />;
    case 'FileBadge2':
      return <FileBadge2 {...iconProps} />;
    case 'FileText':
      return <FileText {...iconProps} />;
    case 'FileType':
      return <FileType {...iconProps} />;
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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* ======================================================== */}
      {/* 1. MOBILE VIEW (< sm / < 640px): 3-Column Circular Icons */}
      {/* ======================================================== */}
      <div className="grid grid-cols-3 gap-y-7 gap-x-2.5 sm:hidden px-1">
        {tools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className="group flex flex-col items-center text-center cursor-pointer select-none active:scale-90 transition-transform duration-150"
          >
            {/* Circular Icon Button */}
            <div className="relative">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  tool.featured
                    ? 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-300'
                    : 'bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-600 border border-indigo-100/90 shadow-xs group-hover:bg-indigo-100/80 group-hover:border-indigo-300'
                }`}
              >
                {getToolIcon(tool.icon, true)}
              </div>

              {/* Mini Badge for Mobile */}
              {tool.badge && (
                <span
                  className={`absolute -top-1 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold shadow-xs ${
                    tool.featured
                      ? 'bg-rose-500 text-white ring-1 ring-white'
                      : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {tool.featured ? 'HOT' : tool.popular ? 'TOP' : 'PRO'}
                </span>
              )}
            </div>

            {/* Title Underneath Circle */}
            <span className="mt-2 text-[11px] font-semibold text-slate-800 leading-snug text-center line-clamp-2 px-1 group-hover:text-indigo-600 transition-colors">
              {tool.title}
            </span>
          </div>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 2. TABLET & DESKTOP VIEW (>= sm): Modern SaaS Card Grid  */}
      {/* ======================================================== */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
