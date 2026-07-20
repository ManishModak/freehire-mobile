import Svg, { Path } from 'react-native-svg';

/**
 * The freehire brand mark — a ring enclosing a diamond. Ported verbatim from the
 * web's BrandMark.svelte (same 512-viewBox path). The single path uses the
 * even-odd fill rule so the diamond reads as a hole punched through the disc.
 *
 * `color` tracks the theme like the web's `fill="currentColor"`: the dark mark on
 * a light background, the light mark on dark. Callers pair it with the visible
 * "freehire" wordmark, which names the brand — the mark itself is decorative.
 */
export function BrandMark({ size = 22, color = '#0a0a0a' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" accessibilityRole="image">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={color}
        d="M256 56C366.457 56 456 145.543 456 256C456 366.457 366.457 456 256 456C145.543 456 56 366.457 56 256C56 145.543 145.543 56 256 56ZM256 166L346 256L256 346L166 256L256 166Z"
      />
    </Svg>
  );
}
