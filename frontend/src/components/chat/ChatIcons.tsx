import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
};

export function CopyIcon({ size = 14, color = '#a5a6a6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="9" y="9" width="10" height="10" rx="1.5" />
      <Rect x="5" y="5" width="10" height="10" rx="1.5" opacity={0.55} />
    </Svg>
  );
}

export function ReloadIcon({ size = 14, color = '#a5a6a6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 7v5h-5" />
      <Path d="M20 12a8 8 0 1 1-2.3-5.7" />
    </Svg>
  );
}