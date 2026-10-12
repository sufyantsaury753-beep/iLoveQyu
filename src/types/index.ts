export type ToolId = 
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
  category: 'organize' | 'security' | 'convert';
  icon: string;
  popular?: boolean;
}

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
  previewUrl?: string;
}
