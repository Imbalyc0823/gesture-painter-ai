
import React from 'react';
import { ViewMode } from '../types';

interface AIOverlayProps {
  status: 'idle' | 'generating' | 'showing';
  generatedImage: string | null;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  onSave: () => void;
}

const AIOverlay: React.FC<AIOverlayProps> = ({ status, generatedImage, viewMode, onSetViewMode, onSave }) => {
  if (status === 'idle') return null;

  const getBackgroundClass = () => {
    if (status === 'showing') {
        // In 'showing' mode, we want to see the DrawingCanvas (which now holds the AI image).
        // So we make the overlay background transparent and allow click-through for Panning 
        // (but buttons need pointer-events-auto).
        return 'bg-transparent pointer-events-none';
    }
    // Loading state: Semi-transparent black blocker
    return 'bg-black/80 backdrop-blur-sm pointer-events-auto';
  };

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col items-center justify-center transition-colors duration-500 ${getBackgroundClass()}`}>
      
      {/* LOADING STATE */}
      {status === 'generating' && (
        <div className="text-center text-white space-y-4 animate-pulse pointer-events-auto">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-2xl font-bold tracking-wider">AI Magic in Progress...</h2>
          <p className="text-gray-300">Enhancing colors, lighting, and details</p>
          <div className="w-64 h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
             <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-[shimmer_2s_infinite]" style={{ width: '100%' }}/>
          </div>
        </div>
      )}

      {/* RESULT STATE - CONTROLS ONLY */}
      {status === 'showing' && generatedImage && (
        <>
          {/* Close Hint */}
          <div className="absolute top-10 right-10 text-white/70 text-sm font-mono bg-black/50 px-3 py-1 rounded-full z-[70] pointer-events-auto">
             Thumbs Up (3s) to Close
          </div>

          {/* Controls Container */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-[70] pointer-events-auto">
             
             {/* View Switcher */}
             <div className="flex items-center gap-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20 shadow-2xl">
                <button 
                  onClick={() => onSetViewMode('split')}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all pointer-events-auto ${viewMode === 'split' ? 'bg-white text-black shadow-lg' : 'text-white hover:bg-white/10'}`}
                >
                  Split / Both
                </button>
                <button 
                  onClick={() => onSetViewMode('original')}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all pointer-events-auto ${viewMode === 'original' ? 'bg-white text-black shadow-lg' : 'text-white hover:bg-white/10'}`}
                >
                  Original
                </button>
                <button 
                  onClick={() => onSetViewMode('ai')}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all pointer-events-auto ${viewMode === 'ai' ? 'bg-white text-black shadow-lg' : 'text-white hover:bg-white/10'}`}
                >
                  AI Art
                </button>
             </div>

             {/* Save Button */}
             <button 
                onClick={onSave}
                className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-500 shadow-xl border border-white/20 transition-transform hover:scale-105 active:scale-95 pointer-events-auto flex items-center justify-center"
                title="Save Image"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
             </button>

          </div>
        </>
      )}
    </div>
  );
};

export default AIOverlay;
