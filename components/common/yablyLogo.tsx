import { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export type YablyLogoProps = {
  size?: number;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
};

/** Logo cœur + croix (marque Yably). */
export const YablyLogo = memo(function YablyLogo({
  size = 24,
  color = '#E5913A',
  fillOpacity = 0.12,
  strokeWidth = 2,
}: YablyLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 35C12 28 4 20 4 13c0-6 4.5-10 10-10 3 0 5.2 1.5 6 3.8C20.8 4.5 23 3 26 3c5.5 0 10 4 10 10 0 7-8 15-16 22z"
        fill={color}
        fillOpacity={fillOpacity}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Rect x="17" y="11" width="6" height="15" rx="1.5" fill={color} />
      <Rect x="12.5" y="15.5" width="15" height="6" rx="1.5" fill={color} />
    </Svg>
  );
});
