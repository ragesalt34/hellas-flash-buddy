import Phaser from 'phaser';
import { COLORS, PLAYER } from './constants';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpDown: boolean;
  jumpHeld: boolean;
  attackDown: boolean;
  dashDown: boolean;
}

export interface Abilities {
  dash: boolean;
  doubleJump: boolean;
}

export class Player {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  facing: 1 | -1 = 1;
  hp: number;
  swing = 0; // increments per attack so a target is hit once per swing
  private jumpsLeft = 0;
  private wasOnFloor = false;
  private dashUntil = 0;
  private dashReadyAt = 0;
  private airDashUsed = false;
  private attackUntil = 0;
  private attackReadyAt = 0;
  private invulnUntil = 0;
  private knockUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, public abilities: Abilities, public maxHp: number) {
    this.rect = scene.add.rectangle(x, y, PLAYER.w, PLAYER.h, COLORS.player).setDepth(10);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocityY(900);
    this.hp = maxHp;
  }

  update(time: number, input: PlayerInput): void {
    this.rect.setAlpha(time < this.invulnUntil && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);
    const onFloor = this.body.blocked.down;
    const maxJumps = this.abilities.doubleJump ? 2 : 1;
    if (onFloor) {
      this.jumpsLeft = maxJumps;
      this.airDashUsed = false;
    } else if (this.wasOnFloor && this.body.velocity.y >= 0) {
      this.jumpsLeft = maxJumps - 1; // walked off a ledge: the ground jump is gone
    }
    this.wasOnFloor = onFloor;

    if (time < this.dashUntil) return; // the dash owns the body until it ends
    this.body.setAllowGravity(true);
    if (time < this.knockUntil) return;

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.body.setVelocityX(dir * PLAYER.run);
    if (dir !== 0) this.facing = dir > 0 ? 1 : -1;

    if (input.jumpDown && this.jumpsLeft > 0) {
      this.body.setVelocityY(PLAYER.jump);
      this.jumpsLeft--;
    }
    if (!input.jumpHeld && this.body.velocity.y < PLAYER.jumpCut) this.body.setVelocityY(PLAYER.jumpCut);

    if (input.dashDown && this.abilities.dash && time >= this.dashReadyAt && !this.airDashUsed) {
      this.dashUntil = time + PLAYER.dashMs;
      this.dashReadyAt = time + PLAYER.dashCooldown;
      if (!onFloor) this.airDashUsed = true;
      this.body.setAllowGravity(false);
      this.body.setVelocity(this.facing * PLAYER.dashSpeed, 0);
    }

    if (input.attackDown && time >= this.attackReadyAt) {
      this.attackUntil = time + PLAYER.attackMs;
      this.attackReadyAt = time + PLAYER.attackCooldown;
      this.swing++;
    }
  }

  attackBox(time: number): Phaser.Geom.Rectangle | null {
    if (time >= this.attackUntil) return null;
    const w = 44;
    const x = this.facing > 0 ? this.rect.x + PLAYER.w / 2 : this.rect.x - PLAYER.w / 2 - w;
    return new Phaser.Geom.Rectangle(x, this.rect.y - 16, w, 32);
  }

  /** Returns true if the hit landed (not invulnerable). */
  hurt(time: number, dmg: number, fromX: number): boolean {
    if (time < this.invulnUntil || time < this.dashUntil) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.invulnUntil = time + 1000;
    this.knockUntil = time + 200;
    this.body.setAllowGravity(true);
    this.body.setVelocity((this.rect.x >= fromX ? 1 : -1) * 250, -250);
    return true;
  }

  place(x: number, y: number): void {
    this.body.reset(x, y);
    this.dashUntil = 0;
    this.knockUntil = 0;
    this.body.setAllowGravity(true);
  }
}
