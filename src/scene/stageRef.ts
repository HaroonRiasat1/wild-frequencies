import type { StageRenderer } from './renderer';

/** The one live stage renderer (set by <StageCanvas/>), for UI buttons + keyboard. */
export const stageRef: { current: StageRenderer | null } = { current: null };
