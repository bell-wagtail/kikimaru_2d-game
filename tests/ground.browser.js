import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES, STAGE_MAP_GRID } from "../src/stages.ts";
import { parseStageMap } from "../src/stageMap.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";

export async function verifyGround({ scene, key, step, restart, pass, assert, near }) {
  const frames = count => { for (let i = 0; i < count; i++) step(); };
  const reset = () => { document.querySelector("#reset").click(); step(); };
  const place = (x, bottom = WORLD.ground) => {
    scene.body.reset(x, bottom - PLAYER.height / 2);
    scene.body.blocked.down = bottom === WORLD.ground;
    scene.previousPlayerX = x;
  };
  const pit = { id: "pit", x: 1000, width: 180 };
  const stage = { id: "hole-test", background: STAGES.teaRiver.background, holes: [pit] };
  const aligned = () => {
    for (const { definition, image } of scene.ground.openings) {
      near(image.x, definition.x - scene.ground.originX, "穴の表示座標");
      near(image.width, definition.width, "穴の表示幅");
      assert(!scene.ground.hasFloorAt(image.x + image.width / 2), "穴に床がない");
    }
    for (const { zone, body } of scene.ground.floors) {
      if (!body.enable) continue;
      near(body.left, zone.x, "床の表示と物理座標");
      near(body.width, zone.width, "床の物理幅");
      near(body.top, WORLD.ground, "床の高さ");
      assert(scene.physics.world.staticTree.search({ minX: body.left, minY: body.top, maxX: body.right, maxY: body.bottom }).includes(body), "床の衝突検索位置");
    }
  };
  const atStart = () => {
    near(scene.body.center.x, WORLD.width / 2, "リスポーン位置");
    near(scene.body.bottom, WORLD.ground, "リスポーン高さ");
    near(scene.body.velocity.x, 0, "リスポーン横速度");
    near(scene.body.velocity.y, 0, "リスポーン縦速度");
    near(scene.movementState.speed, PLAYER.speed, "リスポーンで助走解除");
    near(scene.cameras.main.scrollX, 0, "リスポーンでカメラ復元");
    near(scene.scenery.background.tilePositionX, 0, "リスポーンで背景復元");
    near(scene.scenery.ground.tilePositionX, 0, "リスポーンで地面復元");
    for (const object of [scene.ground, scene.obstacles, scene.decorations]) near(object.originX, 0, "リスポーンで座標補正解除");
    frames(10); near(scene.body.center.x, WORLD.width / 2, "押下入力が残って勝手に移動しない");
    aligned();
  };
  const prepare = (sign, runUp, x) => {
    reset();
    key(sign > 0 ? "ArrowRight" : "ArrowLeft", true);
    if (runUp) key("ShiftLeft", true);
    frames(runUp * 60);
    scene.update(0, 0);
    const speed = PLAYER.speed + (PLAYER.speed * PLAYER.dashMultiplier - PLAYER.speed) * runUp / PLAYER.accelerationSeconds;
    near(Math.abs(scene.body.velocity.x), speed, "穴の手前の助走速度");
    place(x);
    scene.update(0, 0);
    return speed;
  };
  await restart(stage); aligned();
  const count = scene.children.length, staticCount = scene.physics.world.staticBodies.size;
  for (const sign of [1, -1]) for (const runUp of [0, PLAYER.accelerationSeconds / 2, PLAYER.accelerationSeconds]) {
    const code = sign > 0 ? "ArrowRight" : "ArrowLeft";
    const label = runUp === 0 ? "徒歩" : runUp === PLAYER.accelerationSeconds ? "最高速度" : "加速途中";
    const edge = sign > 0 ? pit.x + PLAYER.width / 2 : pit.x + pit.width - PLAYER.width / 2;
    const speed = prepare(sign, runUp, edge - sign);
    let fell = false, respawned = false;
    for (let i = 0; i < 120; i++) {
      step();
      if (scene.body.bottom > WORLD.ground + 1) {
        if (!fell) {
          assert(!scene.body.blocked.down, "穴で床への接触が解除される");
          assert(!scene.shadow.visible, "穴に影を描かない");
          near(Math.abs(scene.body.velocity.x), speed, "落下中に速度を維持");
          const velocityY = scene.body.velocity.y;
          key("Space", true); scene.update(0, 0); key("Space", false);
          near(scene.body.velocity.y, velocityY, "穴の中から空中ジャンプしない");
        }
        fell = true;
      }
      if (fell && scene.body.center.x === WORLD.width / 2) { respawned = true; break; }
    }
    assert(fell && respawned, "穴へ落下し、対岸の下で引っ掛からずリスポーン");
    atStart();
    near(scene.children.length, count, "落下を繰り返しても表示が増えない");
    near(scene.physics.world.staticBodies.size, staticCount, "落下を繰り返しても床ボディが増えない");

    const takeoff = sign > 0 ? pit.x - 30 : pit.x + pit.width + 30;
    const jumpSpeed = prepare(sign, runUp, takeoff);
    key("Space", true); scene.update(0, 0); key("Space", false);
    key("ShiftLeft", runUp === 0);
    let crossed = false;
    for (let i = 0; i < 120; i++) {
      step();
      assert(scene.body.bottom <= WORLD.ground + 1e-6, "飛び越えで穴へ落下しない");
      if (scene.body.blocked.down) {
        crossed = sign > 0 ? scene.body.right > pit.x + pit.width : scene.body.left < pit.x;
        break;
      }
      near(Math.abs(scene.body.velocity.x), jumpSpeed, "穴を飛び越える間も踏切速度を維持");
    }
    assert(crossed, "穴を飛び越えて対岸へ着地");
    key(code, false); step();
    pass(`${sign > 0 ? "左から右" : "右から左"}・${label}：穴への落下・入力と助走を解除してリスポーン、ジャンプで対岸へ着地`);
  }

  reset(); place(pit.x + pit.width / 2, WORLD.ground + 40); frames(2);
  assert(scene.body.bottom > WORLD.ground, "穴の落下途中"); reset(); atStart();
  pass("落下途中の「まんなかに戻る」でも開始状態へ復元");

  await restart({ ...stage, holes: [{ ...pit, width: STAGE_MAP_GRID.cellWidth }] });
  reset(); place(pit.x - PLAYER.width / 2 - 20);
  key("ArrowRight", true);
  for (let i = 0; i < 60; i++) { step(); near(scene.body.bottom, WORLD.ground, "体幅より狭い穴は床に支えられたまままたぐ"); }
  assert(scene.body.left > pit.x + STAGE_MAP_GRID.cellWidth, "狭い穴を徒歩で通過");
  pass("体幅より狭い1マスの穴はまたげる");

  const bridge = { id: "bridge-rock", kind: "rock", x: pit.x + 30, y: WORLD.ground - 36, width: 120, height: 36 };
  await restart({ ...stage, obstacles: [bridge] });
  reset(); place(pit.x + pit.width / 2, bridge.y - 80); frames(60);
  near(scene.body.bottom, bridge.y, "穴の上の岩へ着地");
  assert(scene.body.blocked.down, "穴の上の岩も足場になる");
  key("Space", true); step(); key("Space", false);
  assert(scene.body.velocity.y < 0, "穴の上の岩からジャンプ");
  pass("穴の上に配置した岩は固定足場として着地・再ジャンプ可能");

  for (const sign of [-1, 1]) {
    const originX = WORLD.width / 2 + sign * REBASE_DISTANCE - 90;
    const mapped = parseStageMap(".o...\n=...=", { ...STAGE_MAP_GRID, originX });
    await restart({ ...stage, ...mapped });
    const countBefore = scene.children.length;
    // Fall across the origin boundary while already below the floor surface.
    place(WORLD.width / 2 + sign * (REBASE_DISTANCE - 4), WORLD.ground + 2);
    key(sign > 0 ? "ArrowRight" : "ArrowLeft", true);
    let rebased = false, respawned = false;
    for (let i = 0; i < 120; i++) {
      step(); aligned();
      if (scene.ground.originX !== 0) {
        rebased = true;
        near(scene.ground.originX, sign * REBASE_DISTANCE, "穴と床の座標補正量");
        near(scene.decorations.originX, scene.ground.originX, "穴と仮表示の補正量一致");
      }
      if (rebased && scene.ground.originX === 0) { respawned = true; break; }
    }
    assert(rebased && respawned, "補正境界の穴で落下してリスポーン"); atStart();
    near(scene.children.length, countBefore, "補正とリスポーンで表示数不変");
    // Revisit after several origin shifts; the same hole must remain at its stage position.
    for (let i = 0; i < 3; i++) { place(WORLD.width / 2 + sign * (REBASE_DISTANCE + 10)); step(); aligned(); }
    near(scene.ground.originX, sign * REBASE_DISTANCE * 3, "複数回の床座標補正");
    const opening = scene.ground.openings[0].image;
    place(opening.x + opening.width / 2, WORLD.ground + 10);
    let returned = false;
    for (let i = 0; i < 120; i++) { step(); if (scene.ground.originX === 0) { returned = true; break; } }
    assert(returned, "複数補正後に再訪した穴でも落下"); atStart();
    pass(`${sign > 0 ? "右" : "左"}方向の穴：落下中の座標補正、床・黒い表示・衝突検索の一致、複数補正後の再訪・リスポーン`);
  }
  await restart(stage); aligned();
  near(scene.children.length, count, "再起動で床や穴の表示が重複しない");
  near(scene.physics.world.staticBodies.size, staticCount, "再起動で床ボディが重複しない");
  near(scene.physics.world.colliders.getActive().length, 2, "再起動でColliderが重複しない");
  pass("穴のあるステージの再起動で表示・床ボディ・Colliderの重複なし");
}
