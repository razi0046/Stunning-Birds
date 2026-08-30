import React from 'react';
import { motion } from 'motion/react';
import brandLogo from '../assets/images/stunning_birds_transparent.png';

interface AtelierPageLoaderProps {
  label?: string | null;
}

export const AtelierPageLoader: React.FC<AtelierPageLoaderProps> = ({ label }) => {
  return (
    <motion.div
      id="atelier-global-page-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading Atelier Experience"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0c0b]/94 backdrop-blur-md text-[#faf7f2] select-none pointer-events-auto"
    >
      {/* Ambient background soft radial glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12)_0%,transparent_65%)]" 
        aria-hidden="true" 
      />

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center space-y-6">
        
        {/* Orbital Brand Container */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
          
          {/* Subtle Outer Ring Guide */}
          <div className="absolute inset-0 rounded-full border border-[#2a2520]/80 shadow-[0_0_25px_rgba(0,0,0,0.6)]" />

          {/* Counter-rotating subtle orbital ring with gold gradient ticks */}
          <svg
            className="absolute inset-0 w-full h-full animate-atelier-reverse pointer-events-none"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="60"
              cy="60"
              r="56"
              stroke="#2e2822"
              strokeWidth="1"
              strokeDasharray="4 8"
              strokeOpacity="0.6"
            />
            <circle
              cx="60"
              cy="60"
              r="56"
              stroke="#8c562e"
              strokeWidth="1.5"
              strokeDasharray="24 160"
              strokeLinecap="round"
            />
          </svg>

          {/* Primary Forward Rotating Gold Progress Arc */}
          <svg
            className="absolute inset-0 w-full h-full animate-atelier-spin pointer-events-none"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="goldLoaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d4af37" stopOpacity="0.95" />
                <stop offset="60%" stopColor="#c59b27" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#8c562e" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="48"
              stroke="url(#goldLoaderGrad)"
              strokeWidth="2.5"
              strokeDasharray="85 220"
              strokeLinecap="round"
            />
          </svg>

          {/* Centered Brand Emblem with Soft Breathing Glow */}
          <div className="relative z-10 w-22 h-22 sm:w-28 sm:h-28 flex items-center justify-center p-2.5 sm:p-3 rounded-full bg-[#141210]/95 border border-[#383028] shadow-2xl animate-atelier-glow">
            <img
              src={brandLogo}
              alt="Stunning Birds Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain filter drop-shadow-[0_2px_12px_rgba(212,175,55,0.45)]"
            />
          </div>
        </div>

        {/* Brand Typography & Status */}
        <div className="space-y-2">
          <div className="flex flex-col items-center">
            <span className="font-serif-luxury text-base sm:text-lg font-bold tracking-[0.26em] text-[#faf7f2] uppercase">
              STUNNING BIRDS
            </span>
            <span className="text-[8px] sm:text-[9px] tracking-[0.38em] text-[#d4af37] uppercase font-medium mt-0.5">
              LEATHER ATELIER
            </span>
          </div>

          {/* Micro Shimmer Progress Line */}
          <div className="w-24 h-[1.5px] mx-auto bg-[#231f1b] overflow-hidden relative rounded-full mt-3">
            <div className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent animate-atelier-shimmer" />
          </div>

          {/* Dynamic Contextual Micro-Label */}
          <p className="text-[11px] sm:text-xs text-[#a39789] tracking-wider font-sans pt-1 transition-all duration-300">
            {label || 'Entering the Atelier...'}
          </p>
        </div>

      </div>
    </motion.div>
  );
};
