
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import GestureCamera from './components/GestureCamera';
import DrawingCanvas from './components/DrawingCanvas';
import Toolbar from './components/Toolbar';
import CursorOverlay from './components/CursorOverlay';
import AIOverlay from './components/AIOverlay';
import ThumbsUpFeedback from './components/ThumbsUpFeedback';
import { DrawingState, Point, HandData, CanvasTransform, DrawingCanvasRef, AIStatus, ViewMode } from './types';
import { mapCoordinates, lerpPoint, lerp } from './utils/geometry';
import { generateWithSiliconFlow } from './utils/siliconflow';
const FIXED_WIDTH = 1248;
const FIXED_HEIGHT = 832;

const App: React.FC = () => {
  const [drawingState, setDrawingState] = useState<DrawingState>({ color: '#000000', lineWidth: 8, mode: 'draw' });
  
  // Initialize scale to 1.0 (Fixed resolution).
  // The user wants strict 1632x640 size. No initial fitting.
  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1 });
  
  // Use fixed size for canvas. This will be passed to DrawingCanvas which is strictly 1632x640px.
  const [canvasSize] = useState<{ width: number, height: number }>({
    width: FIXED_WIDTH,
    height: FIXED_HEIGHT
  });
  
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('ai');
  
  const [cursor, setCursor] = useState<Point | null>(null);
  const [gestureType, setGestureType] = useState<HandData['gesture']>('none');
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);

  const [thumbsUpProgress, setThumbsUpProgress] = useState(0);
  const [thumbsUpPos, setThumbsUpPos] = useState<Point | null>(null);

  const [clearTrigger, setClearTrigger] = useState(0);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);

  // Refs for State Machine
  const prevCursorRef = useRef<Point | null>(null);
  
  const panStartRef = useRef<Point | null>(null);
  const prevPanRef = useRef<Point | null>(null);
  
  const prevZoomSpanRef = useRef<number | null>(null);
  
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null);

  const handleSave = async () => {
    if (!generatedImage && viewMode === 'ai') return;
    try {
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let finalDataUrl = '';

      if (viewMode === 'ai' && generatedImage) {
        finalDataUrl = generatedImage;
        link.download = `gesture-painter-ai-${timestamp}.png`;
      } 
      else if (viewMode === 'original') {
        const snapshot = drawingCanvasRef.current?.getSnapshot();
        if (snapshot) {
            finalDataUrl = snapshot;
            link.download = `gesture-painter-sketch-${timestamp}.png`;
        }
      } 
      else if (viewMode === 'split') {
        const snapshot = drawingCanvasRef.current?.getSnapshot();
        if (snapshot && generatedImage) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const imgOriginal = new Image();
            const imgAI = new Image();
            await Promise.all([
                new Promise((resolve) => { imgOriginal.onload = resolve; imgOriginal.src = snapshot; }),
                new Promise((resolve) => { imgAI.onload = resolve; imgAI.src = generatedImage; })
            ]);
            canvas.width = imgOriginal.width;
            canvas.height = imgOriginal.height;
            if (ctx) {
                ctx.drawImage(imgOriginal, 0, 0);
                ctx.globalAlpha = 0.5;
                ctx.drawImage(imgAI, 0, 0);
                finalDataUrl = canvas.toDataURL('image/png');
                link.download = `gesture-painter-merged-${timestamp}.png`;
            }
        }
      }
      if (finalDataUrl) {
        link.href = finalDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleThumbsUp = async () => {
    if (aiStatus === 'generating' || aiStatus === 'counting') return;
  
    // 1. 进入生成状态
    setAiStatus('generating');
  
    try {
      // 2. 获取当前画布快照（纯白底 + 用户手绘）
      const snapshot = drawingCanvasRef.current?.getSnapshot();
      if (!snapshot) throw new Error('无法获取画布快照');
  
      // 3. 把 dataURL 转成纯 base64（去掉前缀）
      const base64 = snapshot.replace(/^data:image\/(png|jpeg);base64,/, '');
  
      // 4. 调用 SiliconFlow
      const imageUrl = await generateWithSiliconFlow(base64);
  
      // 5. 生成成功 → 直接使用返回的 URL 作为 <img src>
      setGeneratedImage(imageUrl);
      setAiStatus('showing');
      setViewMode('ai'); // 默认展示 AI 结果
    } catch (err: any) {
      console.error('SiliconFlow 生成失败:', err);
      // 出错后回到 idle（也可以加个错误提示 UI）
      setAiStatus('idle');
      setGeneratedImage(null);
      alert('AI 生成失败：' + err.message);
    }
  };

  const handleHandUpdate = useCallback((hand: HandData | null) => {
    // Block updates completely during generation
    if (aiStatus === 'generating') return;

    if (!hand) {
      setCursor(null);
      setGestureType('none');
      prevCursorRef.current = null;
      prevPanRef.current = null;
      prevZoomSpanRef.current = null;
      return;
    }

    // Cursor Smoothing
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Map raw hand cursor (0-1 approx from Camera) to screen
    const rawCursor = mapCoordinates(hand.cursor, width, height, 0.15);
    const smoothCursor = prevCursorRef.current ? lerpPoint(prevCursorRef.current, rawCursor, 0.6) : rawCursor;
    prevCursorRef.current = smoothCursor;
    setCursor(smoothCursor);
    setGestureType(hand.gesture);

    // --- STATE MACHINE ---
    
    // 1. PAN (3 Fingers)
    // Allowed in both IDLE and SHOWING modes to navigate the fixed-size canvas
    if (hand.gesture === 'pan') {
      // Map pan center to screen
      const panCenter = mapCoordinates(hand.panCenter, width, height, 0.15);
      
      if (!prevPanRef.current) {
        prevPanRef.current = panCenter;
      } else {
        const deltaX = panCenter.x - prevPanRef.current.x;
        const deltaY = panCenter.y - prevPanRef.current.y;
        
        setTransform(prev => ({
          ...prev,
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        
        prevPanRef.current = panCenter;
      }
    } else {
      prevPanRef.current = null;
    }

    // 2. ZOOM (2 Fingers)
    // ONLY allowed in IDLE mode. Disabled in SHOWING mode ("no longer scalable").
    if (hand.gesture === 'zoom' && aiStatus === 'idle') {
      // Smooth the raw input span to prevent jitter (Low pass filter)
      const smoothedInputSpan = prevZoomSpanRef.current 
        ? lerp(prevZoomSpanRef.current, hand.zoomSpan, 0.15) 
        : hand.zoomSpan;

      if (prevZoomSpanRef.current !== null) {
        const ratio = smoothedInputSpan / Math.max(prevZoomSpanRef.current, 0.001);
        
        // Significantly reduced sensitivity (0.1) for slower, more controlled zoom
        const sensitivity = 0.3;
        const dampedRatio = 1 + (ratio - 1) * sensitivity;
        
        setTransform(prev => {
            const newScale = Math.max(0.2, Math.min(prev.scale * dampedRatio, 5.0));
            return {
                ...prev,
                scale: newScale
            };
        });
      }
      
      prevZoomSpanRef.current = smoothedInputSpan;
    } else {
      prevZoomSpanRef.current = null;
    }

    // 3. DRAW (Pinch) -> handled via isDrawing prop in Canvas + Cursor position

  }, [aiStatus]);

  const handleThumbsUpUpdate = useCallback((progress: number, pos: Point | null) => {
     setThumbsUpProgress(progress);
     if (pos && progress > 0) {
         const screenPos = mapCoordinates(pos, window.innerWidth, window.innerHeight, 0.15);
         setThumbsUpPos(screenPos);
     } else {
         setThumbsUpPos(null);
     }
  }, []);

  // UI Click Handling via Pinch (when overlay is active)
  const prevGestureRef = useRef('none');
  useEffect(() => {
    if (aiStatus === 'showing' && gestureType === 'draw' && prevGestureRef.current !== 'draw' && cursor) {
        const element = document.elementFromPoint(cursor.x, cursor.y) as HTMLElement;
        if (element) {
            const clickable = element.closest('button, [data-clickable="true"]');
            if (clickable instanceof HTMLElement) {
                clickable.click();
            }
        }
    }
    prevGestureRef.current = gestureType;
  }, [gestureType, cursor, aiStatus]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50 select-none">
      
      <DrawingCanvas 
        ref={drawingCanvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        cursorPosition={cursor} 
        // Only draw if: Gesture is Draw AND AI is Idle AND NOT hovering toolbar
        isDrawing={gestureType === 'draw' && aiStatus === 'idle' && !isToolbarHovered}
        drawingState={drawingState}
        transform={transform}
        clearTrigger={clearTrigger}
        undoTrigger={undoTrigger}
        redoTrigger={redoTrigger}
        generatedImage={generatedImage}
        viewMode={viewMode}
      />

      <div className={`transition-opacity duration-300 ${aiStatus === 'idle' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <Toolbar 
          drawingState={drawingState}
          setDrawingState={setDrawingState}
          onClear={() => setClearTrigger(p => p + 1)}
          onUndo={() => setUndoTrigger(p => p + 1)}
          onRedo={() => setRedoTrigger(p => p + 1)}
          cursorPosition={cursor}
          gesture={gestureType}
          onHoverChange={setIsToolbarHovered}
        />
      </div>

      <GestureCamera 
        onHandUpdate={handleHandUpdate}
        onThumbsUpTrigger={handleThumbsUp}
        onThumbsUpUpdate={handleThumbsUpUpdate}
        aiProcessing={aiStatus === 'generating'} 
      />

      {(aiStatus === 'idle' || aiStatus === 'showing') && thumbsUpProgress === 0 && (
        <CursorOverlay cursor={cursor} gesture={gestureType} />
      )}

      <ThumbsUpFeedback 
        position={thumbsUpPos} 
        progress={thumbsUpProgress}
        label={aiStatus === 'showing' ? "Closing..." : "Generating..."}
      />

      <AIOverlay 
        status={aiStatus} 
        generatedImage={generatedImage} 
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        onSave={handleSave}
      />

      {aiStatus === 'idle' && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none opacity-60">
          <div className="bg-black/70 text-white p-3 rounded-xl backdrop-blur-sm text-xs space-y-1">
            <p><strong className="text-blue-400">Pinch:</strong> Draw</p>
            <p><strong className="text-yellow-400">3 Fingers:</strong> Pan</p>
            <p><strong className="text-orange-400">2 Fingers:</strong> Zoom</p>
            <p><strong className="text-green-400">Thumbs Up (3s):</strong> AI</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
