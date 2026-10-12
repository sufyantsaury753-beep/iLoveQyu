export type ToolId = 
  | 'cpns-compress'
  | 'merge' 
  | 'split' 
  | 'rotate' 
  | 'images-to-pdf' 
  | 'watermark' 
  | 'page-extractor';

export interface PDFTool {
  id: ToolId;
  title: string;
  description: string;
  badge?: string;
  category: 'special' | 'organize' | 'security' | 'convert';
  icon: string;
  popular?: boolean;
  featured?: boolean;
}

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
  previewUrl?: string;
}
