import Phaser from 'phaser';
import type { Bus, ChallengeSource, ToastKey } from '../bus';
import type { ChallengeKind } from '../learning/types';
import type { AbilityId, SaveData } from '../save';
import { COLORS, COOLDOWN_MS, H, W } from './constants';
import { Player } from './Player';
import { ROOMS, type Rect, type RoomDef, type RoomId } from './rooms';

export interface SceneDeps {
  bus: Bus;
  save: SaveData;
  persist(save: SaveData): void;
}

export interface Interactable {
  id: string;
  x: number;
  y: number;
  run: () => Promise<void>;
}

type KeyName = 'left' | 'right' | 'a' | 'd' | 'jump' | 'up' | 'attack' | 'dash' | 'interact';

interface Breakable {
  id: string;
  rect: Phaser.GameObjects.Rectangle;
  hits: number;
  lastSwing: number;
}
interface Altar {
  id: AbilityId;
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}
interface Amphora {
  id: string;
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class GameScene extends Phaser.Scene {
  protected player!: Player;
  protected room!: RoomDef;
  protected platforms!: Phaser.Physics.Arcade.StaticGroup;
  protected roomObjects: Phaser.GameObjects.GameObject[] = [];
  protected roomColliders: Phaser.Physics.Arcade.Collider[] = [];
  protected cooldowns = new Map<string, number>();
  private keys!: Record<KeyName, Phaser.Input.Keyboard.Key>;
  private walls: Breakable[] = [];
  private altars: Altar[] = [];
  private amphorae: Amphora[] = [];
  private frozen = false;
  private interactLockUntil = 0;
  private pendingResults = new Map<string, (correct: boolean) => void>();
  private requestSeq = 0;
  private entry = { x: 0, y: 0 };

  constructor(protected readonly deps: SceneDeps) {
    super('game');
  }

  get save(): SaveData {
    return this.deps.save;
  }

  create(): void {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      jump: 'SPACE',
      up: 'UP',
      attack: 'J',
      dash: 'K',
      interact: 'E',
    }) as Record<KeyName, Phaser.Input.Keyboard.Key>;
    this.platforms = this.physics.add.staticGroup();
    this.player = new Player(this, this.save.x, this.save.y, { ...this.save.abilities }, this.save.maxHp);
    this.physics.add.collider(this.player.rect, this.platforms);

    const offResult = this.deps.bus.on('challenge:result', ({ requestId, correct }) => {
      const resolve = this.pendingResults.get(requestId);
      if (!resolve) return;
      this.pendingResults.delete(requestId);
      resolve(correct);
    });
    const offPause = this.deps.bus.on('game:pause', ({ paused }) => this.setFrozen(paused));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offResult();
      offPause();
    });

    this.loadRoom(this.save.room as RoomId, this.save.x, this.save.y);
  }

  update(time: number): void {
    if (this.frozen) return;
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    this.player.update(time, {
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      jumpDown: JD(k.jump) || JD(k.up),
      jumpHeld: k.jump.isDown || k.up.isDown,
      attackDown: JD(k.attack),
      dashDown: JD(k.dash),
    });
    const interact = JD(k.interact) && time >= this.interactLockUntil;

    if (this.checkExits()) return;
    if (this.player.rect.y > H + 40) {
      this.damagePlayer(time, 1, this.player.rect.x, true);
      if (this.player.hp > 0) this.player.place(this.entry.x, this.entry.y);
      return;
    }
    this.updateEnemies(time);
    const box = this.player.attackBox(time);
    if (box) {
      this.hitWalls(box);
      this.hitEnemies(box, time);
    }
    this.updateLabels(time);
    if (interact) void this.tryInteract(time);
  }

  // ---- hooks for enemies / boss (subclasses) ----
  protected buildEnemies(_room: RoomDef): void {}
  protected updateEnemies(_time: number): void {}
  protected hitEnemies(_box: Phaser.Geom.Rectangle, _time: number): void {}
  protected clearEnemies(): void {}
  protected nearInteractables(_time: number): Interactable[] {
    return [];
  }

  // ---- rooms ----
  protected loadRoom(id: RoomId, x: number, y: number): void {
    this.clearRoom();
    const room = ROOMS[id];
    this.room = room;
    this.entry = { x, y };
    this.cameras.main.setBackgroundColor(room.bg);

    for (const p of room.platforms) this.addPlatform(p, COLORS.platform);
    for (const w of room.walls ?? []) {
      if (this.save.walls.includes(w.id)) continue;
      const rect = this.addPlatform(w.rect, COLORS.wall);
      this.walls.push({ id: w.id, rect, hits: 0, lastSwing: -1 });
    }
    for (const a of room.altars ?? []) {
      if (this.save.abilities[a.id]) continue;
      const rect = this.track(this.add.rectangle(a.x, 470, 40, 60, COLORS.altar));
      this.altars.push({ id: a.id, rect, label: this.makeLabel(a.x, 420) });
    }
    for (const a of room.amphorae ?? []) {
      if (this.save.amphorae.includes(a.id)) continue;
      const rect = this.track(this.add.rectangle(a.x, a.y - 14, 20, 28, COLORS.amphora));
      this.amphorae.push({ id: a.id, rect, label: this.makeLabel(a.x, a.y - 48) });
    }

    const has = (side: 'left' | 'right') => room.exits.some((e) => e.side === side);
    this.physics.world.setBounds(0, 0, W, H);
    this.physics.world.setBoundsCollision(!has('left'), !has('right'), true, false);
    this.buildEnemies(room); // after the bounds: the boss room overrides them

    this.player.place(x, y);
    this.save.room = id;
    this.save.x = x;
    this.save.y = y;
    this.persist();
    this.emitHud();
  }

  private clearRoom(): void {
    this.clearEnemies();
    this.roomColliders.forEach((c) => c.destroy());
    this.roomColliders = [];
    this.platforms.clear(true, true);
    this.roomObjects.forEach((o) => o.destroy());
    this.roomObjects = [];
    this.walls = [];
    this.altars = [];
    this.amphorae = [];
  }

  private addPlatform(r: Rect, color: number): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, color);
    this.platforms.add(rect);
    return rect;
  }

  protected track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.roomObjects.push(obj);
    return obj;
  }

  protected makeLabel(x: number, y: number): Phaser.GameObjects.Text {
    return this.track(
      this.add
        .text(x, y, 'E', { fontSize: '16px', color: '#f2e8cf', backgroundColor: '#00000088', padding: { x: 4, y: 1 } })
        .setOrigin(0.5)
        .setDepth(20)
        .setVisible(false),
    );
  }

  private checkExits(): boolean {
    const { x, y } = this.player.rect;
    const side = x < -4 ? 'left' : x > W + 4 ? 'right' : null;
    if (!side) return false;
    const exit = this.room.exits.find((e) => e.side === side && y >= e.yMin && y <= e.yMax);
    if (!exit) {
      this.player.place(side === 'left' ? 12 : W - 12, y);
      return false;
    }
    this.loadRoom(exit.to, exit.toX, exit.toY);
    return true;
  }

  // ---- breakable walls ----
  private hitWalls(box: Phaser.Geom.Rectangle): void {
    for (const w of [...this.walls]) {
      if (w.lastSwing === this.player.swing) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(box, w.rect.getBounds())) continue;
      w.lastSwing = this.player.swing;
      w.hits++;
      this.tweens.add({ targets: w.rect, alpha: 0.4, yoyo: true, duration: 60 });
      if (w.hits >= 3) {
        this.platforms.remove(w.rect, true, true);
        this.walls = this.walls.filter((x) => x !== w);
        this.save.walls.push(w.id);
        this.persist();
        this.toast('wallBroken');
      }
    }
  }

  // ---- interactions ----
  protected isNear(x: number, y: number): boolean {
    return Math.abs(this.player.rect.x - x) < 50 && Math.abs(this.player.rect.y - y) < 60;
  }

  protected ready(id: string, time: number): boolean {
    return (this.cooldowns.get(id) ?? 0) <= time;
  }

  protected coolDown(id: string): void {
    this.cooldowns.set(id, this.time.now + COOLDOWN_MS);
  }

  private updateLabels(time: number): void {
    for (const a of this.altars) a.label.setVisible(this.isNear(a.rect.x, a.rect.y) && this.ready(a.id, time));
    for (const a of this.amphorae) a.label.setVisible(this.isNear(a.rect.x, a.rect.y) && this.ready(a.id, time));
  }

  private async tryInteract(time: number): Promise<void> {
    const altar = this.altars.find((a) => this.isNear(a.rect.x, a.rect.y) && this.ready(a.id, time));
    if (altar) {
      const ok = await this.requestChallenge('altar', altar.id === 'dash' ? 'word' : 'exam');
      if (!ok) return this.coolDown(altar.id);
      this.save.altarProgress[altar.id]++;
      if (this.save.altarProgress[altar.id] >= 3) this.grant(altar);
      else this.toast('altarProgress', String(this.save.altarProgress[altar.id]));
      this.persist();
      return;
    }
    const amph = this.amphorae.find((a) => this.isNear(a.rect.x, a.rect.y) && this.ready(a.id, time));
    if (amph) {
      const ok = await this.requestChallenge('amphora', 'any');
      if (!ok) return this.coolDown(amph.id);
      this.save.amphorae.push(amph.id);
      this.save.maxHp++;
      this.player.maxHp = this.save.maxHp;
      this.player.hp = this.player.maxHp;
      amph.rect.destroy();
      amph.label.destroy();
      this.amphorae = this.amphorae.filter((a) => a !== amph);
      this.persist();
      this.toast('heartUp');
      this.emitHud();
      return;
    }
    const other = this.nearInteractables(time).find((o) => this.isNear(o.x, o.y));
    if (other) await other.run();
  }

  private grant(altar: Altar): void {
    this.save.abilities[altar.id] = true;
    this.player.abilities[altar.id] = true;
    altar.rect.destroy();
    altar.label.destroy();
    this.altars = this.altars.filter((a) => a !== altar);
    this.toast(altar.id === 'dash' ? 'abilityDash' : 'abilityDoubleJump');
    this.emitHud();
  }

  /** Freeze the world, ask the overlay for a challenge, resume with the result. */
  protected requestChallenge(
    source: ChallengeSource,
    kind: ChallengeKind | 'any',
    preferTopics?: string[],
  ): Promise<boolean> {
    const requestId = `r${++this.requestSeq}`;
    this.setFrozen(true);
    return new Promise((resolve) => {
      this.pendingResults.set(requestId, (correct) => {
        this.setFrozen(false);
        resolve(correct);
      });
      this.deps.bus.emit('challenge:request', { requestId, source, kind, preferTopics });
    });
  }

  private setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    const kb = this.input.keyboard!;
    if (frozen) {
      this.physics.pause();
      kb.enabled = false;
    } else {
      this.physics.resume();
      kb.enabled = true;
      kb.resetKeys();
      this.interactLockUntil = this.time.now + 300; // the key that closed the dialog must not re-open one
    }
  }

  // ---- player state ----
  protected damagePlayer(time: number, dmg: number, fromX: number, force = false): void {
    if (force) this.player.hp = Math.max(0, this.player.hp - dmg);
    else if (!this.player.hurt(time, dmg, fromX)) return;
    this.emitHud();
    if (this.player.hp <= 0) this.die();
  }

  private die(): void {
    this.toast('died');
    this.player.hp = this.player.maxHp;
    this.loadRoom(this.save.room as RoomId, this.save.x, this.save.y);
  }

  protected emitHud(): void {
    this.deps.bus.emit('hud:update', {
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      dash: this.save.abilities.dash,
      doubleJump: this.save.abilities.doubleJump,
      room: this.room.id,
    });
  }

  protected toast(key: ToastKey, value?: string): void {
    this.deps.bus.emit('toast', { key, value });
  }

  protected persist(): void {
    this.deps.persist(this.save);
  }
}
