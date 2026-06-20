import React from 'react';

interface SchoolCrestProps {
  themeColor?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate';
  size?: number;
  className?: string;
  onClick?: () => void;
}

export default function SchoolCrest({
  themeColor = 'indigo',
  size = 42,
  className = '',
  onClick
}: SchoolCrestProps) {
  // Define fill colors based on house themeSelection
  const getThemeColors = () => {
    switch (themeColor) {
      case 'emerald':
        return {
          primary: '#10b981', // emerald-500
          dark: '#047857',    // emerald-700
          light: '#ecfdf5',   // emerald-50
          accent: '#fbbf24',  // amber-400 (gold)
          text: 'text-emerald-700'
        };
      case 'rose':
        return {
          primary: '#f43f5e', // rose-500
          dark: '#be123c',    // rose-700
          light: '#fff1f2',   // rose-50
          accent: '#fbbf24',  // amber-400 (gold)
          text: 'text-rose-700'
        };
      case 'amber':
        return {
          primary: '#f59e0b', // amber-500
          dark: '#b45309',    // amber-700
          light: '#fef3c7',   // amber-50
          accent: '#1e3a8a',  // blue-900 (royal blue)
          text: 'text-amber-700'
        };
      case 'slate':
        return {
          primary: '#64748b', // slate-500
          dark: '#334155',    // slate-700
          light: '#f1f5f9',   // slate-50
          accent: '#fbbf24',  // amber-400
          text: 'text-slate-700'
        };
      case 'indigo':
      default:
        return {
          primary: '#4f46e5', // indigo-600
          dark: '#3730a3',    // indigo-800
          light: '#e0e7ff',   // indigo-50
          accent: '#fbbf24',  // amber-400 (gold)
          text: 'text-indigo-700'
        };
    }
  };

  const colors = getThemeColors();

  return (
    <div 
      id="school-crest-container"
      onClick={onClick}
      className={`relative group cursor-pointer transition-all duration-300 hover:scale-[1.08] active:scale-95 select-none ${className}`}
      style={{ width: size, height: size }}
      title="Dynamic Ranet School Crest - Click to rotate academic house theme"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-sm group-hover:drop-shadow-md transition-all duration-300"
      >
        {/* Outer Shield Border */}
        <path
          d="M10 20 C 10 20, 50 10, 90 20 C 90 55, 75 85, 50 95 C 25 85, 10 55, 10 20 Z"
          fill={colors.light}
          stroke={colors.dark}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner Shield Contour */}
        <path
          d="M15 23 C 15 23, 50 14, 85 23 C 85 53, 71 81, 50 90 C 29 81, 15 53, 15 23 Z"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.5"
          strokeDasharray="1 1.5"
        />

        {/* Diagonal Crest Sectioning */}
        <path
          d="M50 13 L50 91"
          stroke={colors.dark}
          strokeWidth="1"
          opacity="0.3"
        />
        <path
          d="M12 45 L88 45"
          stroke={colors.dark}
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Top Left: Open Book Symbol (Intellectual Knowledge) */}
        <g transform="translate(22, 26) scale(0.6)">
          <path
            d="M2 L2 18 C2 18, 10 15, 18 18 L18 2 C18 2, 10 -1, 2 2 Z"
            fill="white"
            stroke={colors.dark}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M34 L34 18 C34 18, 26 15, 18 18 L18 2 C18 2, 26 -1, 34 2 Z"
            fill="white"
            stroke={colors.dark}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="6" y1="6" x2="14" y2="6" stroke={colors.primary} strokeWidth="1.5" />
          <line x1="6" y1="10" x2="14" y2="10" stroke={colors.primary} strokeWidth="1.5" />
          <line x1="6" y1="14" x2="14" y2="14" stroke={colors.primary} strokeWidth="1.5" />
          
          <line x1="22" y1="6" x2="30" y2="6" stroke={colors.primary} strokeWidth="1.5" />
          <line x1="22" y1="10" x2="30" y2="10" stroke={colors.primary} strokeWidth="1.5" />
          <line x1="22" y1="14" x2="30" y2="14" stroke={colors.primary} strokeWidth="1.5" />
        </g>

        {/* Top Right: Rising Academic Sun / Torch ray (Enlightenment) */}
        <g transform="translate(64, 26) scale(0.6)">
          <circle cx="15" cy="15" r="5" fill={colors.accent} stroke={colors.dark} strokeWidth="2" />
          {/* Rays */}
          <line x1="15" y1="5" x2="15" y2="1" stroke={colors.dark} strokeWidth="2" />
          <line x1="15" y1="25" x2="15" y2="29" stroke={colors.dark} strokeWidth="2" />
          <line x1="5" y1="15" x2="1" y2="15" stroke={colors.dark} strokeWidth="2" />
          <line x1="25" y1="15" x2="29" y2="15" stroke={colors.dark} strokeWidth="2" />
          <line x1="7.9" y1="7.9" x2="5.1" y2="5.1" stroke={colors.dark} strokeWidth="2" />
          <line x1="22.1" y1="22.1" x2="24.9" y2="24.9" stroke={colors.dark} strokeWidth="2" />
          <line x1="7.9" y1="22.1" x2="5.1" y2="24.9" stroke={colors.dark} strokeWidth="2" />
          <line x1="22.1" y1="7.9" x2="24.9" y2="5.1" stroke={colors.dark} strokeWidth="2" />
        </g>

        {/* Center Star of Distinction representing Kampala/Uganda */}
        <polygon 
          points="50,42 53,49 60,50 55,55 56,62 50,58 44,62 45,55 40,50 47,49" 
          fill={colors.accent} 
          stroke={colors.dark} 
          strokeWidth="1.5" 
        />

        {/* Bottom Banner Ribbon */}
        <path
          d="M12 75 L25 81 L50 81 L75 81 L88 75 L79 67 L50 72 L21 67 Z"
          fill="white"
          stroke={colors.dark}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Star embellishments inside the banner sides or crest margins */}
        <circle cx="50" cy="77" r="1.5" fill={colors.dark} />

        {/* Initials of Ranet Junior School 'R' 'J' 'S' on the banner ribbon */}
        <text 
          x="50" 
          y="74.5" 
          textAnchor="middle" 
          fill={colors.dark} 
          fontSize="5.5" 
          fontWeight="1000" 
          fontFamily="monospace"
          letterSpacing="0.5"
        >
          R.J.S
        </text>

        {/* Mini academic laurels surrounding bottom tip */}
        <path
          d="M18 52 C 12 60, 22 74, 30 76"
          stroke={colors.primary}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M82 52 C 88 60, 78 74, 70 76"
          stroke={colors.primary}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
