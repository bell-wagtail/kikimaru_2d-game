import { test } from "node:test";
import assert from "node:assert/strict";
import { InputState, keyActions } from "../src/input.ts";
import { applyMovement, MovementState, PLAYER } from "../src/movement.ts";

for (const dashAtTakeoff of [false, true]) {
  test(`${dashAtTakeoff ? "dash" : "walk"} jump keeps its speed mode despite Shift changes until landing`, () => {
    for (const direction of [-1, 1]) {
      const input = new InputState(), body = makeBody(), motion = new MovementState();
      input.press("move", direction < 0 ? "left" : "right");
      if (dashAtTakeoff) input.press("shift", "dash");
      input.press("jump", "jump");
      assert.equal(applyMovement(body, input, motion).jumping, true);
      assert.equal(body.vy, -PLAYER.jumpSpeed);
      body.blocked.down = false;
      body.vy = -200;
      if (dashAtTakeoff) input.release("shift");
      else input.press("shift", "dash");
      const expected = direction * PLAYER.speed * (dashAtTakeoff ? PLAYER.dashMultiplier : 1);
      assert.equal(applyMovement(body, input, motion).dashing, dashAtTakeoff);
      assert.equal(body.vx, expected);
      assert.equal(body.vy, -200);
      input.release("move");
      applyMovement(body, input, motion);
      assert.equal(body.vx, 0);
      input.press("move", direction < 0 ? "left" : "right");
      body.vy = 200;
      applyMovement(body, input, motion);
      assert.equal(body.vx, expected);
      body.blocked.down = true;
      body.vy = 0;
      assert.equal(applyMovement(body, input, motion).dashing, !dashAtTakeoff);
      assert.equal(body.vx, direction * PLAYER.speed * (dashAtTakeoff ? 1 : PLAYER.dashMultiplier));
    }
  });
}

test("stale ground flags after takeoff cannot change the latched dash or allow another jump", () => {
  const input = new InputState(), body = makeBody(), motion = new MovementState();
  input.press("move", "right"); input.press("shift", "dash"); input.press("jump", "jump");
  applyMovement(body, input, motion);
  input.release("shift"); input.release("jump"); input.press("jump", "jump");
  const movement = applyMovement(body, input, motion);
  assert.equal(movement.jumping, false);
  assert.equal(movement.dashing, true);
  assert.equal(body.vx, PLAYER.speed * PLAYER.dashMultiplier);
});

test("reset clears the saved takeoff mode even if the body is still airborne", () => {
  const input = new InputState(), body = makeBody(), motion = new MovementState();
  input.press("move", "right"); input.press("shift", "dash"); input.press("jump", "jump");
  applyMovement(body, input, motion);
  body.blocked.down = false;
  input.clear(); motion.reset();
  input.press("move", "right");
  assert.equal(applyMovement(body, input, motion).dashing, false);
  assert.equal(body.vx, PLAYER.speed);
});

function makeBody() {
  return {
    blocked: { down: true, left: false, right: false },
    touching: { down: false },
    vx: 0, vy: 0,
    get velocity() { return { y: this.vy }; },
    setVelocityX(value: number) { this.vx = value; },
    setVelocityY(value: number) { this.vy = value; }
  };
}

test("moving and jumping can be held by separate touch pointers", () => {
  const input = new InputState();
  const body = makeBody();
  const motion = new MovementState();
  input.press("pointer:1", "right");
  input.press("pointer:2", "jump");
  assert.equal(applyMovement(body, input, motion).jumping, true);
  assert.equal(body.vx, PLAYER.speed);
  assert.equal(body.vy, -PLAYER.jumpSpeed);
  input.release("pointer:2");
  assert.equal(input.direction, 1);
});

test("a held key does not auto-jump again on landing", () => {
  const input = new InputState();
  const body = makeBody();
  const motion = new MovementState();
  input.press("Space", "jump");
  applyMovement(body, input, motion);
  body.vy = 0;
  input.press("Space", "jump");
  assert.equal(applyMovement(body, input, motion).jumping, false);
  assert.equal(body.vy, 0);
  input.release("Space");
  input.press("Space", "jump");
  assert.equal(applyMovement(body, input, motion).jumping, true);
});

test("airborne presses cannot double-jump or queue an automatic landing jump", () => {
  const input = new InputState();
  const body = makeBody();
  const motion = new MovementState();
  body.blocked.down = false;
  body.vy = 100;
  input.press("Space", "jump");
  assert.equal(applyMovement(body, input, motion).jumping, false);
  assert.equal(body.vy, 100);
  body.blocked.down = true;
  body.vy = 0;
  assert.equal(applyMovement(body, input, motion).jumping, false);
});

test("opposing directions cancel while independent bindings stay held", () => {
  const input = new InputState();
  const body = makeBody();
  const motion = new MovementState();
  input.press("ArrowLeft", "left");
  input.press("KeyA", "left");
  input.press("ArrowRight", "right");
  applyMovement(body, input, motion);
  assert.equal(body.vx, 0);
  input.release("ArrowRight");
  input.release("KeyA");
  applyMovement(body, input, motion);
  assert.equal(body.vx, -PLAYER.speed);
});

test("focus loss or reset clears held controls and queued jumps", () => {
  const input = new InputState();
  const body = makeBody();
  const motion = new MovementState();
  input.press("pointer:1", "left");
  input.press("Space", "jump");
  input.press("ShiftLeft", "dash");
  input.clear();
  assert.equal(applyMovement(body, input, motion).jumping, false);
  assert.equal(body.vx, 0);
  input.press("ArrowRight", "right");
  assert.equal(applyMovement(body, input, motion).dashing, false);
  assert.equal(body.vx, PLAYER.speed);
});

test("standing at a horizontal boundary stops walking but still allows jumping", () => {
  const input = new InputState();
  const body = makeBody();
  const motion = new MovementState();
  body.blocked.left = true;
  input.press("ArrowLeft", "left");
  assert.equal(applyMovement(body, input, motion).walking, false);
  input.press("Space", "jump");
  assert.equal(applyMovement(body, input, motion).jumping, true);
});

test("either Shift key increases movement speed in both directions until released", () => {
  for (const shift of ["ShiftLeft", "ShiftRight"]) {
    for (const [key, direction] of [["ArrowLeft", -1], ["KeyD", 1]] as const) {
      const input = new InputState(), body = makeBody(), motion = new MovementState();
      input.press(key, keyActions[key]);
      applyMovement(body, input, motion);
      assert.equal(body.vx, direction * PLAYER.speed);
      input.press(shift, keyActions[shift]);
      assert.equal(applyMovement(body, input, motion).dashing, true);
      assert.equal(body.vx, direction * PLAYER.speed * PLAYER.dashMultiplier);
      input.release(shift);
      assert.equal(applyMovement(body, input, motion).dashing, false);
      assert.equal(body.vx, direction * PLAYER.speed);
    }
  }
});

test("dash alone and opposing directions do not move; releasing a direction stops", () => {
  const input = new InputState(), body = makeBody(), motion = new MovementState();
  input.press("ShiftLeft", "dash");
  assert.equal(applyMovement(body, input, motion).dashing, false);
  assert.equal(body.vx, 0);
  input.press("ArrowLeft", "left");
  input.press("ArrowRight", "right");
  assert.equal(applyMovement(body, input, motion).dashing, false);
  assert.equal(body.vx, 0);
  input.release("ArrowLeft");
  assert.equal(applyMovement(body, input, motion).dashing, true);
  input.release("ArrowRight");
  assert.equal(applyMovement(body, input, motion).dashing, false);
  assert.equal(body.vx, 0);
});

test("releasing one Shift leaves dash active while the other is held", () => {
  const input = new InputState(), body = makeBody(), motion = new MovementState();
  input.press("ArrowRight", "right");
  input.press("ShiftLeft", "dash");
  input.press("ShiftRight", "dash");
  input.release("ShiftLeft");
  assert.equal(applyMovement(body, input, motion).dashing, true);
  assert.equal(body.vx, PLAYER.speed * PLAYER.dashMultiplier);
  input.release("ShiftRight");
  assert.equal(applyMovement(body, input, motion).dashing, false);
  assert.equal(body.vx, PLAYER.speed);
});
