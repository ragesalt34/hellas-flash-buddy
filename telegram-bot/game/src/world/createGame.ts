import Phaser from 'phaser';
import { GRAVITY, H, W } from './constants';
import { GameScene, type SceneDeps } from './GameScene';

export function createGame(parent: HTMLElement, deps: SceneDeps): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#1d2a3a',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: GRAVITY }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [new GameScene(deps)],
  });
  // Dev-only handle for poking the world from the browser console.
  if (import.meta.env.DEV) (window as unknown as { __game?: Phaser.Game }).__game = game;
  return game;
}
