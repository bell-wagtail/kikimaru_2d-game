import { test } from "node:test";
import assert from "node:assert/strict";
import { InputState, keyActions } from "../src/input.ts";
import { applyMovement, PLAYER } from "../src/movement.ts";

function makeBody() {
  return {
    blocked: { down: true, left: false, right: false },
    touching: { down: false },
    vx: 0, vy: 0,
    setVelocityX(value: number) { this.vx = value; },
    setVelocityY(value: number) { this.vy = value; }
  };
}

test("moving and jumping can be held by separate touch pointers", () => {
  const input = new InputState();
  const body = makeBody();
  input.press("pointer:1", "right");
  input.press("pointer:2", "jump");
  assert.equal(applyMovement(body, input).jumping, true);
  assert.equal(body.vx, PLAYER.speed);
  assert.equal(body.vy, -PLAYER.jumpSpeed);
  input.release("pointer:2");
  assert.equal(input.direction, 1);
});

test("a held key does not auto-jump again on landing", () => {
  const input = new InputState();
  const body = makeBody();
  input.press("Space", "jump");
  applyMovement(body, input);
  body.vy = 0;
  input.press("Space", "jump");
  assert.equal(applyMovement(body, input).jumping, false);
  assert.equal(body.vy, 0);
  input.release("Space");
  input.press("Space", "jump");
  assert.equal(applyMovement(body, input).jumping, true);
});

test("airborne presses cannot double-jump or queue an automatic landing jump", () => {
  const input = new InputState();
  const body = makeBody();
  body.blocked.down = false;
  body.vy = 100;
  input.press("Space", "jump");
  assert.equal(applyMovement(body, input).jumping, false);
  assert.equal(body.vy, 100);
  body.blocked.down = true;
  body.vy = 0;
  assert.equal(applyMovement(body, input).jumping, false);
});

test("opposing directions cancel while independent bindings stay held", () => {
  const input = new InputState();
  const body = makeBody();
  input.press("ArrowLeft", "left");
  input.press("KeyA", "left");
  input.press("ArrowRight", "right");
  applyMovement(body, input);
  assert.equal(body.vx, 0);
  input.release("ArrowRight");
  input.release("KeyA");
  applyMovement(body, input);
  assert.equal(body.vx, -PLAYER.speed);
});

test("focus loss or reset clears held controls and queued jumps", () => {
  const input = new InputState();
  const body = makeBody();
  input.press("pointer:1", "left");
  input.press("Space", "jump");
  input.press("ShiftLeft", "dash");
  input.clear();
  assert.equal(applyMovement(body, input).jumping, false);
  assert.equal(body.vx, 0);
  input.press("ArrowRight", "right");
  assert.equal(applyMovement(body, input).dashing, false);
  assert.equal(body.vx, PLAYER.speed);
});

test("standing at a horizontal boundary stops walking but still allows jumping", () => {
  const input = new InputState();
  const body = makeBody();
  body.blocked.left = true;
  input.press("ArrowLeft", "left");
  assert.equal(applyMovement(body, input).walking, false);
  input.press("Space", "jump");
  assert.equal(applyMovement(body, input).jumping, true);
});

test("either Shift key increases movement speed in both directions until released", () => {
  for (const shift of ["ShiftLeft", "ShiftRight"]) {
    for (const [key, direction] of [["ArrowLeft", -1], ["KeyD", 1]] as const) {
      const input = new InputState(), body = makeBody();
      input.press(key, keyActions[key]);
      applyMovement(body, input);
      assert.equal(body.vx, direction * PLAYER.speed);
      input.press(shift, keyActions[shift]);
      assert.equal(applyMovement(body, input).dashing, true);
      assert.equal(body.vx, direction * PLAYER.speed * PLAYER.dashMultiplier);
      input.release(shift);
      assert.equal(applyMovement(body, input).dashing, false);
      assert.equal(body.vx, direction * PLAYER.speed);
    }
  }
});

test("dash alone and opposing directions do not move; releasing a direction stops", () => {
  const input = new InputState(), body = makeBody();
  input.press("ShiftLeft", "dash");
  assert.equal(applyMovement(body, input).dashing, false);
  assert.equal(body.vx, 0);
  input.press("ArrowLeft", "left");
  input.press("ArrowRight", "right");
  assert.equal(applyMovement(body, input).dashing, false);
  assert.equal(body.vx, 0);
  input.release("ArrowLeft");
  assert.equal(applyMovement(body, input).dashing, true);
  input.release("ArrowRight");
  assert.equal(applyMovement(body, input).dashing, false);
  assert.equal(body.vx, 0);
});

test("releasing one Shift leaves dash active while the other is held", () => {
  const input = new InputState(), body = makeBody();
  input.press("ArrowRight", "right");
  input.press("ShiftLeft", "dash");
  input.press("ShiftRight", "dash");
  input.release("ShiftLeft");
  assert.equal(applyMovement(body, input).dashing, true);
  assert.equal(body.vx, PLAYER.speed * PLAYER.dashMultiplier);
  input.release("ShiftRight");
  assert.equal(applyMovement(body, input).dashing, false);
  assert.equal(body.vx, PLAYER.speed);
});

test("dash changes horizontal speed in the air without changing jump impulse or vertical velocity", () => {
  const input = new InputState(), body = makeBody();
  input.press("ArrowRight", "right");
  input.press("ShiftLeft", "dash");
  input.press("Space", "jump");
  assert.equal(applyMovement(body, input).jumping, true);
  assert.equal(body.vy, -PLAYER.jumpSpeed);
  body.blocked.down = false;
  body.vy = -200;
  input.release("ShiftLeft");
  applyMovement(body, input);
  assert.equal(body.vx, PLAYER.speed);
  assert.equal(body.vy, -200);
  input.press("ShiftRight", "dash");
  assert.equal(applyMovement(body, input).jumping, false);
  assert.equal(body.vx, PLAYER.speed * PLAYER.dashMultiplier);
  assert.equal(body.vy, -200);
});
