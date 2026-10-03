import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES, STAGE_MAP_GRID } from "../src/stages.ts";
import { parseStageMap } from "../src/stageMap.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";
import text from "./fixtures/stairs.txt?raw";

const baseStage = { id: "stage-map-test", background: STAGES.teaRiver.background };
const stairStage = { ...baseStage, ...parseStageMap(text, STAGE_MAP_GRID) };

export async function verifyStageMap({ scene, key, step, restart, pass, assert, near }) {
  const reset = () => { document.querySelector("#reset").click(); step(); };
  const frames = count => { for (let i = 0; i < count; i++) step(); };
  const aligned = () => {
    for (const { definition, image, body } of scene.obstacles.items) {
      near(body.left, definition.x - scene.obstacles.originX, "マップ岩の物理座標");
      near(image.x, body.left, "マップ岩の表示座標");
      near(body.top, definition.y, "マップ岩の高さ");
      assert(scene.physics.world.staticTree.search({ minX: body.left, minY: body.top, maxX: body.right, maxY: body.bottom }).includes(body), "マップ岩の衝突検索");
    }
    for (const { definition, image } of scene.items.items) {
      near(image.x, definition.x + definition.width / 2 - scene.items.originX, "teaの表示座標");
      near(image.y, definition.y + definition.height, "teaの高さ");
      assert(!image.body, "teaアイテムに衝突ボディがないこと");
    }
  };
  await restart(stairStage);
  reset(); aligned();
  const count = scene.children.length;
  const rocks = stairStage.obstacles;
  const lower = rocks.find(rock => rock.id === "rock-r4-c17");
  const middle = rocks.find(rock => rock.id === "rock-r3-c19");
  const upper = rocks.filter(rock => rock.id.startsWith("rock-r2-")).sort((a, b) => a.x - b.x);
  assert(lower && middle && upper.length === 5, "階段と5個の岩をマップから生成");
  assert(scene.physics.world.staticBodies.size === rocks.length + 1 && scene.items.items.length === 1, "マップの配置数と床ボディ");

  key("ArrowRight", true);
  for (let i = 0; i < 300 && !scene.body.blocked.right; i++) step();
  near(scene.body.center.x, lower.x - PLAYER.width / 2, "開始位置から最初の岩へ歩いて接触");
  key("ArrowRight", false); step();
  const jumpOnto = target => {
    assert(scene.body.blocked.down && scene.body.velocity.y === 0, "前の段に着地してから踏み切る");
    key("ArrowRight", true); key("Space", true); step(); key("Space", false);
    assert(scene.body.velocity.y < 0, "岩上からジャンプ");
    let reached = false, landed = false;
    for (let i = 0; i < 100; i++) {
      step();
      if (!reached && scene.body.center.x >= target.x + target.width / 2) {
        reached = true; key("ArrowRight", false);
      }
      if (scene.body.blocked.down) { landed = true; break; }
    }
    assert(reached && landed, "次の高い段へ移動して着地");
    near(scene.body.bottom, target.y, "次の段の上面");
    frames(30); near(scene.body.bottom, target.y, "高い段で静止");
  };
  jumpOnto(lower); jumpOnto(middle); jumpOnto(upper[0]);
  pass("開始位置から歩き、地面→低い岩→中段→横5個の上段へ連続ジャンプで登る");

  for (const sign of [1, -1]) {
    const code = sign > 0 ? "ArrowRight" : "ArrowLeft";
    const target = sign > 0 ? upper.at(-1) : upper[0];
    key(code, true);
    let reached = false;
    for (let i = 0; i < 160; i++) {
      step();
      near(scene.body.bottom, target.y, "5個の岩の継ぎ目で落ちない");
      assert(!scene.body.blocked.left && !scene.body.blocked.right, "岩の継ぎ目で横移動を妨げない");
      if (sign * (scene.body.center.x - target.x - target.width / 2) >= 0) { reached = true; break; }
    }
    key(code, false); step();
    assert(reached, "上段の端まで移動");
  }
  assert(scene.items.items.length === 1 && scene.items.items[0].collected && !scene.items.items[0].image.visible, "teaを取得して表示が消える");
  near(scene.physics.world.colliders.getActive().length, 2, "アイテムは岩・床の衝突処理を増やさない");
  pass("横5個の岩上を左右に歩いても継ぎ目で停止・落下しない、teaの取得");
  reset(); aligned();
  near(scene.body.center.x, WORLD.width / 2, "高い段からのリセット位置");
  near(scene.body.bottom, WORLD.ground, "高い段からのリセット高さ");
  near(scene.cameras.main.scrollX, 0, "高い段からのカメラリセット");

  for (const sign of [-1, 1]) {
    const grid = { ...STAGE_MAP_GRID, originX: sign * REBASE_DISTANCE };
    await restart({ ...baseStage, ...parseStageMap(text, grid) });
    scene.body.reset(WORLD.width / 2 + sign * (REBASE_DISTANCE + 10), WORLD.ground - PLAYER.height / 2);
    scene.previousPlayerX = scene.body.center.x;
    step(); aligned();
    near(scene.obstacles.originX, sign * REBASE_DISTANCE, "マップ岩の補正量");
    near(scene.items.originX, sign * REBASE_DISTANCE, "teaの補正量");
    const groundRock = scene.obstacles.items.find(item => item.definition.id === lower.id).body;
    scene.body.reset(groundRock.left - PLAYER.width / 2 - 20, WORLD.ground - PLAYER.height / 2);
    scene.previousPlayerX = scene.body.center.x;
    key("ArrowRight", true); frames(30);
    near(scene.body.center.x, groundRock.left - PLAYER.width / 2, "補正後のマップ岩へ側面衝突");
    near(scene.body.velocity.x, 0, "補正後のマップ岩で停止");
    reset(); aligned();
    near(scene.obstacles.originX, 0, "リセットでマップ岩の補正解除");
    near(scene.items.originX, 0, "リセットでteaの補正解除");
  }
  pass("文字マップの原点変更、左右の座標補正、補正後の岩衝突、岩とteaのリセット");

  await restart({ ...baseStage, ...parseStageMap(text, { ...STAGE_MAP_GRID, cellWidth: 80, cellHeight: 40 }) });
  aligned();
  for (const { body } of scene.obstacles.items) { near(body.width, 80, "変更したマス幅"); near(body.height, 40, "変更したマス高さ"); }
  await restart(stairStage); aligned();
  assert(scene.children.length === count && scene.physics.world.staticBodies.size === rocks.length + 1, "マップ再起動で表示・ボディの重複なし");
  pass("マス幅・高さの変更を描画と当たり判定へ反映、マップ再起動・高い段からのリセット");
}
