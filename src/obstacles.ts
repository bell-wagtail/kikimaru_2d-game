export type ObstacleKind = "rock";

export interface ObstacleDefinition {
  readonly id: string;
  readonly kind: ObstacleKind;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Bounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export function validateObstacles(definitions: readonly ObstacleDefinition[]): void {
  const ids = new Set<string>();
  for (const obstacle of definitions) {
    if (!obstacle.id || ids.has(obstacle.id) || obstacle.kind !== "rock" ||
        ![obstacle.x, obstacle.y, obstacle.width, obstacle.height].every(Number.isFinite) ||
        obstacle.width <= 0 || obstacle.height <= 0) {
      throw new Error(`障害物のID・種類・座標・大きさが不正です: ${obstacle.id}`);
    }
    ids.add(obstacle.id);
  }
}

export function sideContacts(player: Bounds, obstacles: readonly Bounds[]): { left: boolean; right: boolean } {
  const epsilon = 1e-6;
  let left = false, right = false;
  for (const obstacle of obstacles) {
    if (player.bottom <= obstacle.top + epsilon || player.top >= obstacle.bottom - epsilon) continue;
    left ||= Math.abs(player.left - obstacle.right) <= epsilon;
    right ||= Math.abs(player.right - obstacle.left) <= epsilon;
  }
  return { left, right };
}
