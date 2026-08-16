import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';

export interface AttachmentViewerData {
  url: string;
  name: string;
  type?: 'image' | 'pdf' | 'doc';
  size?: string;
}

interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: AttachmentViewerData | null;
}

export function AttachmentViewerModal({
  isOpen,
  onClose,
  attachment
}: AttachmentViewerModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !attachment) return null;

  const isImage =
    attachment.type === 'image' ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(attachment.url);
  const isPdf =
    attachment.type === 'pdf' ||
    /\.pdf$/i.test(attachment.url) ||
    attachment.name.toLowerCase().endsWith('.pdf');

  /** Functional cross-origin safe download using fetch + blob */
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!attachment.url || isDownloading) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      // Try fetch + blob approach first (works for same-origin or CORS-enabled URLs)
      const response = await fetch(attachment.url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Clean up the object URL after a short delay
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch {
      // Fallback: open in new tab so browser handles the download
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name || 'download';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/90 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* ── TOP TOOLBAR ── */}
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="h-14 sm:h-16 px-3 sm:px-5 bg-slate-900/95 border-b border-white/10 flex items-center justify-between shrink-0 z-10 gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* File Name & Type */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                {isImage ? (
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                ) : isPdf ? (
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                ) : (
                  <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-sm md:max-w-lg">
                  {attachment.name || 'Attached Document'}
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                  <span className="uppercase font-extrabold text-white/70 px-1.5 rounded bg-white/10">
                    {isImage ? 'IMAGE' : isPdf ? 'PDF' : 'DOC'}
                  </span>
                  {attachment.size && <span>• {attachment.size}</span>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Download Button */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#D8232A] hover:bg-red-700 active:scale-95 disabled:opacity-60 text-white font-bold text-[11px] sm:text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-red-500/25 select-none"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isDownloading ? 'Saving...' : 'Download'}
                </span>
              </button>

              {/* Open in New Tab (desktop only) */}
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                title="Open in new tab"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </motion.header>

          {/* Error Banner */}
          {downloadError && (
            <div className="bg-rose-900/80 px-4 py-2.5 flex items-center gap-2 text-rose-100 text-xs font-medium shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{downloadError}</span>
              <button onClick={() => setDownloadError(null)} className="ml-auto text-rose-300 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── VIEWER BODY ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {isImage ? (
              /* High-Res Image View */
              <div className="max-h-full max-w-full flex items-center justify-center">
                <img
                  src={attachment.url}
                  alt={attachment.name || 'Attachment Preview'}
                  className="max-h-[78vh] max-w-full w-auto rounded-xl sm:rounded-2xl object-contain shadow-2xl border border-white/10"
                />
              </div>
            ) : (
              /* PDF / Document Viewer — responsive full-height */
              <div className="w-full h-full max-w-4xl rounded-xl sm:rounded-2xl border border-white/15 overflow-hidden shadow-2xl bg-white flex flex-col">
                {/* Mobile PDF fallback banner */}
                <div className="bg-slate-800 px-4 py-2 flex items-center justify-between sm:hidden shrink-0">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Tap below to view or use Download
                  </span>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-[#D8232A] underline"
                  >
                    Open PDF
                  </a>
                </div>
                <iframe
                  src={`${attachment.url}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full flex-1 border-0 bg-white min-h-0"
                  title={attachment.name || 'PDF Document Viewer'}
                  style={{ minHeight: 0 }}
                />
              </div>
            )}
          </motion.div>

          {/* Mobile Bottom Bar: Download shortcut */}
          <div
            className="sm:hidden h-14 bg-slate-900/95 border-t border-white/10 flex items-center justify-between px-4 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
              {attachment.name || 'Attachment'}
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-[#D8232A] hover:bg-red-700 active:scale-95 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isDownloading ? 'Saving...' : 'Save File'}
            </button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AttachmentViewerModal;
