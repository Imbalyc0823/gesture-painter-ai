
import React from 'react';
import { Point, GestureType } from '../types';

interface CursorOverlayProps {
  cursor: Point | null;
  gesture: GestureType;
}

const CursorOverlay: React.FC<CursorOverlayProps> = ({ cursor, gesture }) => {
  if (!cursor) return null;

  let colorClass = 'bg-gray-400 border-gray-400';
  let label = 'IDLE';
  let scale = 'scale-100';

  switch (gesture) {
    case 'draw':
      colorClass = 'bg-blue-600 border-blue-600';
      label = 'DRAW';
      scale = 'scale-90';
      break;
    case 'zoom':
      colorClass = 'bg-orange-500 border-orange-500';
      label = 'ZOOM';
      break;
    case 'pan':
      colorClass = 'bg-yellow-400 border-yellow-400';
      label = 'PAN';
      break;
    case 'hover':
      colorClass = 'bg-gray-500 border-white';
      label = 'MOVE';
      break;
    case 'none':
    default:
      colorClass = 'bg-gray-300 border-white opacity-50';
      label = 'IDLE';
      break;
  }

  return (
    <div
      className="fixed pointer-events-none z-[100] flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out"
      style={{ left: cursor.x, top: cursor.y }}
    >
      <div 
        className={`rounded-full border-2 transition-all duration-200 w-6 h-6 opacity-80 ${colorClass} ${scale}`} 
      />
      <div className="absolute rounded-full w-1 h-1 bg-white" />
      <span className={`absolute top-full mt-2 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded shadow-sm bg-black text-white`}>
        {label}
      </span>
    </div>
  );
};

export default CursorOverlay;
