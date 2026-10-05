export const W = 960;
export const H = 540;
export const FLOOR_Y = 500; // top of the ground
export const GROUND_Y = 470; // spawn height that lands on the ground
export const GRAVITY = 1400;
export const COOLDOWN_MS = 30_000;

export const PLAYER = {
  w: 24,
  h: 40,
  run: 220,
  jump: -560,
  jumpCut: -200,
  dashSpeed: 650,
  dashMs: 180,
  dashCooldown: 450,
  attackMs: 120,
  attackCooldown: 300,
} as const;

export const COLORS = {
  platform: 0x8a7f6a,
  wall: 0xb5651d,
  altar: 0xe0b84c,
  amphora: 0xc8553d,
  slime: 0x6ab04c,
  bearer: 0x7d5a44,
  shield: 0xd9d9d9,
  sphinx: 0x8e6bbf,
  player: 0xf2e8cf,
  shot: 0xff7043,
} as const;

/** Peak height of a full single jump (px). */
export const jumpHeight = () => (PLAYER.jump * PLAYER.jump) / (2 * GRAVITY);
/** Horizontal reach of a full single jump on flat ground (px). */
export const jumpDistance = () => ((2 * -PLAYER.jump) / GRAVITY) * PLAYER.run;
/** Extra reach a mid-air dash adds (gravity is off while dashing). */
export const dashDistance = () => (PLAYER.dashSpeed * PLAYER.dashMs) / 1000;
