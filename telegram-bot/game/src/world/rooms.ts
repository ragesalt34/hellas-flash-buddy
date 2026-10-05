import { FLOOR_Y, GROUND_Y, H, W } from './constants';

export type RoomId = 'P1' | 'P2' | 'K1' | 'K2' | 'K3' | 'A1' | 'A2' | 'A3' | 'R1' | 'R2';

/** Top-left based rectangle. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Exit {
  side: 'left' | 'right';
  yMin: number;
  yMax: number;
  to: RoomId;
  toX: number;
  toY: number;
}

export interface RoomDef {
  id: RoomId;
  name: { ru: string; el: string };
  bg: number;
  platforms: Rect[];
  exits: Exit[];
  walls?: { id: string; rect: Rect }[];
  altars?: { id: 'dash' | 'doubleJump'; x: number }[];
  amphorae?: { id: string; x: number; y: number }[]; // y = surface it stands on
  enemies?: { type: 'slime' | 'shield'; id: string; x: number }[];
  boss?: { x: number };
}

const floor = (x1: number, x2: number): Rect => ({ x: x1, y: FLOOR_Y, w: x2 - x1, h: H - FLOOR_Y });
const ledge = (x: number, y: number, w: number): Rect => ({ x, y, w, h: 16 });
const ANY = { yMin: -200, yMax: H + 200 };
const toLeftEdge = { toX: 930, toY: GROUND_Y };
const toRightEdge = { toX: 30, toY: GROUND_Y };

const PIRAEUS = 0x1d2a3a;
const PLAKA = 0x2a2238;
const AGORA = 0x2f2a1e;
const ACROPOLIS = 0x1e2a24;

export const START_ROOM: RoomId = 'P1';

export const ROOMS: Record<RoomId, RoomDef> = {
  P1: {
    id: 'P1',
    name: { ru: 'Пирей · Гавань', el: 'Πειραιάς · Λιμάνι' },
    bg: PIRAEUS,
    platforms: [floor(0, W), ledge(520, 420, 120)],
    walls: [{ id: 'wall_harbor', rect: { x: 160, y: 380, w: 24, h: 120 } }],
    amphorae: [{ id: 'amph_harbor', x: 70, y: FLOOR_Y }],
    exits: [{ side: 'right', ...ANY, to: 'P2', ...toRightEdge }],
  },
  P2: {
    id: 'P2',
    name: { ru: 'Пирей · Доки', el: 'Πειραιάς · Αποβάθρες' },
    bg: PIRAEUS,
    platforms: [floor(0, W), ledge(780, 320, 180)],
    amphorae: [{ id: 'amph_docks', x: 880, y: 320 }],
    enemies: [
      { type: 'slime', id: 'slime_p2a', x: 400 },
      { type: 'slime', id: 'slime_p2b', x: 620 },
    ],
    exits: [
      { side: 'left', ...ANY, to: 'P1', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'K1', ...toRightEdge },
    ],
  },
  K1: {
    id: 'K1',
    name: { ru: 'Плака · Лестницы', el: 'Πλάκα · Σκαλιά' },
    bg: PLAKA,
    platforms: [floor(0, W), ledge(200, 440, 120), ledge(380, 380, 120), ledge(560, 320, 120), ledge(760, 150, 200)],
    amphorae: [{ id: 'amph_stairs', x: 880, y: 150 }],
    exits: [
      { side: 'left', ...ANY, to: 'P2', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'K2', ...toRightEdge },
    ],
  },
  K2: {
    id: 'K2',
    name: { ru: 'Плака · Святилище', el: 'Πλάκα · Ιερό' },
    bg: PLAKA,
    platforms: [floor(0, W), ledge(140, 400, 100), ledge(720, 400, 100)],
    altars: [{ id: 'dash', x: 480 }],
    exits: [
      { side: 'left', ...ANY, to: 'K1', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'K3', ...toRightEdge },
    ],
  },
  K3: {
    id: 'K3',
    name: { ru: 'Плака · Обрыв', el: 'Πλάκα · Γκρεμός' },
    bg: PLAKA,
    platforms: [floor(0, 360), floor(600, W)],
    exits: [
      { side: 'left', ...ANY, to: 'K2', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'A1', ...toRightEdge },
    ],
  },
  A1: {
    id: 'A1',
    name: { ru: 'Агора · Рынок', el: 'Αγορά · Παζάρι' },
    bg: AGORA,
    platforms: [floor(0, W), ledge(300, 420, 160)],
    enemies: [
      { type: 'slime', id: 'slime_a1', x: 200 },
      { type: 'shield', id: 'bearer_a1', x: 640 },
    ],
    exits: [
      { side: 'left', ...ANY, to: 'K3', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'A2', ...toRightEdge },
    ],
  },
  A2: {
    id: 'A2',
    name: { ru: 'Агора · Стоя', el: 'Αγορά · Στοά' },
    bg: AGORA,
    platforms: [floor(0, W), ledge(620, 300, 100)],
    altars: [{ id: 'doubleJump', x: 300 }],
    amphorae: [{ id: 'amph_stoa', x: 670, y: 300 }],
    exits: [
      { side: 'left', ...ANY, to: 'A1', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'A3', ...toRightEdge },
    ],
  },
  A3: {
    id: 'A3',
    name: { ru: 'Агора · Стена', el: 'Αγορά · Τείχος' },
    bg: AGORA,
    platforms: [floor(0, W), { x: 760, y: 320, w: 200, h: 180 }],
    enemies: [{ type: 'slime', id: 'slime_a3', x: 400 }],
    exits: [
      { side: 'left', ...ANY, to: 'A2', ...toLeftEdge },
      { side: 'right', yMin: -200, yMax: 320, to: 'R1', ...toRightEdge },
    ],
  },
  R1: {
    id: 'R1',
    name: { ru: 'Акрополь · Пропилеи', el: 'Ακρόπολη · Προπύλαια' },
    bg: ACROPOLIS,
    platforms: [floor(0, W), ledge(300, 400, 80), ledge(600, 400, 80)],
    enemies: [
      { type: 'shield', id: 'bearer_r1a', x: 450 },
      { type: 'shield', id: 'bearer_r1b', x: 760 },
    ],
    exits: [
      { side: 'left', ...ANY, to: 'A3', toX: 900, toY: 290 },
      { side: 'right', ...ANY, to: 'R2', ...toRightEdge },
    ],
  },
  R2: {
    id: 'R2',
    name: { ru: 'Акрополь · Парфенон', el: 'Ακρόπολη · Παρθενώνας' },
    bg: ACROPOLIS,
    platforms: [floor(0, W), ledge(160, 380, 120), ledge(680, 380, 120)],
    boss: { x: 720 },
    exits: [{ side: 'left', ...ANY, to: 'R1', ...toLeftEdge }],
  },
};
