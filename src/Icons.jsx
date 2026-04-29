// ─── Icons.jsx ────────────────────────────────────────────────────────────────
// SVG icon components used throughout the PSU Library Management System app.

import { GOLD } from './constants';

export const QRIcon = ({ size = 80, color = GOLD }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect x="5" y="5" width="38" height="38" rx="2" fill="none" stroke={color} strokeWidth="4" />
    <rect x="15" y="15" width="18" height="18" rx="1" fill={color} />
    <rect x="57" y="5" width="38" height="38" rx="2" fill="none" stroke={color} strokeWidth="4" />
    <rect x="67" y="15" width="18" height="18" rx="1" fill={color} />
    <rect x="5" y="57" width="38" height="38" rx="2" fill="none" stroke={color} strokeWidth="4" />
    <rect x="15" y="67" width="18" height="18" rx="1" fill={color} />
    <rect x="57" y="57" width="8" height="8" fill={color} />
    <rect x="71" y="57" width="8" height="8" fill={color} />
    <rect x="85" y="57" width="8" height="8" fill={color} />
    <rect x="57" y="71" width="8" height="8" fill={color} />
    <rect x="71" y="71" width="8" height="8" fill={color} />
    <rect x="85" y="85" width="8" height="8" fill={color} />
    <rect x="57" y="85" width="8" height="8" fill={color} />
    <rect x="71" y="85" width="8" height="8" fill={color} />
  </svg>
);

export const AttendanceIcon = ({ size = 40, color = GOLD }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="14" r="6" stroke={color} strokeWidth="2" fill="none" />
    <path d="M8 34c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M28 18l2 2 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CatalogIcon = ({ size = 40, color = GOLD }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="4" y="4" width="14" height="14" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <rect x="22" y="4" width="14" height="14" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <rect x="4" y="22" width="14" height="14" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <circle cx="29" cy="29" r="5" stroke={color} strokeWidth="2" fill="none" />
    <path d="M33 33l4 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const DashboardIcon = ({ size = 40, color = GOLD }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="4" y="4" width="14" height="20" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <rect x="22" y="4" width="14" height="9" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <rect x="22" y="17" width="14" height="19" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <rect x="4" y="28" width="14" height="8" rx="2" stroke={color} strokeWidth="2" fill="none" />
  </svg>
);

export const MobileIcon = ({ size = 40, color = GOLD }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="10" y="3" width="20" height="34" rx="3" stroke={color} strokeWidth="2" fill="none" />
    <circle cx="20" cy="32" r="2" fill={color} />
    <line x1="14" y1="7" x2="26" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ShieldIcon = ({ size = 40, color = GOLD }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <path d="M20 4L6 10v12c0 8 6 13 14 16 8-3 14-8 14-16V10L20 4z" stroke={color} strokeWidth="2" fill="none" />
    <path d="M14 20l4 4 8-8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CornerBracket = ({ position = "tl", color = GOLD, size = 24 }) => {
  const s = size;
  const w = 2;
  const arm = size * 0.5;

  const paths = {
    tl: `M ${s},0 L 0,0 L 0,${s}`,
    tr: `M 0,0 L ${s},0 L ${s},${s}`,
    bl: `M ${s},${s} L 0,${s} L 0,0`,
    br: `M 0,${s} L ${s},${s} L ${s},0`,
  };

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        ...(position === "tl" && { top: 12, left: 12 }),
        ...(position === "tr" && { top: 12, right: 12 }),
        ...(position === "bl" && { bottom: 12, left: 12 }),
        ...(position === "br" && { bottom: 12, right: 12 }),
      }}
    >
      <path d={paths[position]} stroke={color} strokeWidth={w} strokeLinecap="square" fill="none" />
    </svg>
  );
};