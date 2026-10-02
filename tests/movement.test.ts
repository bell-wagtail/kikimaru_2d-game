import { test } from "node:test";
import assert from "node:assert/strict";
import { InputState, keyActions } from "../src/input.ts";
import { applyMovement, MovementState, PLAYER } from "../src/movement.ts";
import { PowerUpState } from "../src/powerUps.ts";
import { ITEM_TYPES } from "../src/items.ts";

const maxSpeed = PLAYER.speed * PLAYER.dashMultiplier;
const gain = (maxSpeed - PLAYER.speed) / PLAYER.accelerationSeconds;
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
function setup(direction = 1) {
  const input = new InputState(), motion = new MovementState();
  const powers = new PowerUpState();
  const body = {
    blocked: { down: true, left: false, right: false }, touching: { down: false }, vx: 0, vy: 0,
    get velocity() { return { y: this.vy }; },
    setVelocityX(value: number) { this.vx = value; },
    setVelocityY(value: number) { this.vy = value; }
  };
  if (direction) input.press("move", direction < 0 ? "left" : "right");
  const step = (dt = 1 / 60) => applyMovement(body, input, motion, dt, powers);
  const advance = (seconds: number, fps = 60) => { for (let i = 0; i < Math.round(seconds * fps); i++) step(1 / fps); };
  return { input, motion, body, step, advance, powers };
}

test("either Shift ramps both directions to the cap and back over the configured durations", () => {
  for (const shift of ["ShiftLeft", "ShiftRight"]) for (const direction of [-1, 1]) {
    const { input, body, step, advance } = setup(direction);
    step(); near(body.vx, direction * PLAYER.speed);
    input.press(shift, keyActions[shift]);
    advance(1); near(body.vx, direction * (PLAYER.speed + gain));
    advance(PLAYER.accelerationSeconds - 1); near(body.vx, direction * maxSpeed);
    advance(2); near(body.vx, direction * maxSpeed);
    input.release(shift);
    advance(1); near(body.vx, direction * (maxSpeed - (maxSpeed - PLAYER.speed) / PLAYER.decelerationSeconds));
    advance(PLAYER.decelerationSeconds - 1); near(body.vx, direction * PLAYER.speed);
    advance(2); near(body.vx, direction * PLAYER.speed);
  }
});

test("1 second accelerating, 0.5 slowing and 1 accelerating preserve progress and reach the cap", () => {
  const { input, body, advance } = setup();
  input.press("shift", "dash"); advance(1); near(body.vx, PLAYER.speed + gain);
  input.release("shift"); advance(0.5); near(body.vx, PLAYER.speed + gain * 0.5);
  input.press("shift", "dash"); advance(1); near(body.vx, maxSpeed);
});

test("elapsed time gives the same acceleration at 30, 60 and 144 updates per second", () => {
  for (const fps of [30, 60, 144]) {
    const { input, body, advance } = setup();
    input.press("shift", "dash"); advance(1, fps); near(body.vx, PLAYER.speed + gain);
    advance(2, fps); near(body.vx, maxSpeed);
    input.release("shift"); advance(PLAYER.decelerationSeconds, fps); near(body.vx, PLAYER.speed);
  }
});

for (const runUp of [0, PLAYER.accelerationSeconds / 2, PLAYER.accelerationSeconds]) test(`jump after ${runUp} seconds keeps its exact launch speed until landing`, () => {
  for (const direction of [-1, 1]) {
    const { input, body, motion, step, advance } = setup(direction);
    if (runUp) { input.press("shift", "dash"); advance(runUp); }
    input.press("jump", "jump"); step(0);
    const expected = direction * (PLAYER.speed + gain * runUp);
    near(body.vx, expected); assert.equal(body.vy, -PLAYER.jumpSpeed);
    body.blocked.down = false; body.vy = -200;
    if (runUp) input.release("shift"); else input.press("shift", "dash");
    advance(1); near(body.vx, expected); assert.equal(body.vy, -200);
    input.release("move"); step(); assert.equal(body.vx, 0);
    input.press("move", direction < 0 ? "left" : "right");
    body.vy = 200; step(); near(body.vx, expected);
    const launchSpeed = motion.speed;
    body.blocked.down = true; body.vy = 0; step();
    near(motion.speed, launchSpeed + (runUp ? -gain : gain) / 60);
  }
});

test("a jump during deceleration keeps the remaining speed rather than dropping to walking speed", () => {
  const { input, body, step, advance } = setup();
  input.press("shift", "dash"); advance(PLAYER.accelerationSeconds);
  input.release("shift"); advance(PLAYER.decelerationSeconds / 2);
  input.press("jump", "jump"); step(0);
  body.blocked.down = false; advance(1);
  near(body.vx, (maxSpeed + PLAYER.speed) / 2); assert.equal(body.vy, -PLAYER.jumpSpeed);
});

test("stale ground flags cannot change launch speed or allow a second jump", () => {
  const { input, body, step, advance } = setup();
  input.press("shift", "dash"); advance(1);
  input.press("jump", "jump"); step(0);
  const launchSpeed = body.vx;
  input.release("shift"); input.release("jump"); input.press("jump", "jump");
  assert.equal(step().jumping, false); near(body.vx, launchSpeed);
});

test("standing, opposing directions and a wall reset the ground run-up; Shift alone cannot charge", () => {
  for (const stop of ["release", "opposing", "wall"]) {
    const { input, motion, body, step, advance } = setup();
    input.press("shift", "dash"); advance(2);
    if (stop === "release") input.release("move");
    if (stop === "opposing") input.press("opposite", "left");
    if (stop === "wall") body.blocked.right = true;
    assert.equal(step().walking, false); advance(4);
    assert.equal(body.vx, 0); assert.equal(motion.speed, PLAYER.speed);
    input.press("jump", "jump"); assert.equal(step().jumping, true);
  }
});

test("reset clears the saved speed even in the air", () => {
  const { input, motion, body, step, advance } = setup();
  input.press("shift", "dash"); advance(2);
  input.press("jump", "jump"); step(); body.blocked.down = false;
  input.clear(); motion.reset(); input.press("move", "right");
  assert.equal(step().dashing, false); assert.equal(body.vx, PLAYER.speed);
});

test("releasing one Shift keeps acceleration active while the other is held", () => {
  const { input, body, advance } = setup();
  input.press("ShiftLeft", "dash"); input.press("ShiftRight", "dash");
  advance(0.5); input.release("ShiftLeft"); advance(0.5); near(body.vx, PLAYER.speed + gain);
  input.release("ShiftRight"); advance(0.5); near(body.vx, PLAYER.speed + gain * 0.5);
});

test("separate touch pointers can move and jump, while held or airborne presses cannot repeat jumps", () => {
  const { input, body, step } = setup(0);
  input.press("pointer:1", "right"); input.press("pointer:2", "jump");
  assert.equal(step().jumping, true); assert.equal(body.vx, PLAYER.speed); assert.equal(body.vy, -PLAYER.jumpSpeed);
  body.vy = 0; input.press("pointer:2", "jump"); assert.equal(step().jumping, false);
  input.release("pointer:2"); input.press("pointer:2", "jump"); assert.equal(step().jumping, true);
  body.blocked.down = false; body.vy = 100;
  input.release("pointer:2"); input.press("pointer:2", "jump"); assert.equal(step().jumping, false);
  body.blocked.down = true; body.vy = 0; assert.equal(step().jumping, false);
  input.release("pointer:2"); assert.equal(input.direction, 1);
});

test("clearing controls stops and clears ground acceleration and queued jumps", () => {
  const { input, body, motion, step, advance } = setup();
  input.press("shift", "dash"); advance(2); input.press("jump", "jump"); input.clear();
  assert.equal(step().jumping, false); assert.equal(body.vx, 0); assert.equal(motion.speed, PLAYER.speed);
  input.press("move", "right"); step(); assert.equal(body.vx, PLAYER.speed);
});

test("opposing directions cancel while independent bindings stay held", () => {
  const { input, body, step } = setup(0);
  input.press("ArrowLeft", "left"); input.press("KeyA", "left"); input.press("ArrowRight", "right");
  step(); assert.equal(body.vx, 0);
  input.release("ArrowRight"); input.release("KeyA"); step(); assert.equal(body.vx, -PLAYER.speed);
});

test("tea accelerates like Shift in both directions and cannot charge while stopped or blocked", () => {
  for (const direction of [-1, 1]) {
    const tea = setup(direction), shift = setup(direction);
    tea.powers.acquire("tea"); shift.input.press("shift", "dash");
    for (let i = 0; i < 180; i++) { tea.step(); shift.step(); near(tea.body.vx, shift.body.vx); }
    tea.input.release("move"); tea.advance(1); near(tea.motion.speed, PLAYER.speed);
    tea.input.press("move", direction < 0 ? "left" : "right");
    tea.body.blocked[direction < 0 ? "left" : "right"] = true;
    tea.advance(1); near(tea.body.vx, 0); near(tea.motion.speed, PLAYER.speed);
  }
});

test("airborne tea acquisition and expiration preserve speed until landing; Shift still works after expiry", () => {
  const { input, body, step, advance, powers } = setup();
  input.press("jump", "jump"); step(0); body.blocked.down = false;
  powers.acquire("tea"); advance(1); near(body.vx, PLAYER.speed);
  body.blocked.down = true; body.vy = 0; advance(PLAYER.accelerationSeconds);
  near(body.vx, maxSpeed);
  input.release("jump"); input.press("jump", "jump"); step(0); body.blocked.down = false;
  powers.advance(ITEM_TYPES.tea.durationSeconds); advance(1); near(body.vx, maxSpeed);
  body.blocked.down = true; body.vy = 0; step(); near(body.vx, maxSpeed - gain / 60);
  input.press("shift", "dash"); step(); near(body.vx, maxSpeed);
  input.release("shift"); advance(PLAYER.decelerationSeconds); near(body.vx, PLAYER.speed);
});

test("shrimp permits exactly one air jump with stale ground flags and restores it on a real landing", () => {
  const { input, body, step, powers, motion } = setup();
  powers.acquire("shrimp"); input.press("jump", "jump"); assert.equal(step(0).jumping, true);
  input.release("jump"); input.press("jump", "jump");
  assert.equal(step(0).jumping, true); near(body.vy, -PLAYER.jumpSpeed * PLAYER.airJumpMultiplier);
  assert.equal(motion.airJumpUsed, true);
  body.blocked.down = false; body.vy = 100;
  input.release("jump"); input.press("jump", "jump");
  assert.equal(step(0).jumping, false); near(body.vy, 100);
  body.blocked.down = true; body.vy = 0;
  assert.equal(step(0).jumping, false); assert.equal(motion.airJumpUsed, false);
  input.release("jump"); input.press("jump", "jump"); assert.equal(step(0).jumping, true);
  body.blocked.down = false; input.release("jump"); input.press("jump", "jump");
  assert.equal(step(0).jumping, true);
});

test("walking off a ledge and acquiring shrimp in midair allow one jump, including touch input", () => {
  const { input, body, step, powers } = setup(0);
  body.blocked.down = false; body.vy = 200;
  input.press("pointer:1", "jump"); assert.equal(step().jumping, false);
  powers.acquire("shrimp"); assert.equal(step().jumping, false);
  input.release("pointer:1"); input.press("pointer:1", "jump");
  assert.equal(step().jumping, true); near(body.vy, -PLAYER.jumpSpeed * PLAYER.airJumpMultiplier);
  body.vy = 100; input.press("pointer:2", "jump"); assert.equal(step().jumping, false);
  input.release("pointer:1"); input.release("pointer:2"); input.press("pointer:2", "jump");
  assert.equal(step().jumping, false);
});

test("expiration blocks unused air jumps and reacquiring shrimp cannot recharge a used jump in midair", () => {
  const { input, body, step, powers } = setup();
  body.blocked.down = false; body.vy = 100;
  powers.acquire("shrimp"); powers.advance(ITEM_TYPES.shrimp.durationSeconds);
  input.press("jump", "jump"); assert.equal(step().jumping, false);
  powers.acquire("shrimp"); input.release("jump"); input.press("jump", "jump");
  assert.equal(step().jumping, true);
  powers.advance(ITEM_TYPES.shrimp.durationSeconds); powers.acquire("shrimp"); body.vy = 100;
  input.release("jump"); input.press("jump", "jump");
  assert.equal(step().jumping, false); near(body.vy, 100);
});

test("both powers preserve horizontal launch speed on the second jump and reset to ordinary movement", () => {
  const { input, body, step, advance, powers, motion } = setup();
  powers.acquire("tea"); powers.acquire("shrimp"); advance(PLAYER.accelerationSeconds / 2);
  input.press("jump", "jump"); step(0); const speed = body.vx;
  body.blocked.down = false; body.vy = 100;
  input.release("jump"); input.press("jump", "jump"); assert.equal(step().jumping, true);
  near(body.vx, speed);
  powers.reset(); motion.reset(); input.clear(); body.blocked.down = true; body.vy = 0;
  input.press("move", "right"); step(); near(body.vx, PLAYER.speed);
  body.blocked.down = false; input.press("jump", "jump"); assert.equal(step().jumping, false);
});
