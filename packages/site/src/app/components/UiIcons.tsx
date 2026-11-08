'use client';

import React from 'react';

export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

/**
 * TryPatchBay Original Brand Mark
 * Uses the authentic TryPatchbay brand asset (/trypatchbay_icon_square.png).
 */
export function TrypatchbayMark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/trypatchbay_icon_square.png"
      alt="trypatchbay"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: size > 32 ? 8 : 5, flexShrink: 0 }}
    />
  );
}

/**
 * Full Brand Lockup with Original Logo Mark + Wordmark
 */
export function TrypatchbayLogo({
  markSize = 24,
  textSize = 18,
  className = '',
}: {
  markSize?: number;
  textSize?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        userSelect: 'none',
      }}
    >
      <TrypatchbayMark size={markSize} />
      <span
        style={{
          fontSize: `${textSize}px`,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#0f172a',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        trypatchbay
      </span>
    </div>
  );
}

/* Dashboard section icons, drawn in the patch-cable language of the brand mark:
   patchbay panels, jack sockets, and cables with round plugs. */

export function PatchPanelIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="3" fill={color} fillOpacity="0.08" />
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <circle cx="8" cy="12" r="1.6" fill={color} fillOpacity="0.2" />
      <circle cx="8" cy="12" r="1.6" />
      <circle cx="16" cy="12" r="1.6" fill={color} fillOpacity="0.2" />
      <circle cx="16" cy="12" r="1.6" />
      <path d="M12 13.6 C 12 16.5 9.5 16.5 9.5 19.5" />
      <circle cx="12" cy="12" r="1.6" fill={color} />
    </svg>
  );
}

export function PatchCableRunIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="6" cy="6" r="2.3" fill={color} fillOpacity="0.18" />
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="18" r="2.3" fill={color} fillOpacity="0.18" />
      <circle cx="18" cy="18" r="2.3" />
      <path d="M6 8.3 C 6 15 9 18 15.7 18" />
    </svg>
  );
}

export function PatchPlugFixIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="8" cy="12" r="3" fill={color} fillOpacity="0.14" />
      <circle cx="8" cy="12" r="3" />
      <rect x="13.5" y="10" width="7" height="4" rx="2" fill={color} fillOpacity="0.2" />
      <rect x="13.5" y="10" width="7" height="4" rx="2" />
      <path d="M13.5 11 L11.2 11" />
      <path d="M13.5 13 L11.2 13" />
    </svg>
  );
}

export function PatchTerminalCheckIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="15" rx="3" fill={color} fillOpacity="0.08" />
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <polyline points="7 9.5 9.5 12 7 14.5" />
      <polyline points="12.5 13.2 14.4 15.1 18.2 9.6" />
    </svg>
  );
}

export function PatchStripIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="8" width="18" height="8" rx="2.5" fill={color} fillOpacity="0.08" />
      <rect x="3" y="8" width="18" height="8" rx="2.5" />
      <circle cx="8" cy="12" r="1.5" fill={color} fillOpacity="0.2" />
      <circle cx="8" cy="12" r="1.5" />
      <circle cx="12.5" cy="12" r="1.5" fill={color} fillOpacity="0.2" />
      <circle cx="12.5" cy="12" r="1.5" />
      <path d="M16 13.5 C 16 17 13 17.5 13 20.5" />
      <circle cx="16" cy="12" r="1.5" fill={color} />
    </svg>
  );
}

export function PatchBreakIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2.5" y="10" width="6" height="4" rx="2" fill={color} fillOpacity="0.2" />
      <rect x="2.5" y="10" width="6" height="4" rx="2" />
      <path d="M8.5 11 L10.3 11" />
      <path d="M8.5 13 L10.3 13" />
      <circle cx="18" cy="12" r="3" fill={color} fillOpacity="0.14" />
      <circle cx="18" cy="12" r="3" />
      <path d="M13 9.8 L14.1 8.2" />
      <path d="M13 14.2 L14.1 15.8" />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={color} fillOpacity="0.12" />
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11.5 14.5 15.5 9.5" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );
}

export function CheckCircleIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.12" />
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12 11 14.5 15.5 9.5" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" fill={color} fillOpacity="0.14" />
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" strokeWidth={strokeWidth + 0.3} />
      <circle cx="12" cy="16.5" r="1" fill={color} stroke="none" />
    </svg>
  );
}

export function LockIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2.5" fill={color} fillOpacity="0.14" />
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="15.5" r="1.25" fill={color} stroke="none" />
      <path d="M12 16.75v1.75" strokeWidth={strokeWidth + 0.2} />
    </svg>
  );
}

export function TerminalIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" fill={color} fillOpacity="0.10" />
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <polyline points="7 10 10 12.5 7 15" strokeWidth={strokeWidth + 0.3} />
      <line x1="12" y1="15" x2="16" y2="15" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );
}

export function GitPullRequestIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="18" cy="18" r="3" fill={color} fillOpacity="0.15" />
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" fill={color} fillOpacity="0.15" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

export function GitBranchIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" fill={color} fillOpacity="0.15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" fill={color} fillOpacity="0.15" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

export function GitCommitIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill={color} fillOpacity="0.15" />
      <circle cx="12" cy="12" r="4" />
      <line x1="1.05" y1="12" x2="7" y2="12" />
      <line x1="17.01" y1="12" x2="22.96" y2="12" />
    </svg>
  );
}

export function FileDiffIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill={color} fillOpacity="0.08" />
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="12" y1="9.5" x2="12" y2="14.5" />
      <line x1="9" y1="17.5" x2="15" y2="17.5" />
    </svg>
  );
}

export function FileCodeIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill={color} fillOpacity="0.08" />
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="10 13 8 15 10 17" />
      <polyline points="14 13 16 15 14 17" />
    </svg>
  );
}

export function LayersIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" fill={color} fillOpacity="0.14" />
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export function TopologyIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="18" cy="5" r="3.2" fill={color} fillOpacity="0.18" />
      <circle cx="18" cy="5" r="3.2" />
      <circle cx="6" cy="12" r="3.2" fill={color} fillOpacity="0.18" />
      <circle cx="6" cy="12" r="3.2" />
      <circle cx="18" cy="19" r="3.2" fill={color} fillOpacity="0.18" />
      <circle cx="18" cy="19" r="3.2" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function PackageSearchIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill={color} fillOpacity="0.08" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12.01 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

export function CpuIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2.5" fill={color} fillOpacity="0.10" />
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill={color} fillOpacity="0.22" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  );
}

export function ActivityIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function ScanRadarIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.08" />
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  );
}

export function SearchIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7.5" fill={color} fillOpacity="0.10" />
      <circle cx="11" cy="11" r="7.5" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );
}

export function SparklesIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill={color} fillOpacity="0.15" />
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v3" />
      <path d="M19 17v3" />
      <path d="M3.5 4.5h3" />
      <path d="M17.5 18.5h3" />
    </svg>
  );
}

export function WorkflowIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.5" fill={color} fillOpacity="0.18" />
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="3" width="6" height="6" rx="1.5" fill={color} fillOpacity="0.18" />
      <rect x="15" y="3" width="6" height="6" rx="1.5" />
      <rect x="9" y="15" width="6" height="6" rx="1.5" fill={color} fillOpacity="0.18" />
      <rect x="9" y="15" width="6" height="6" rx="1.5" />
      <path d="M6 9v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" />
      <path d="M12 13v2" />
    </svg>
  );
}

export function TimerIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="13" r="8" fill={color} fillOpacity="0.12" />
      <circle cx="12" cy="13" r="8" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="13" x2="15.5" y2="13" />
      <path d="M10 2h4" />
      <path d="M12 2v3" />
    </svg>
  );
}

export function FolderCodeIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" fill={color} fillOpacity="0.10" />
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <polyline points="10 12 8 14 10 16" />
      <polyline points="14 12 16 14 14 16" />
    </svg>
  );
}

export function RefreshIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 15.55-6.36L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.55 6.36L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export function CopyIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="8" y="8" width="13" height="13" rx="2.5" fill={color} fillOpacity="0.12" />
      <rect x="8" y="8" width="13" height="13" rx="2.5" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function CheckIcon({ size = 14, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 12, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );

import React from 'react';

export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

/**
 * TryPatchBay Original Brand Mark
 * Uses the authentic TryPatchbay brand asset (/trypatchbay_icon_square.png).
 */
export function TrypatchbayMark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/trypatchbay_icon_square.png"
      alt="trypatchbay"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: size > 32 ? 8 : 5, flexShrink: 0 }}
    />
  );
}

/**
 * Full Brand Lockup with Original Logo Mark + Wordmark
 */
export function TrypatchbayLogo({
  markSize = 24,
  textSize = 18,
  className = '',
}: {
  markSize?: number;
  textSize?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        userSelect: 'none',
      }}
    >
      <TrypatchbayMark size={markSize} />
      <span
        style={{
          fontSize: `${textSize}px`,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#0f172a',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        trypatchbay
      </span>
    </div>
  );
}

/* Dashboard section icons, drawn in the patch-cable language of the brand mark:
   patchbay panels, jack sockets, and cables with round plugs. */

export function PatchPanelIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="3" fill={color} fillOpacity="0.08" />
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <circle cx="8" cy="12" r="1.6" fill={color} fillOpacity="0.2" />
      <circle cx="8" cy="12" r="1.6" />
      <circle cx="16" cy="12" r="1.6" fill={color} fillOpacity="0.2" />
      <circle cx="16" cy="12" r="1.6" />
      <path d="M12 13.6 C 12 16.5 9.5 16.5 9.5 19.5" />
      <circle cx="12" cy="12" r="1.6" fill={color} />
    </svg>
  );
}

export function PatchCableRunIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="6" cy="6" r="2.3" fill={color} fillOpacity="0.18" />
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="18" r="2.3" fill={color} fillOpacity="0.18" />
      <circle cx="18" cy="18" r="2.3" />
      <path d="M6 8.3 C 6 15 9 18 15.7 18" />
    </svg>
  );
}

export function PatchPlugFixIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="8" cy="12" r="3" fill={color} fillOpacity="0.14" />
      <circle cx="8" cy="12" r="3" />
      <rect x="13.5" y="10" width="7" height="4" rx="2" fill={color} fillOpacity="0.2" />
      <rect x="13.5" y="10" width="7" height="4" rx="2" />
      <path d="M13.5 11 L11.2 11" />
      <path d="M13.5 13 L11.2 13" />
    </svg>
  );
}

export function PatchTerminalCheckIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="15" rx="3" fill={color} fillOpacity="0.08" />
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <polyline points="7 9.5 9.5 12 7 14.5" />
      <polyline points="12.5 13.2 14.4 15.1 18.2 9.6" />
    </svg>
  );
}

export function PatchStripIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="8" width="18" height="8" rx="2.5" fill={color} fillOpacity="0.08" />
      <rect x="3" y="8" width="18" height="8" rx="2.5" />
      <circle cx="8" cy="12" r="1.5" fill={color} fillOpacity="0.2" />
      <circle cx="8" cy="12" r="1.5" />
      <circle cx="12.5" cy="12" r="1.5" fill={color} fillOpacity="0.2" />
      <circle cx="12.5" cy="12" r="1.5" />
      <path d="M16 13.5 C 16 17 13 17.5 13 20.5" />
      <circle cx="16" cy="12" r="1.5" fill={color} />
    </svg>
  );
}

export function PatchBreakIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2.5" y="10" width="6" height="4" rx="2" fill={color} fillOpacity="0.2" />
      <rect x="2.5" y="10" width="6" height="4" rx="2" />
      <path d="M8.5 11 L10.3 11" />
      <path d="M8.5 13 L10.3 13" />
      <circle cx="18" cy="12" r="3" fill={color} fillOpacity="0.14" />
      <circle cx="18" cy="12" r="3" />
      <path d="M13 9.8 L14.1 8.2" />
      <path d="M13 14.2 L14.1 15.8" />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={color} fillOpacity="0.12" />
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11.5 14.5 15.5 9.5" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );
}

export function CheckCircleIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.12" />
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12 11 14.5 15.5 9.5" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" fill={color} fillOpacity="0.14" />
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" strokeWidth={strokeWidth + 0.3} />
      <circle cx="12" cy="16.5" r="1" fill={color} stroke="none" />
    </svg>
  );
}

export function LockIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2.5" fill={color} fillOpacity="0.14" />
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="15.5" r="1.25" fill={color} stroke="none" />
      <path d="M12 16.75v1.75" strokeWidth={strokeWidth + 0.2} />
    </svg>
  );
}

export function TerminalIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" fill={color} fillOpacity="0.10" />
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <polyline points="7 10 10 12.5 7 15" strokeWidth={strokeWidth + 0.3} />
      <line x1="12" y1="15" x2="16" y2="15" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );
}

export function GitPullRequestIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="18" cy="18" r="3" fill={color} fillOpacity="0.15" />
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" fill={color} fillOpacity="0.15" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

export function GitBranchIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" fill={color} fillOpacity="0.15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" fill={color} fillOpacity="0.15" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

export function GitCommitIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill={color} fillOpacity="0.15" />
      <circle cx="12" cy="12" r="4" />
      <line x1="1.05" y1="12" x2="7" y2="12" />
      <line x1="17.01" y1="12" x2="22.96" y2="12" />
    </svg>
  );
}

export function FileDiffIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill={color} fillOpacity="0.08" />
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="12" y1="9.5" x2="12" y2="14.5" />
      <line x1="9" y1="17.5" x2="15" y2="17.5" />
    </svg>
  );
}

export function FileCodeIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill={color} fillOpacity="0.08" />
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="10 13 8 15 10 17" />
      <polyline points="14 13 16 15 14 17" />
    </svg>
  );
}

export function LayersIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" fill={color} fillOpacity="0.14" />
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export function TopologyIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="18" cy="5" r="3.2" fill={color} fillOpacity="0.18" />
      <circle cx="18" cy="5" r="3.2" />
      <circle cx="6" cy="12" r="3.2" fill={color} fillOpacity="0.18" />
      <circle cx="6" cy="12" r="3.2" />
      <circle cx="18" cy="19" r="3.2" fill={color} fillOpacity="0.18" />
      <circle cx="18" cy="19" r="3.2" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function PackageSearchIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill={color} fillOpacity="0.08" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12.01 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

export function CpuIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2.5" fill={color} fillOpacity="0.10" />
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill={color} fillOpacity="0.22" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  );
}

export function ActivityIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function ScanRadarIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.08" />
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  );
}

export function SearchIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7.5" fill={color} fillOpacity="0.10" />
      <circle cx="11" cy="11" r="7.5" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );
}

export function SparklesIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill={color} fillOpacity="0.15" />
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v3" />
      <path d="M19 17v3" />
      <path d="M3.5 4.5h3" />
      <path d="M17.5 18.5h3" />
    </svg>
  );
}

export function WorkflowIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.5" fill={color} fillOpacity="0.18" />
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="3" width="6" height="6" rx="1.5" fill={color} fillOpacity="0.18" />
      <rect x="15" y="3" width="6" height="6" rx="1.5" />
      <rect x="9" y="15" width="6" height="6" rx="1.5" fill={color} fillOpacity="0.18" />
      <rect x="9" y="15" width="6" height="6" rx="1.5" />
      <path d="M6 9v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" />
      <path d="M12 13v2" />
    </svg>
  );
}

export function TimerIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="13" r="8" fill={color} fillOpacity="0.12" />
      <circle cx="12" cy="13" r="8" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="13" x2="15.5" y2="13" />
      <path d="M10 2h4" />
      <path d="M12 2v3" />
    </svg>
  );
}

export function FolderCodeIcon({ size = 16, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" fill={color} fillOpacity="0.10" />
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <polyline points="10 12 8 14 10 16" />
      <polyline points="14 12 16 14 14 16" />
    </svg>
  );
}

export function RefreshIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 15.55-6.36L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.55 6.36L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export function CopyIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="8" y="8" width="13" height="13" rx="2.5" fill={color} fillOpacity="0.12" />
      <rect x="8" y="8" width="13" height="13" rx="2.5" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function CheckIcon({ size = 14, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 12, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" strokeWidth={strokeWidth + 0.3} />
    </svg>
  );
}

export function ChevronDownIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronUpIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 14, color = 'currentColor', strokeWidth = 1.75, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function PulseDotIcon({ color = '#10b981', size = 8 }: { color?: string; size?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
      <span
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: color,
          opacity: 0.75,
          animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        }}
      />
      <span
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
    </span>
  );
}
