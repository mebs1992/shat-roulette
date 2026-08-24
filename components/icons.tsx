type IconProps = { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const ChevronLeft = ({ size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const ChevronRight = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const Close = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const Dots = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <circle cx="12" cy="5" r="0.6" />
    <circle cx="12" cy="12" r="0.6" />
    <circle cx="12" cy="19" r="0.6" />
  </svg>
);

export const Bubble = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.7" {...base}>
    <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
  </svg>
);

export const Send = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.9" {...base}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const Photo = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.7" {...base}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.4" />
    <path d="M4 17l4.5-4.5a2 2 0 0 1 2.7 0L20 20" />
  </svg>
);

export const Funnel = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.9" {...base}>
    <path d="M4 5h16l-6 7v6l-4 2v-8z" />
  </svg>
);

export const Flag = ({ size = 15 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <path d="M4 21V4h11l-1 3 1 3H4" />
  </svg>
);

export const Block = ({ size = 15 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m6 6 12 12" />
  </svg>
);

export const Shuffle = ({ size = 15 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
);

export const Share = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.7" {...base}>
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3M8 7l4-4 4 4" />
  </svg>
);
