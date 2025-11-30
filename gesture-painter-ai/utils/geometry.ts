
import { Point, HandLandmark } from '../types';

export const calculateDistance = (p1: Point | HandLandmark, p2: Point | HandLandmark): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const mapCoordinates = (
  landmark: HandLandmark | Point,
  containerWidth: number,
  containerHeight: number,
  margin: number = 0.15 
): Point => {
  let x = 1 - landmark.x;
  let y = landmark.y;

  if (margin > 0) {
    x = (x - margin) / (1 - 2 * margin);
    y = (y - margin) / (1 - 2 * margin);
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
  }

  return { 
    x: x * containerWidth, 
    y: y * containerHeight 
  };
};

export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

export const lerpPoint = (p1: Point, p2: Point, t: number): Point => {
  return {
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t),
  };
};

export const calculateAngle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

export const calculateMidpoint = (p1: Point, p2: Point): Point => {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
};
