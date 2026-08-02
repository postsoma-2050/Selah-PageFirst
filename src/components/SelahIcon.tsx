import React from 'react';

interface SelahIconProps {
  className?: string;
  size?: number;
}

export const SelahIcon: React.FC<SelahIconProps> = ({ className = 'w-5 h-5', size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Precision Document Outer Path with Corner Notch */}
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Corner Fold Slot */}
      <path
        d="M14 2V8H20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central Precision Target Crosshair */}
      <circle
        cx="12"
        cy="14"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Inner Pinpoint Center Dot */}
      <circle
        cx="12"
        cy="14"
        r="1"
        fill="currentColor"
      />
      {/* Ticks */}
      <path
        d="M12 9V10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 17.5V19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 14H8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M15.5 14H17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
