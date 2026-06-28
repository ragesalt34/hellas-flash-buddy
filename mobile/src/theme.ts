// Hellas Study — shared design tokens (Drops-inspired: flat deep-ink + coral).
// Mirrors the Mini App palette so the native app feels identical.

export const colors = {
  bg: '#15141b',
  surface: '#211f2a',
  surface2: '#2c2936',
  text: '#f6f4f2',
  muted: '#9a95a8',

  accent: '#ff6a4d', // coral (brand/primary)
  accent2: '#ff8a6e',
  amber: '#ffc93c',
  mint: '#2fd06e', // correct
  coral: '#ff4d5e', // wrong
  purple: '#9b8cff',

  border: 'rgba(255,255,255,0.06)',
} as const;

export const radius = { sm: 14, md: 22, lg: 28, xl: 34, pill: 999 } as const;

export const space = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 } as const;

// Nunito weights (loaded in App.tsx via @expo-google-fonts/nunito).
export const font = {
  regular: 'Nunito_600SemiBold',
  bold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;
