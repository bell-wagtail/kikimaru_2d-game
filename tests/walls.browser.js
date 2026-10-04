import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES } from "../src/stages.ts";
import { parseStageMap } from "../src/stageMap.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";

export async function verifyWalls({ scene, key, step, restart, pass, assert, near }) {
  const row = "L..I....R";
  const stage = { id: "walls-test", background: STAGES.teaRiver.background,
    ...parseStageMap(`${row}\n${"=".repeat(row.length)}`, { cellWidth: 100, cellHeight: 40, originX: 0, groundY: WORLD.ground }) };
  const frames = count => { for (let i = 0; i < count; i++) step(); };
  const place = (x, bottom = WORLD.ground) => {
    scene.body.reset(x, bottom - PLAYER.height / 2);
    scene.body.blocked.down = bottom === WORLD.ground;
    scene.previousPlayerX = x;
  };
  const reset = () => { document.getElementById("reset").click(); document.getElementById("start-walk").click(); step(); };
  const aligned = () => {
    const { left, right } = scene.walls.limits;
    if (left !== undefined) near(scene.physics.world.bounds.left, left, "左壁と物理境界が一致");
    if (right !== undefined) near(scene.physics.world.bounds.right, right, "右壁と物理境界が一致");
    for (const mark of scene.walls.marks) near(mark.image.x, mark.x - scene.walls.originX, "壁表示と座標補正が一致");
    assert(!scene.physics.world.checkCollision.down, "壁を追加しても画面下へ落下できる");
  };
  await restart(stage);
  const children = scene.children.length, bodies = scene.physics.world.staticBodies.size;
  for (const sign of [-1, 1]) for (const mode of ["徒歩", "ダッシュ", "お茶"]) {
    reset();
    if (mode === "ダッシュ") { key("ShiftLeft", true); scene.movementState.speed = PLAYER.speed * PLAYER.dashMultiplier; }
    if (mode === "お茶") scene.powerUps.acquire("tea");
    const code = sign < 0 ? "ArrowLeft" : "ArrowRight";
    const edge = sign < 0 ? scene.walls.limits.left + PLAYER.width / 2 : scene.walls.limits.right - PLAYER.width / 2;
    place(edge - sign * 100); key(code, true); frames(120);
    near(scene.body.center.x, edge, "身体の端が壁で停止"); near(scene.body.velocity.x, 0, "壁へ押し続けても停止");
    assert(scene.body.blocked[sign < 0 ? "left" : "right"], "停止中も接触フラグを保持");
    near(scene.movementState.speed, PLAYER.speed, "壁で助走を解除"); aligned();
    key(code, false); key(sign < 0 ? "ArrowRight" : "ArrowLeft", true); frames(2);
    assert(sign * scene.body.velocity.x < 0 && sign * (scene.body.center.x - edge) < 0, "逆方向へ離れられる");
    scene.clearControls();
    pass(`${sign < 0 ? "左" : "右"}壁・${mode}：側面停止・押し続けても停止・助走解除・逆方向へ離脱`);
  }
  for (const sign of [-1, 1]) {
    reset(); scene.powerUps.acquire("shrimp");
    const code = sign < 0 ? "ArrowLeft" : "ArrowRight";
    const edge = sign < 0 ? scene.walls.limits.left + PLAYER.width / 2 : scene.walls.limits.right - PLAYER.width / 2;
    place(edge); key(code, true); key("Space", true); step(); key("Space", false);
    let doubled = false;
    for (let i = 0; i < 100; i++) {
      if (i === 20) { key("Space", true); step(); key("Space", false); doubled = scene.movementState.airJumpUsed; }
      step();
      assert(scene.body.left >= scene.walls.limits.left - 1e-6 && scene.body.right <= scene.walls.limits.right + 1e-6,
        "柵より高い場所でも境界を越えない");
    }
    assert(doubled, "壁際でも既存の空中ジャンプを使える");
    near(scene.body.center.x, edge, "2段ジャンプで壁を越えられない");
    place(edge - sign * 20); scene.body.setVelocityX(sign * 1000000); step();
    near(scene.body.center.x, edge, "高速の1フレーム移動も壁で止める");
    scene.clearControls(); aligned();
    pass(`${sign < 0 ? "左" : "右"}壁：地上・空中・2段ジャンプ・高速移動でも越えない`);
  }
  reset();
  place(scene.walls.limits.left + PLAYER.width / 2 + 5, WORLD.ground + PLAYER.height / 2);
  key("ArrowLeft", true);
  for (let i = 0; i < 240 && !scene.starting; i++) step();
  assert(scene.starting, "壁際でも床の下から落下リスポーンする");
  near(scene.body.center.x, stage.start.x + stage.start.width / 2, "指定スタートへ復元");
  aligned(); near(scene.children.length, children, "リセットで壁表示を増やさない");
  near(scene.physics.world.staticBodies.size, bodies, "壁で固定ボディを追加・増殖しない");
  pass("壁際の落下リスポーン・指定スタートと壁の復元・表示とボディ数を維持");

  for (const sign of [-1, 1]) {
    const origin = sign * REBASE_DISTANCE * 3;
    const endpoint = x => ({ x: x - 50, y: WORLD.ground - 44, width: 100, height: 44 });
    const long = { id: `walls-rebase-${sign}`, background: stage.background,
      walls: { left: origin, right: origin + REBASE_DISTANCE * 4 + 1200 },
      start: endpoint(origin + 600), goal: endpoint(origin + REBASE_DISTANCE * 4 + 900) };
    await restart(long); aligned();
    const initialOrigin = scene.walls.originX;
    for (const absolute of [origin + REBASE_DISTANCE * 2 + 600, origin + 600, origin + REBASE_DISTANCE * 3 + 600]) {
      place(absolute - scene.walls.originX); scene.update(0, 0); aligned();
      near(scene.body.center.x + scene.walls.originX, absolute, "補正でステージ内の絶対位置を維持");
    }
    assert(scene.walls.originX !== initialOrigin, "長距離の座標補正を実行");
    const edge = scene.walls.limits.left + PLAYER.width / 2;
    place(edge + 20); scene.update(0, 0); key("ArrowLeft", true); frames(30); aligned();
    near(scene.body.left, scene.walls.limits.left, "補正後の左壁で実際に停止");
    scene.clearControls();
    place(scene.endpoints.goalFlag.x); scene.update(0, 0);
    assert(scene.playResult.current && scene.physics.world.isPaused, "補正後もゴール結果が確定"); aligned();
    document.getElementById("retry-walk").click();
    near(scene.walls.originX, initialOrigin, "再挑戦で開始基準の補正へ戻る"); aligned();
    near(scene.body.center.x + scene.walls.originX, origin + 600, "再挑戦の指定スタート");
    pass(`${sign < 0 ? "負" : "正"}の大きな原点・左右と複数補正・壁表示と実接触・ゴール・再挑戦を一致`);
  }
  for (const side of ["left", "right"]) {
    const single = { ...stage, walls: { [side]: stage.walls[side] } };
    await restart(single); aligned();
    assert(scene.physics.world.checkCollision[side] && !scene.physics.world.checkCollision[side === "left" ? "right" : "left"],
      "指定した片側だけを制限");
    const code = side === "left" ? "ArrowRight" : "ArrowLeft";
    key(code, true); frames(300); scene.clearControls();
    assert(side === "left" ? scene.body.left > stage.walls.right : scene.body.right < stage.walls.left, "未指定側は通過できる");
  }
  await restart({ id: "walls-legacy", background: stage.background });
  assert(!scene.physics.world.checkCollision.left && !scene.physics.world.checkCollision.right && scene.walls.marks.length === 0,
    "壁なしのステージへ再起動すると境界と表示を解除");
  key("ArrowLeft", true); frames(300); scene.clearControls();
  assert(scene.body.right < 0, "未指定の座標ステージは従来どおり自由に歩ける");
  await restart(stage); aligned();
  near(scene.children.length, children, "再起動で壁表示を重複させない");
  near(scene.physics.world.staticBodies.size, bodies, "再起動でボディ数を維持");
  pass("左右の片側指定・壁未指定の互換性・別ステージ再起動で壁を解除・重複防止");
}
