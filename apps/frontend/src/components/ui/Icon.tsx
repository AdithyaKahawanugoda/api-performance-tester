import type { CSSProperties } from 'react';

const ICONS = {
  home:    '<path d="M3 11.5L10 5l7 6.5V17a1 1 0 0 1-1 1h-3v-5H8v5H4a1 1 0 0 1-1-1v-5.5Z"/>',
  cog:     '<circle cx="10" cy="10" r="2.4"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7"/>',
  run:     '<path d="M5 4 5 16 16 10 5 4Z"/>',
  cmp:     '<path d="M4 4h5v12H4zM11 7h5v9h-5z"/>',
  up:      '<path d="M10 4v10M5 9l5-5 5 5"/>',
  search:  '<circle cx="9" cy="9" r="5"/><path d="m17 17-3.5-3.5"/>',
  bell:    '<path d="M5 13V9a5 5 0 0 1 10 0v4l1.5 2H3.5L5 13Z"/><path d="M8.5 17a1.5 1.5 0 0 0 3 0"/>',
  sun:     '<circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M4.6 15.4 6 14M14 6l1.4-1.4"/>',
  moon:    '<path d="M17 12a7 7 0 1 1-9-9 5.5 5.5 0 0 0 9 9Z"/>',
  download:'<path d="M10 3v9M5 8l5 5 5-5M3 17h14"/>',
  stop:    '<rect x="5" y="5" width="10" height="10" rx="1.5"/>',
  plus:    '<path d="M10 4v12M4 10h12"/>',
  arrow:   '<path d="M5 10h10M11 6l4 4-4 4"/>',
  chevron: '<path d="m7 5 5 5-5 5"/>',
  trash:   '<path d="M4 6h12M8 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 6l1 10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l1-10"/>',
  filter:  '<path d="M3 5h14l-5 6v5l-4-1v-4L3 5Z"/>',
  zap:     '<path d="M11 2 4 11h5l-1 7 7-9h-5l1-7Z"/>',
  history: '<path d="M3 10a7 7 0 1 0 2-5L3 7M3 3v4h4"/>',
  globe:   '<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3a10 10 0 0 1 0 14M10 3a10 10 0 0 0 0 14"/>',
  doc:     '<path d="M5 3h7l3 3v11H5z"/><path d="M12 3v3h3"/>',
  menu:    '<path d="M3 6h14M3 10h14M3 14h14"/>',
  x:       '<path d="M5 5l10 10M15 5 5 15"/>',
  check:   '<path d="M4 10l5 5 7-9"/>',
  copy:    '<rect x="8" y="8" width="9" height="9" rx="1"/><path d="M3 13V4a1 1 0 0 1 1-1h9"/>',
  expand:  '<path d="M3 8V3h5M17 12v5h-5"/>',
  pencil:  '<path d="M13.5 3.5 4 13 3 17l4-1 9.5-9.5-3-3ZM15 2l3 3"/>',
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 14, stroke = 1.5, className = '', style }: IconProps) {
  const path = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={'ico ' + className}
      style={style}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
