import React, { useState } from 'react';
import { SceneHistoryItem } from '../types';

interface SceneResultsProps {
    currentImage: string | null;
    history: SceneHistoryItem[];
    isGenerating: boolean;
    onSelectHistory: (item: SceneHistoryItem) => void;
    aspectRatio: string;
}

const SceneResults: React.FC<SceneResultsProps> = ({ currentImage, history, isGenerating, onSelectHistory, aspectRatio }) => {
    const [showPrompt, setShowPrompt] = useState(false);
    const currentHistoryItem = history.find(h => h.imageUrl === currentImage);

    // Helper to determine container aspect ratio class
    const getAspectClass = () => {
        if (aspectRatio === '9:16') return 'aspect-[9/16] max-w-sm';
        if (aspectRatio === '16:9') return 'aspect-video w-full';
        return 'aspect-square max-w-2xl'; // 1:1
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-gray-50/50 p-4 lg:p-8 pb-32">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Scene Result</h2>
                    {history.length > 0 && (
                        <div className="text-[10px] font-bold text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm uppercase tracking-widest">
                            {history.length} Assets
                        </div>
                    )}
                </div>

                {/* Main Preview Stage */}
                <div className="flex justify-center">
                    <div className={`relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group transition-all duration-500 ${getAspectClass()} ${!currentImage && 'w-full h-96'}`}>

                        {/* Loading State */}
                        {isGenerating && (
                            <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <span className="text-xs font-bold text-indigo-600 tracking-widest animate-pulse">RENDERING SCENE...</span>
                            </div>
                        )}

                        {/* Image Display */}
                        {currentImage ? (
                            <>
                                <img src={currentImage} alt="Scene Result" className="w-full h-full object-contain bg-gray-100" />

                                {/* Overlay Actions */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between">
                                    <button
                                        onClick={() => setShowPrompt(!showPrompt)}
                                        className="text-white/80 hover:text-white text-xs font-medium bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-md transition-colors"
                                    >
                                        {showPrompt ? 'Hide Info' : 'Show Prompt'}
                                    </button>
                                    <a
                                        href={currentImage}
                                        download={`scene-${Date.now()}.png`}
                                        className="bg-white text-gray-900 px-5 py-2 rounded-full text-xs font-black shadow-lg hover:scale-105 transition-transform"
                                    >
                                        DOWNLOAD
                                    </a>
                                </div>

                                {/* Prompt Overlay */}
                                {showPrompt && currentHistoryItem && (
                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-10 p-8 flex flex-col items-center justify-center text-center animate-fade-in" onClick={() => setShowPrompt(false)}>
                                        <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4">Generation Prompt</h4>
                                        <p className="text-sm text-gray-100 font-mono leading-relaxed max-w-2xl overflow-y-auto max-h-[80%] custom-scrollbar">
                                            {currentHistoryItem.prompt}
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-4">
                                <span className="text-6xl opacity-20">🏝️</span>
                                <p className="text-xs font-bold uppercase tracking-widest">No Scene Generated Yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* History Grid */}
                {history.length > 0 && (
                    <div className="pt-8 border-t border-gray-200">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Assets</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onSelectHistory(item)}
                                    className={`aspect-auto min-h-[80px] max-h-[150px] rounded-xl overflow-hidden cursor-pointer border-2 transition-all group relative ${currentImage === item.imageUrl ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent hover:border-indigo-300'}`}
                                >
                                    <img src={item.imageUrl} alt="History" className="w-full h-full object-contain bg-gray-100" loading="lazy" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SceneResults;