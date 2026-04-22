import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function baseSvg(
  { size = 20, color = 'currentColor', strokeWidth = 1.6 }: IconProps,
  children: React.ReactNode,
) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export function HomeIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Path d="M3 11.5 12 4l9 7.5" />
      <Path d="M5 10v10h14V10" />
      <Path d="M10 20v-6h4v6" />
    </>
  ));
}

export function OffersIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Path d="M7 3h7l5 5v13H7z" />
      <Path d="M14 3v5h5" />
      <Line x1="10" y1="13" x2="17" y2="13" />
      <Line x1="10" y1="17" x2="15" y2="17" />
    </>
  ));
}

export function CalendarIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Rect x="3.5" y="5" width="17" height="16" rx="1.5" />
      <Line x1="3.5" y1="10" x2="20.5" y2="10" />
      <Line x1="8" y1="3" x2="8" y2="7" />
      <Line x1="16" y1="3" x2="16" y2="7" />
    </>
  ));
}

export function CalendarDayIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Rect x="3.5" y="5" width="17" height="16" rx="1.5" />
      <Line x1="3.5" y1="10" x2="20.5" y2="10" />
      <Line x1="8" y1="3" x2="8" y2="7" />
      <Line x1="16" y1="3" x2="16" y2="7" />
      <Rect x="7" y="13" width="4" height="4" />
    </>
  ));
}

export function StaffIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Circle cx="9" cy="9" r="3" />
      <Path d="M3.5 19c.6-3 3-5 5.5-5s4.9 2 5.5 5" />
      <Circle cx="17" cy="10" r="2.4" />
      <Path d="M14 19c.4-2.2 1.8-3.6 3-3.6s2.6 1.4 3 3.6" />
    </>
  ));
}

export function UsersIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Circle cx="12" cy="8" r="3.2" />
      <Path d="M5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5" />
      <Circle cx="19" cy="7" r="2.2" />
      <Path d="M16.5 14c.6-.3 1.4-.5 2.2-.5 2 0 3.5 1.4 4 3.5" />
      <Circle cx="5" cy="7" r="2.2" />
      <Path d="M7.5 14c-.6-.3-1.4-.5-2.2-.5-2 0-3.5 1.4-4 3.5" />
    </>
  ));
}

export function ChatIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Path d="M4 12c0-3.9 3.6-7 8-7s8 3.1 8 7c0 3.9-3.6 7-8 7-.9 0-1.7-.1-2.5-.3L5 20l1-3.3C5 15.5 4 13.8 4 12z" />
    </>
  ));
}

export function HistoryIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Polyline points="12 7 12 12 15.5 14" />
    </>
  ));
}

export function CashierIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Rect x="3" y="8" width="18" height="12" rx="1" />
      <Path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
      <Line x1="7" y1="12" x2="9" y2="12" />
      <Line x1="11" y1="12" x2="13" y2="12" />
      <Line x1="15" y1="12" x2="17" y2="12" />
      <Line x1="7" y1="16" x2="17" y2="16" />
    </>
  ));
}

export function InvoiceIcon(p: IconProps) {
  return baseSvg(p, (
    <>
      <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <Line x1="9" y1="8" x2="15" y2="8" />
      <Line x1="9" y1="12" x2="15" y2="12" />
      <Line x1="9" y1="16" x2="13" y2="16" />
    </>
  ));
}

export function ChevronIcon({ size = 14, color = 'currentColor', direction = 'right' as 'left' | 'right' }: IconProps & { direction?: 'left' | 'right' }) {
  const d = direction === 'right' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}
