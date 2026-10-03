import { PLAYER } from "./movement.ts";
import { groundSegments } from "./ground.ts";
import type { GroundHole } from "./ground.ts";
import type { ObstacleDefinition } from "./obstacles.ts";

export interface StageEndpoint {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const ENDPOINT_SYMBOLS = { start: "I", goal: "G" } as const;

export function endpointPosition(endpoint: StageEndpoint): { x: number; bottom: number } {
  return { x: endpoint.x + endpoint.width / 2, bottom: endpoint.y + endpoint.height };
}

export function validateEndpoint(endpoint: StageEndpoint, name: string, groundY: number,
  obstacles: readonly ObstacleDefinition[], holes: readonly GroundHole[]): void {
  if (![endpoint.x, endpoint.y, endpoint.width, endpoint.height, endpoint.x + endpoint.width,
    endpoint.y + endpoint.height].every(Number.isFinite) || endpoint.width <= 0 || endpoint.height <= 0) {
    throw new Error(`${name}の位置・大きさが不正です`);
  }
  const { x, bottom } = endpointPosition(endpoint);
  const left = x - PLAYER.width / 2, right = x + PLAYER.width / 2, top = bottom - PLAYER.height;
  if (top < 0 || bottom > groundY || obstacles.some(rock => left < rock.x + rock.width && right > rock.x &&
    top < rock.y + rock.height && bottom > rock.y)) {
    throw new Error(`${name}の身体が岩または画面上端に重なっています`);
  }
  const surfaces = bottom === groundY ? groundSegments(left, right, holes)
    : obstacles.filter(rock => rock.y === bottom).map(rock => ({ left: rock.x, right: rock.x + rock.width }));
  let covered = left;
  for (const surface of [...surfaces].sort((a, b) => a.left - b.left)) {
    if (surface.left > covered + 1e-6) break;
    covered = Math.max(covered, surface.right);
  }
  if (covered < right - 1e-6) throw new Error(`${name}の足元を支える床または岩上面が足りません`);
}
