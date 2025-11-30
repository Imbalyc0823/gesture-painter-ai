
import { HandLandmark, GestureType } from '../types';
import { calculateDistance } from './geometry';

/**
 * Checks if a finger is extended by comparing the distance of the tip and PIP joint from the wrist.
 * This is more robust than Y-coordinate checks as it works with different hand orientations.
 */
const isFingerExtended = (landmarks: HandLandmark[], fingerTipIdx: number, fingerPipIdx: number): boolean => {
  const wrist = landmarks[0];
  const tip = landmarks[fingerTipIdx];
  const pip = landmarks[fingerPipIdx];
  
  // If the tip is further from the wrist than the PIP joint, the finger is likely extended.
  return calculateDistance(wrist, tip) > calculateDistance(wrist, pip);
};

export const detectGesture = (landmarks: HandLandmark[], width: number, height: number): { type: GestureType, span: number } => {
  // Landmark Indices
  const THUMB_TIP = 4;
  const INDEX_TIP = 8;
  const INDEX_PIP = 6;
  const MIDDLE_TIP = 12;
  const MIDDLE_PIP = 10;
  const RING_TIP = 16;
  const RING_PIP = 14;
  const PINKY_TIP = 20;
  const PINKY_PIP = 18;

  // 0. Calculate Palm Scale
  // Distance from Wrist (0) to Middle Finger MCP (9) gives a good relative scale of the hand.
  const palmScale = calculateDistance(landmarks[0], landmarks[9]); 

  // 1. Check Finger Extensions
  const isIndexUp = isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP);
  const isMiddleUp = isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP);
  const isRingUp = isFingerExtended(landmarks, RING_TIP, RING_PIP);
  const isPinkyUp = isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP);

  // 2. Pinch Check (Draw)
  // Distance between Thumb Tip and Index Tip
  const pinchDist = calculateDistance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
  // Adaptive threshold: roughly 35-40% of the palm size
  const isPinching = pinchDist < (palmScale * 0.35);

  // 3. Gesture Priority Logic

  // PRIORITY 1: DRAW (Pinch)
  // If pinching, we interpret it as drawing regardless of other fingers (mostly).
  if (isPinching) {
    return { type: 'draw', span: 0 };
  }

  // PRIORITY 2: PAN (Strictly 3 Fingers: Index, Middle, Ring)
  // Pinky MUST be down.
  if (isIndexUp && isMiddleUp && isRingUp && !isPinkyUp) {
    return { type: 'pan', span: 0 };
  }

  // PRIORITY 3: ZOOM (Strictly 2 Fingers: Index, Middle)
  // Ring and Pinky MUST be down.
  if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
    const span = calculateDistance(landmarks[INDEX_TIP], landmarks[MIDDLE_TIP]);
    return { type: 'zoom', span };
  }

  // PRIORITY 4: HOVER (Strictly 1 Finger: Index)
  // Used for moving the cursor without drawing.
  if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
     return { type: 'hover', span: 0 };
  }

  // PRIORITY 5: IDLE
  // Triggers if 0 fingers, or 4+ fingers (e.g. open palm), or invalid combinations.
  // "3+ becomes idle" rule implies 4 or 5 fingers -> None.
  return { type: 'none', span: 0 };
};

export const isThumbsUpGesture = (landmarks: HandLandmark[]): boolean => {
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const thumbMCP = landmarks[2];
  
  const indexTip = landmarks[8];
  const indexPIP = landmarks[6];
  
  const middleTip = landmarks[12];
  const middlePIP = landmarks[10];
  
  const ringTip = landmarks[16];
  const ringPIP = landmarks[14];
  
  const pinkyTip = landmarks[20];
  const pinkyPIP = landmarks[18];

  // Thumbs up logic usually assumes upright hand, so Y-axis check is acceptable here
  const isThumbUp = (thumbTip.y < thumbIP.y) && (thumbIP.y < thumbMCP.y);

  const buffer = 0.02; 
  const indexCurled = indexTip.y > (indexPIP.y - buffer);
  const middleCurled = middleTip.y > (middlePIP.y - buffer);
  const ringCurled = ringTip.y > (ringPIP.y - buffer);
  const pinkyCurled = pinkyTip.y > (pinkyPIP.y - buffer);

  const isThumbHighest = thumbTip.y < indexTip.y && thumbTip.y < middleTip.y;

  return isThumbUp && indexCurled && middleCurled && ringCurled && pinkyCurled && isThumbHighest;
};
