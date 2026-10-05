export type ItemId = 'water' | 'bread' | 'fish' | 'ticket' | 'key';

export interface WorldState {
  flags: string[];
  inventory: ItemId[];
}

export interface Cond {
  flag?: string;
  notFlag?: string;
  has?: ItemId;
  lacks?: ItemId;
}

export type Effect = { give: ItemId } | { take: ItemId } | { set: string } | { exam: true };

export interface Reply {
  text: string; // what the player says (Greek)
  correct: boolean;
  answer: string[]; // what the NPC says back
  effects?: Effect[]; // applied only when correct
}

export interface Rule {
  when?: Cond[];
  say: string[];
  replies?: Reply[];
  effects?: Effect[]; // applied on talk when there are no replies, or with the correct reply
}

export type NpcKind = 'person' | 'object' | 'historian';

export interface NpcDef {
  id: string;
  scene: string;
  kind: NpcKind;
  rules: Rule[]; // first match wins; the last rule should have no conditions
}

export const MAX_ITEMS = 6;

export function matches(c: Cond, w: WorldState): boolean {
  if (c.flag !== undefined && !w.flags.includes(c.flag)) return false;
  if (c.notFlag !== undefined && w.flags.includes(c.notFlag)) return false;
  if (c.has !== undefined && !w.inventory.includes(c.has)) return false;
  if (c.lacks !== undefined && w.inventory.includes(c.lacks)) return false;
  return true;
}

export function pickRule(npc: NpcDef, w: WorldState): Rule | null {
  return npc.rules.find((r) => (r.when ?? []).every((c) => matches(c, w))) ?? null;
}

export function applyEffects(w: WorldState, effects: Effect[] = []): { world: WorldState; exam: boolean } {
  let flags = w.flags;
  let inventory = w.inventory;
  let exam = false;
  for (const e of effects) {
    if ('give' in e) {
      if (!inventory.includes(e.give) && inventory.length < MAX_ITEMS) inventory = [...inventory, e.give];
    } else if ('take' in e) {
      if (inventory.includes(e.take)) inventory = inventory.filter((i) => i !== e.take);
    } else if ('set' in e) {
      if (!flags.includes(e.set)) flags = [...flags, e.set];
    } else {
      exam = true;
    }
  }
  return { world: flags === w.flags && inventory === w.inventory ? w : { flags, inventory }, exam };
}
