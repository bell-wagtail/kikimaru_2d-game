import { PLAYER, WORLD } from "./movement.ts";
import { endpointPosition } from "./endpoints.ts";
import type { StageEndpoint } from "./endpoints.ts";
import type { ItemDefinition } from "./items.ts";
import type { Bounds } from "./obstacles.ts";

export interface WallDefinition {
  readonly left?: number;
  readonly right?: number;
}

export const WALL_SYMBOLS = { left: "L", right: "R" } as const;

export function validateWalls(walls: WallDefinition | undefined, start?: StageEndpoint, goal?: StageEndpoint,
  items: readonly ItemDefinition[] = [], name = "ステージの壁"): void {
  if (!walls) return;
  for (const side of ["left", "right"] as const) {
    if (walls[side] !== undefined && !Number.isFinite(walls[side])) throw new Error(`${name}の座標が不正です`);
  }
  if (walls.left !== undefined && walls.right !== undefined &&
    (!Number.isFinite(walls.right - walls.left) || walls.right - walls.left < PLAYER.width)) {
    throw new Error(`${name}はLをRより左に置き、身体の幅以上の間隔を空けてください`);
  }
  const inside = (left: number, right: number) => (walls.left === undefined || left >= walls.left) &&
    (walls.right === undefined || right <= walls.right);
  const startX = start ? endpointPosition(start).x : WORLD.width / 2;
  if (!inside(startX - PLAYER.width / 2, startX + PLAYER.width / 2)) {
    throw new Error(`${name}の外側または壁に重なる位置にスタートがあります`);
  }
  if (goal) {
    const x = endpointPosition(goal).x;
    if (!inside(x - PLAYER.width / 2, x + PLAYER.width / 2)) {
      throw new Error(`${name}の外側または壁に重なる位置にゴールがあります`);
    }
  }
  if (items.some(item => !inside(item.x, item.x + item.width))) {
    throw new Error(`${name}の外側にアイテムまたはクイズがあります。満点を取得できる範囲へ配置してください`);
  }
}

export function localWalls(walls: WallDefinition, originX: number): WallDefinition {
  return {
    left: walls.left === undefined ? undefined : walls.left - originX,
    right: walls.right === undefined ? undefined : walls.right - originX
  };
}

export function wallContacts(player: Bounds, walls: WallDefinition): { left: boolean; right: boolean } {
  const epsilon = 1e-6;
  return {
    left: walls.left !== undefined && player.left <= walls.left + epsilon,
    right: walls.right !== undefined && player.right >= walls.right - epsilon
  };
}
