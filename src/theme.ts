import type { BeamColor } from './game/engine';

export const C = {
  bg: '#04050D',
  panel: 'rgba(20, 26, 60, 0.72)',
  panelSolid: '#10152F',
  border: 'rgba(130, 150, 255, 0.16)',
  borderStrong: 'rgba(130, 150, 255, 0.35)',
  text: '#EEF1FF',
  dim: '#8590C2',
  faint: '#4A5384',
  gold: '#FFD77A',
  danger: '#FF5D73',
};

export const BEAM: Record<BeamColor, string> = {
  cyan: '#3DF2FF',
  magenta: '#FF4FD8',
  amber: '#FFB547',
};

export const PORTAL = ['#A77BFF', '#A77BFF', '#4DFFB0', '#FF7A6B', '#6BB8FF'];

export const FONT = {
  // System fonts keep the bundle light; weights + tracking do the styling.
  display: { fontWeight: '900' as const, letterSpacing: 6 },
  label: { fontWeight: '700' as const, letterSpacing: 2.5 },
};
