
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { DrawingState, Point, CanvasTransform, DrawingCanvasRef, ViewMode } from '../types';

interface DrawingCanvasProps {
  width: number;
  height: number;
  cursorPosition: Point | null; // Screen position
  isDrawing: boolean;
  drawingState: DrawingState;
  transform: CanvasTransform;
  clearTrigger: number;
  undoTrigger: number;
  redoTrigger: number;
  generatedImage: string | null;
  viewMode: ViewMode;
}

const MAX_HISTORY = 30;

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
  width,
  height,
  cursorPosition,
  isDrawing,
  drawingState,
  transform,
  clearTrigger,
  undoTrigger,
  redoTrigger,
  generatedImage,
  viewMode
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastLocalPoint, setLastLocalPoint] = useState<Point | null>(null);
  
  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = canvas.width;
      compositeCanvas.height = canvas.height;
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(canvas, 0, 0);

      return compositeCanvas.toDataURL('image/png');
    }
  }));
  
  const historyRef = useRef<ImageData[]>([]);
  const historyStepRef = useRef<number>(-1);
  const prevDrawingRef = useRef<boolean>(false);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      if (historyStepRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
      }
      historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }
      historyStepRef.current = historyRef.current.length - 1;
    }
  };

  const restoreHistory = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && historyRef.current[index]) {
      ctx.putImageData(historyRef.current[index], 0, 0);
      historyStepRef.current = index;
    }
  };

  useEffect(() => {
    if (undoTrigger > 0 && historyStepRef.current > 0) {
      restoreHistory(historyStepRef.current - 1);
    } else if (undoTrigger > 0 && historyStepRef.current === 0) {
       restoreHistory(0);
    }
  }, [undoTrigger]);

  useEffect(() => {
    if (redoTrigger > 0 && historyStepRef.current < historyRef.current.length - 1) {
      restoreHistory(historyStepRef.current + 1);
    }
  }, [redoTrigger]);

  useEffect(() => {
    if (clearTrigger > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
      }
    }
  }, [clearTrigger]);

  // Initial Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.width = width;
        canvas.height = height;
        saveToHistory();
    }
  }, [width, height]);

  // Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    if (prevDrawingRef.current && !isDrawing) {
       saveToHistory();
       setLastLocalPoint(null);
    }
    prevDrawingRef.current = isDrawing;

    if (isDrawing && cursorPosition) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const localPoint = {
        x: (cursorPosition.x - rect.left) * scaleX,
        y: (cursorPosition.y - rect.top) * scaleY
      };

      ctx.lineWidth = drawingState.lineWidth;
      ctx.strokeStyle = drawingState.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = drawingState.mode === 'erase' ? 'destination-out' : 'source-over';

      if (lastLocalPoint) {
        ctx.beginPath();
        ctx.moveTo(lastLocalPoint.x, lastLocalPoint.y);
        ctx.lineTo(localPoint.x, localPoint.y);
        ctx.stroke();
      }

      setLastLocalPoint(localPoint);
    } else {
      setLastLocalPoint(null);
    }
  }, [cursorPosition, isDrawing, drawingState, transform]);

  // Determine Image Opacity based on View Mode
  const getImageOpacity = () => {
    if (!generatedImage) return 0;
    if (viewMode === 'ai') return 1;
    if (viewMode === 'split') return 0.5; // 'Both' mode blends
    return 0; // 'Original' mode hides image
  };

  return (
    <div className="absolute inset-0 z-10 bg-gray-200 overflow-hidden flex items-center justify-center">
      {/* Container for Transform - Added flex-shrink-0 to prevent compression */}
      <div 
        className="origin-center will-change-transform shadow-2xl bg-white relative flex-shrink-0"
        style={{
          width: width,
          height: height,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
        }}
      >
        {/* The Drawing Canvas - Added max-w-none */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block touch-none z-10 max-w-none"
          style={{ width: '100%', height: '100%' }}
        />

        {/* The AI Generated Image Overlay - Synced exactly with canvas - Added max-w-none */}
        {generatedImage && (
          <div 
            className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-300"
            style={{ opacity: getImageOpacity() }}
          >
             <img 
               src={generatedImage} 
               alt="AI Result" 
               className="w-full h-full object-cover max-w-none"
               draggable={false}
             />
          </div>
        )}
      </div>
    </div>
  );
});

export default DrawingCanvas;
