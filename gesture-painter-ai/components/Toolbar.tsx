
import React, { useEffect, useRef, useState } from 'react';
import { DrawingState, Point, GestureType } from '../types';

interface ToolbarProps {
  drawingState: DrawingState;
  setDrawingState: React.Dispatch<React.SetStateAction<DrawingState>>;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  cursorPosition: Point | null;
  gesture: GestureType;
  onHoverChange: (isHovered: boolean) => void;
}

const COLORS = [
  '#000000', '#EF4444', '#22C55E', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'
];

const Toolbar: React.FC<ToolbarProps> = ({
  drawingState,
  setDrawingState,
  onClear,
  onUndo,
  onRedo,
  cursorPosition,
  gesture,
  onHoverChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  const wasClickingRef = useRef(false);
  const lastClickTime = useRef(0);

  // Hover detection
  useEffect(() => {
    if (!containerRef.current || !cursorPosition || !isVisible) {
      onHoverChange(false);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const isOver = 
      cursorPosition.x >= rect.left && 
      cursorPosition.x <= rect.right && 
      cursorPosition.y >= rect.top && 
      cursorPosition.y <= rect.bottom;
    
    onHoverChange(isOver);
  }, [cursorPosition, isVisible, onHoverChange]);

  useEffect(() => {
    if (!isVisible || !cursorPosition || !containerRef.current) {
      wasClickingRef.current = (gesture === 'draw');
      return;
    }

    const element = document.elementFromPoint(cursorPosition.x, cursorPosition.y) as HTMLElement | null;
    const isClicking = (gesture === 'draw'); // Use pinch 'draw' as click interaction for UI
    
    if (isClicking) {
      // SLIDER
      if (element && element === sliderRef.current) {
        const rect = sliderRef.current.getBoundingClientRect();
        const percent = Math.min(Math.max((cursorPosition.x - rect.left) / rect.width, 0), 1);
        const newValue = Math.round(percent * 49 + 1);
        setDrawingState(prev => ({ ...prev, lineWidth: newValue }));
      }

      // BUTTONS
      if (!wasClickingRef.current) {
        const now = Date.now();
        if (now - lastClickTime.current > 400) {
          if (element) {
            const target = element.closest('[data-action], [data-color]') as HTMLElement;
            
            if (target) {
                if (target.dataset.color) {
                    setDrawingState(prev => ({ ...prev, color: target.dataset.color!, mode: 'draw' }));
                    lastClickTime.current = now;
                } else {
                    const action = target.dataset.action;
                    if (action === 'erase') setDrawingState(prev => ({ ...prev, mode: 'erase' }));
                    if (action === 'draw') setDrawingState(prev => ({ ...prev, mode: 'draw' }));
                    if (action === 'clear') onClear();
                    if (action === 'undo') onUndo();
                    if (action === 'redo') onRedo();
                    lastClickTime.current = now;
                }
            }
          }
        }
      }
    }
    wasClickingRef.current = isClicking;
  }, [cursorPosition, gesture, isVisible, setDrawingState, onClear, onUndo, onRedo]);

  return (
    <>
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-40 p-3 bg-white/90 backdrop-blur shadow-lg rounded-full border border-gray-200 hover:bg-gray-50 transition-all"
        data-clickable="true"
      >
        {isVisible ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
        ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </button>

      <div 
        ref={containerRef}
        className={`absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 flex flex-col items-center justify-center px-4 pb-8 pt-4 rounded-t-3xl border-t border-gray-200 transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ height: '180px' }}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-4 opacity-50" />
        
        <div className="flex w-full max-w-5xl items-center justify-between gap-6">
          <div className="flex flex-col gap-2 items-center">
            <div className="flex gap-2">
              <button data-action="draw" data-clickable="true" className={`p-3 rounded-xl transition-all ${drawingState.mode === 'draw' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600'}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
              <button data-action="erase" data-clickable="true" className={`p-3 rounded-xl transition-all ${drawingState.mode === 'erase' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button data-action="undo" data-clickable="true" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
              </button>
              <button data-action="redo" data-clickable="true" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
              </button>
              <button data-action="clear" data-clickable="true" className="px-3 py-2 text-xs font-bold text-red-500 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100">CLR</button>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2 items-center justify-center px-4">
            <div className="flex items-center gap-4 w-full">
              <span className="text-xs font-bold text-gray-400">THIN</span>
              <input ref={sliderRef} type="range" min="1" max="50" value={drawingState.lineWidth} readOnly className="w-full h-8 cursor-pointer" />
              <span className="text-xs font-bold text-gray-400">THICK</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 text-right">{drawingState.lineWidth}px</span>
              <div 
                className="rounded-full border border-gray-300 shadow-sm"
                style={{
                  width: drawingState.lineWidth,
                  height: drawingState.lineWidth,
                  backgroundColor: drawingState.mode === 'erase' ? '#fff' : drawingState.color,
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  data-color={color}
                  data-clickable="true"
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${drawingState.color === color && drawingState.mode === 'draw' ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Toolbar;
