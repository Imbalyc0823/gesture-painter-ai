
export interface Point {
  x: number;
  y: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type BrushMode = 'draw' | 'erase';

export interface DrawingState {
  color: string;
  lineWidth: number;
  mode: BrushMode;
}

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
  // Rotation removed
}

export type GestureType = 'none' | 'hover' | 'draw' | 'zoom' | 'pan';

export interface HandData {
  gesture: GestureType;
  cursor: Point;      // Screen coordinates for drawing/cursor
  panCenter: Point;   // Screen coordinates for panning
  zoomSpan: number;   // Distance for zooming
}

export type AIStatus = 'idle' | 'counting' | 'generating' | 'showing';

export type ViewMode = 'original' | 'split' | 'ai';

export interface DrawingCanvasRef {
  getSnapshot: () => string | null; // Returns Base64 data URL
}

// MediaPipe Type Definitions
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}
