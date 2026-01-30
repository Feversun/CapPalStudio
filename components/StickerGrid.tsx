
import React, { useState } from 'react';
import { Sticker } from '../types';
import StickerCard from './StickerCard';

interface StickerGridProps {
  stickers: Sticker[];
  progress: { current: number; total: number };
  onRegenerate?: (sticker: Sticker) => void;
  finalPrompt?: string;
}

const StickerGrid: React.FC<StickerGridProps> = ({ stickers, progress, onRegenerate, finalPrompt }) => {
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);

  const closeLightbox = () => setSelectedSticker(null);

  const handleDownloadOrShare = async (e: React.MouseEvent, sticker: Sticker) => {
    e.stopPropagation();
    if (!sticker.imageUrl) return;

    const fileName = `sticker-${sticker.emotion.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;

    try {
      // Convert base64/URL to Blob
      const response = await fetch(sticker.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      // Try Native Share API (Mobile - "Save Image" option in iOS)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'StickerGen Asset',
        });
        return;
      }

      // Desktop: Convert Blob to Object URL for proper download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);

    } catch (error) {
      console.warn("Download failed", error);
      // Fallback: Open in new tab for manual save
      window.open(sticker.imageUrl, '_blank');
    }
  };

  const handleRegenerate = (e: React.MouseEvent, sticker: Sticker) => {
    e.stopPropagation();
    if (onRegenerate) onRegenerate(sticker);
    closeLightbox();
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-50/50 p-4 lg:p-8 pb-32">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Result Pack</h2>
          <div className="text-[10px] font-bold text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm uppercase tracking-widest">
            {progress.current} / {progress.total}
          </div>
        </div>

        {/* Stickers Grid */}
        {stickers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-3xl mb-4 flex items-center justify-center text-4xl opacity-30">🐶</div>
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Waiting for items...</h3>
            <p className="text-[10px] text-gray-400 max-w-[180px] mt-1 font-medium">Upload a character photo to start generating sticker packs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stickers.map((sticker) => (
              <StickerCard
                key={sticker.id}
                sticker={sticker}
                onClick={(s) => setSelectedSticker(s)}
                onRegenerate={onRegenerate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedSticker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 lg:p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={closeLightbox}></div>
          <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row z-10 animate-scale-in">
            <button onClick={closeLightbox} className="absolute top-4 right-4 z-[70] p-2 bg-black/20 text-white rounded-full lg:hidden"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="flex-1 bg-gray-100 flex items-center justify-center p-6 relative min-h-[300px]"><div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>{selectedSticker.imageUrl && <img src={selectedSticker.imageUrl} className="max-w-full max-h-full object-contain drop-shadow-2xl" />}</div>

            {/* Fixed Sidebar Structure for Scrolling */}
            <div className="w-full lg:w-[400px] bg-white flex flex-col h-full relative overflow-hidden">
              <button onClick={closeLightbox} className="absolute top-4 right-4 text-gray-300 hover:text-gray-600 hidden lg:block"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>

              {/* Fixed Header */}
              <div className="p-6 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                <span className="text-3xl">{selectedSticker.emoji}</span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight uppercase tracking-tight">{selectedSticker.emotion}</h3>
                  <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">{selectedSticker.status}</span>
                </div>
              </div>

              {/* Scrollable Content (Prompt) */}
              <div className="flex-1 p-6 bg-gray-50/50 overflow-y-auto custom-scrollbar min-h-0">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Sticker Prompt</label>
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-[11px] leading-relaxed text-gray-500 font-mono whitespace-pre-wrap break-words">{selectedSticker.finalPrompt || "No prompt details."}</p>
                  </div>
                </div>
              </div>

              {/* Fixed Footer Actions - Compact Icons */}
              <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3 flex-shrink-0 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] justify-center">
                <button
                  onClick={(e) => handleRegenerate(e, selectedSticker)}
                  className="flex-1 flex flex-col items-center gap-1 p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all group"
                  title="Regenerate"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Retry</span>
                </button>

                {selectedSticker.imageUrl && (
                  <button
                    onClick={(e) => handleDownloadOrShare(e, selectedSticker)}
                    className="flex-1 flex flex-col items-center gap-1 p-3 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-2xl transition-all group"
                    title="Save / Share"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider">Save</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickerGrid;
