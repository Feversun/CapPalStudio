import React from 'react';
import { Sticker } from '../types';

interface StickerCardProps {
  sticker: Sticker;
  onClick?: (sticker: Sticker) => void;
  onRegenerate?: (sticker: Sticker) => void;
}

const StickerCard: React.FC<StickerCardProps> = ({ sticker, onClick, onRegenerate }) => {
  const isCompleted = sticker.status === 'completed';
  const isGenerating = sticker.status === 'generating';
  const isFailed = sticker.status === 'failed';

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sticker.imageUrl) return;

    const fileName = `sticker-${sticker.emotion.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;

    try {
      const response = await fetch(sticker.imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.warn("Download failed", error);
      window.open(sticker.imageUrl, '_blank');
    }
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRegenerate) {
      onRegenerate(sticker);
    }
  }

  return (
    <div
      className={`
        relative aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 group
        ${isCompleted ? 'cursor-pointer hover:scale-[1.02]' : ''}
      `}
      onClick={() => isCompleted && onClick && onClick(sticker)}
    >
      {/* Emotion Label */}
      <div className="absolute top-2 left-2 z-10">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-900/60 backdrop-blur-sm rounded-full text-white text-xs font-medium">
          <span>{sticker.emoji}</span>
          <span>{sticker.emotion}</span>
        </div>
      </div>

      {/* Actions (Only visible on hover/completed) */}
      {isCompleted && (
        <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleRegenerate}
            className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 shadow-sm hover:text-indigo-600 transition-colors"
            title="Regenerate"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 shadow-sm hover:text-indigo-600 transition-colors"
            title="Download Image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="w-full h-full flex items-center justify-center p-4">
        {isCompleted && sticker.imageUrl ? (
          <img
            src={sticker.imageUrl}
            alt={`${sticker.emotion} sticker`}
            className="w-full h-full object-contain animate-fade-in drop-shadow-xl"
            loading="lazy"
          />
        ) : isGenerating ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-xs text-gray-400 font-medium">Generating...</span>
          </div>
        ) : isFailed ? (
          <div className="flex flex-col items-center gap-2 text-center p-2">
            <span className="text-2xl">⚠️</span>
            <span className="text-xs text-red-400 font-medium">Failed</span>
            <button
              onClick={handleRegenerate}
              className="text-[10px] bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <span className="text-gray-300 text-xs">Waiting...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StickerCard;