import type { InputState } from "./input.ts";

export const WORLD = { width: 1200, height: 650, ground: 550 } as const;
export const PLAYER = {
  width: 90, height: 180, scale: 0.39,
  speed: 260, dashMultiplier: 1.6, accelerationSeconds: 3, decelerationSeconds: 3,
  jumpSpeed: 620, gravity: 1600
} as const;

export interface MotionBody {
  readonly velocity: { y: number };
  blocked: { down: boolean; left: boolean; right: boolean };
  touching: { down: boolean };
  setVelocityX(value: number): unknown;
  setVelocityY(value: number): unknown;
}

export class MovementState {
  speed: number = PLAYER.speed;

  reset(): void { this.speed = PLAYER.speed; }
}

export function applyMovement(body: MotionBody, input: InputState, state: MovementState, deltaSeconds: number): { facing: number; walking: boolean; jumping: boolean; dashing: boolean; pace: number } {
  const direction = input.direction;
  // Ground flags may still be set between the jump impulse and the next physics step.
  const grounded = (body.blocked.down || body.touching.down) && body.velocity.y >= 0;
  const atEdge = (direction < 0 && body.blocked.left) || (direction > 0 && body.blocked.right);
  const moving = direction !== 0 && !atEdge;
  if (grounded) {
    if (!moving) state.reset();
    else {
      const maxSpeed = PLAYER.speed * PLAYER.dashMultiplier;
      const accelerating = input.active("dash");
      const target = accelerating ? maxSpeed : PLAYER.speed;
      const seconds = accelerating ? PLAYER.accelerationSeconds : PLAYER.decelerationSeconds;
      const change = (maxSpeed - PLAYER.speed) / seconds * Math.max(0, deltaSeconds);
      state.speed = accelerating ? Math.min(target, state.speed + change) : Math.max(target, state.speed - change);
    }
  }
  body.setVelocityX(moving ? direction * state.speed : 0);
  // Consume airborne presses too, so landing does not trigger a delayed second jump.
  const jumping = input.consumeJump() && grounded;
  if (jumping) body.setVelocityY(-PLAYER.jumpSpeed);
  return { facing: direction, walking: grounded && !jumping && moving, jumping,
    dashing: moving && state.speed > PLAYER.speed, pace: state.speed / PLAYER.speed };
}
