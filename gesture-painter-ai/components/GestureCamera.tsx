
import React, { useEffect, useRef, useState } from 'react';
import { HandData, Point, GestureType } from '../types';
import { mapCoordinates } from '../utils/geometry';
import { isThumbsUpGesture, detectGesture } from '../utils/gesture';

interface GestureCameraProps {
  onHandUpdate: (hand: HandData | null) => void;
  onThumbsUpTrigger: () => void;
  onThumbsUpUpdate: (progress: number, thumbPosition: Point | null) => void;
  aiProcessing: boolean;
}

const GestureCamera: React.FC<GestureCameraProps> = ({ 
  onHandUpdate, 
  onThumbsUpTrigger,
  onThumbsUpUpdate,
  aiProcessing
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const thumbsUpTimerRef = useRef<number>(0);
  const THUMBS_UP_DURATION = 3000;
  const lastFrameTimeRef = useRef<number>(0);

  const propsRef = useRef({ onHandUpdate, onThumbsUpTrigger, onThumbsUpUpdate, aiProcessing });

  useEffect(() => {
    propsRef.current = { onHandUpdate, onThumbsUpTrigger, onThumbsUpUpdate, aiProcessing };
  }, [onHandUpdate, onThumbsUpTrigger, onThumbsUpUpdate, aiProcessing]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    if (!videoElement || !canvasElement) return;

    let hands: any;
    let camera: any;
    let isActive = true;

    const onResults = (results: any) => {
      if (!isActive) return;
      setIsLoaded(true);

      const now = Date.now();
      const deltaTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      const { onHandUpdate, onThumbsUpTrigger, onThumbsUpUpdate, aiProcessing } = propsRef.current;

      const ctx = canvasElement.getContext('2d');
      if (!ctx) return;

      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      const width = canvasElement.width;
      const height = canvasElement.height;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      let processedHand: HandData | null = null;
      let thumbsUpDetected = false;
      let thumbsUpThumbPos: Point | null = null;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Just take the first detected hand
        const landmarks = results.multiHandLandmarks[0];
        
        if (!aiProcessing) {
          // 1. Thumbs Up Check
          if (isThumbsUpGesture(landmarks)) {
            thumbsUpDetected = true;
            thumbsUpThumbPos = { x: landmarks[4].x, y: landmarks[4].y };
            
            // Draw skeleton
            if (window.drawConnectors) {
                window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
            }
          } else {
            // 2. Gesture Logic
            const { type, span } = detectGesture(landmarks, width, height);
            
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const ringTip = landmarks[16];

            // --- DATA FOR APP (Normalized 0-1) ---
            // We pass the raw normalized landmarks to the App.
            // The App handles the mirroring (1-x) and scaling to screen size via its own mapCoordinates call.
            
            // Centroid for Panning (Index+Middle+Ring)
            const cX = (indexTip.x + middleTip.x + ringTip.x) / 3;
            const cY = (indexTip.y + middleTip.y + ringTip.y) / 3;

            processedHand = {
                gesture: type,
                cursor: { x: indexTip.x, y: indexTip.y }, // Keep normalized!
                panCenter: { x: cX, y: cY },              // Keep normalized!
                zoomSpan: span,
            };

            // --- VISUALIZATION (Pixel Coordinates) ---
            // For drawing on this small camera canvas, we map to pixels.
            // Since the canvas itself is mirrored via CSS (scale-x-100), and the normalized 
            // coordinate x=0 starts from the left of the image data, we draw directly at x * width.
            // This ensures that a hand on the left of the stream (which is physically Right) 
            // draws on the left of the canvas internal, which flips to the Right visually.
            const visualIndex = { x: indexTip.x * width, y: indexTip.y * height };

            // Visuals
            let color = '#FFFFFF';
            if (type === 'pan') color = '#FFFF00'; // Yellow
            if (type === 'zoom') color = '#FFA500'; // Orange
            if (type === 'draw') color = '#0000FF'; // Blue
            if (type === 'hover') color = '#AAAAAA'; // Gray
            if (type === 'none') color = '#FF4444'; // Red (Idle)

            if (window.drawConnectors) {
                window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: color, lineWidth: 2 });
            }
            
            // Draw Tip
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(visualIndex.x, visualIndex.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw Label
            ctx.font = "bold 24px Arial";
            ctx.fillStyle = color;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            const label = type === 'none' ? 'IDLE' : type.toUpperCase();
            ctx.strokeText(label, visualIndex.x + 15, visualIndex.y);
            ctx.fillText(label, visualIndex.x + 15, visualIndex.y);
          }
        }
      }

      // Thumbs Up Logic
      if (thumbsUpDetected && !aiProcessing) {
        thumbsUpTimerRef.current += deltaTime;
        const progress = Math.min(thumbsUpTimerRef.current / THUMBS_UP_DURATION, 1);
        onThumbsUpUpdate(progress, thumbsUpThumbPos);
        if (thumbsUpTimerRef.current >= THUMBS_UP_DURATION) {
           onThumbsUpTrigger();
           thumbsUpTimerRef.current = 0;
        }
      } else {
        thumbsUpTimerRef.current = 0;
        onThumbsUpUpdate(0, null);
      }

      ctx.restore();
      onHandUpdate(processedHand);
    };

    const initializeMediaPipe = async () => {
      try {
        if (!window.Hands) throw new Error("MediaPipe Hands not loaded.");
        hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 1, // Strict single hand
          modelComplexity: 1,
          minDetectionConfidence: 0.6, // Higher confidence for better gesture stability
          minTrackingConfidence: 0.6,
        });
        hands.onResults(onResults);

        if (window.Camera) {
          camera = new window.Camera(videoElement, {
            onFrame: async () => {
              if (isActive && hands) await hands.send({ image: videoElement });
            },
            width: 640,
            height: 480,
          });
          if (isActive) await camera.start();
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      }
    };

    initializeMediaPipe();

    return () => {
      isActive = false;
      if (camera) try { camera.stop(); } catch(e) {}
      if (hands) try { hands.close(); } catch(e) {}
    };
  }, []);

  return (
    // 直接替换成下面这整段：
    <div className="fixed top-6 right-6 z-50 rounded-xl overflow-hidden shadow-2xl border-4 border-white/80 bg-black w-48 h-36">
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold bg-black/70">
          Loading Hand AI...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 bg-black text-sm p-4 text-center">
          {error}
        </div>
      )}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
      />
    </div>
  );
};

export default GestureCamera;
