import React from 'react';
import { Point } from '../types';

interface ThumbsUpFeedbackProps {
  position: Point | null;
  progress: number; // 0 to 1
  label: string;
}

const ThumbsUpFeedback: React.FC<ThumbsUpFeedbackProps> = ({ position, progress, label }) => {
  if (!position || progress <= 0.05) return null;

  const size = 160; // Increased size
  const radius = 60; // Increased radius
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div 
      className="fixed pointer-events-none z-[80] flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ease-out"
      style={{ left: position.x, top: position.y }}
    >
      <div className="relative flex items-center justify-center drop-shadow-2xl">
        {/* SVG Ring */}
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="rgba(0,0,0,0.8)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="10"
          />
          {/* Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progress >= 1 ? "#22c55e" : "#3b82f6"} // Green or Blue
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75 ease-linear"
          />
        </svg>
        
        {/* Countdown / Icon */}
        <div className="absolute inset-0 flex items-center justify-center text-white font-black text-5xl">
          {progress >= 1 ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
             Math.ceil(3 * (1 - progress))
          )}
        </div>
      </div>

      {/* Replaced Text Label */}
      <div className="mt-6 px-6 py-3 bg-blue-600 text-white font-bold text-xl rounded-full shadow-xl border-2 border-white/30 tracking-wider whitespace-nowrap animate-bounce">
        {label}
      </div>
    </div>
  );
};

export default ThumbsUpFeedback;