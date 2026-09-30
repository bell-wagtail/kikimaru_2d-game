import type { InputState } from "./input.ts";

export const WORLD = { width: 1200, height: 650, ground: 550 } as const;
export const PLAYER = { width: 90, height: 180, scale: 0.39, speed: 260, dashMultiplier: 1.6, jumpSpeed: 620, gravity: 1600 } as const;

export interface MotionBody {
  blocked: { down: boolean; left: boolean; right: boolean };
  touching: { down: boolean };
  setVelocityX(value: number): unknown;
  setVelocityY(value: number): unknown;
}

export function applyMovement(body: MotionBody, input: InputState): { facing: number; walking: boolean; jumping: boolean; dashing: boolean } {
  const direction = input.direction;
  const grounded = body.blocked.down || body.touching.down;
  body.setVelocityX(direction * PLAYER.speed * (input.active("dash") ? PLAYER.dashMultiplier : 1));
  // Consume airborne presses too, so landing does not trigger a delayed second jump.
  const jumping = input.consumeJump() && grounded;
  if (jumping) body.setVelocityY(-PLAYER.jumpSpeed);
  const atEdge = (direction < 0 && body.blocked.left) || (direction > 0 && body.blocked.right);
  const moving = direction !== 0 && !atEdge;
  return { facing: direction, walking: grounded && !jumping && moving, jumping, dashing: moving && input.active("dash") };
}
