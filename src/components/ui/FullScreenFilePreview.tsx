import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface FullScreenFilePreviewProps {
  url: string | null;
  fileName: string | null;
  fileType: string | null;
  onClose: () => void;
}

export default function FullScreenFilePreview({ url, fileName, fileType, onClose }: FullScreenFilePreviewProps) {
  if (!url) return null;

  const isImage = fileType?.startsWith('image/') || url.match(/\.(jpeg|jpg|gif|png)$/i) != null;
  const isPdf = fileType === 'application/pdf' || url.match(/\.pdf$/i) != null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col backdrop-blur-sm transition-opacity duration-300">
      <div className="flex items-center justify-between p-4 text-white shrink-0 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
          >
            <X size={24} />
          </button>
          <h3 className="font-medium text-lg truncate flex-1">{fileName || 'Document Preview'}</h3>
        </div>
        <div className="flex gap-2 shrink-0">
          <a 
            href={url} 
            download={fileName || 'Document'}
            className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:flex items-center justify-center text-white"
            title="Download"
          >
            <Download size={20} />
          </a>
          <a 
            href={url} 
            target="_blank" 
            rel="noreferrer" 
            className="p-2 hover:bg-white/10 rounded-full transition-colors border border-white/20 ml-2"
          >
            <ExternalLink size={20} />
          </a>
        </div>
      </div>

      <div className="flex-1 w-full flex items-center justify-center p-4 md:p-8 min-h-0 overflow-hidden">
        {isImage ? (
          <img 
            src={url} 
            alt={fileName || 'Preview'} 
            className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm"
          />
        ) : isPdf ? (
          <iframe 
            src={`${url}#toolbar=0`} 
            title={fileName || 'PDF Preview'}
            className="w-full h-full max-w-5xl bg-white rounded-lg shadow-2xl"
          />
        ) : (
          <div className="bg-white/10 p-8 rounded-xl text-white text-center w-full max-w-sm">
            <div className="mb-4">
              <Download size={48} className="mx-auto text-white/50" />
            </div>
            <h4 className="text-xl font-semibold mb-2">No Preview Available</h4>
            <p className="text-white/70 text-sm mb-6">This file type cannot be previewed inline.</p>
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-2 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-colors inline-block"
            >
              Open File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
