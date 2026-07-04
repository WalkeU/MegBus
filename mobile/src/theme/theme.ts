export const colors = {
  background: '#0A0A0F',
  surface: '#1A1A21',
  surfaceElevated: '#262630',
  accent: '#66BFFF',
  success: '#5CD18C',
  danger: '#F35C6B',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  cardRed: '#EB4D57',
  cardBlack: '#000000',
} as const;

export const radii = {
  control: 18,
  card: 12,
  pyramidTile: 8,
} as const;

export const spacing = 16;

export const typography = {
  title: {
    fontSize: 40,
    fontWeight: '800' as const,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  roomCode: {
    fontSize: 34,
    fontWeight: '800' as const,
  },
  riderName: {
    fontSize: 32,
    fontWeight: '800' as const,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
};

export const theme = { colors, radii, spacing, typography };
export type Theme = typeof theme;
