import Phaser from "phaser";
import { PLAYER, WORLD } from "../src/movement.ts";
import { ITEM_TYPES } from "../src/items.ts";
import { STAGES, STAGE_MAP_GRID } from "../src/stages.ts";
import { parseStageMap } from "../src/stageMap.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";

export async function verifyItems({ scene, game, key, step, restart, pass, assert, near }) {
  const frames = count => { for (let i = 0; i < count; i++) step(); };
  const reset = () => { document.querySelector("#reset").click(); step(); };
  const place = (x, bottom = WORLD.ground) => {
    scene.body.reset(x, bottom - PLAYER.height / 2);
    scene.body.blocked.down = bottom === WORLD.ground;
    scene.previousPlayerX = x;
  };
  const map = "..........\n..o.j...x.\n======..==";
  const stage = { id: "item-test", background: STAGES.teaRiver.background,
    ...parseStageMap(map, { ...STAGE_MAP_GRID, originX: 680 }) };
  const aligned = () => {
    for (const { definition, image, collected } of scene.items.items) {
      near(image.x, definition.x + definition.width / 2 - scene.items.originX, "アイテム表示の座標補正");
      near(image.y, definition.y + definition.height, "アイテム表示の高さ");
      assert(image.displayWidth <= definition.width && image.displayHeight <= definition.height, "マス内に素材を収める");
      assert(image.visible === !collected && !image.body, "取得状態と表示が一致し、衝突ボディを持たない");
    }
  };
  const collectBoth = () => {
    for (const item of scene.items.items) {
      place(item.image.x); scene.update(0, 0);
      assert(item.collected && !item.image.visible, "表示位置でアイテムを取得");
    }
    assert(scene.powerUps.active("autoDash") && scene.powerUps.active("doubleJump"), "両効果を併用");
  };
  const restored = () => {
    assert(!scene.powerUps.active("autoDash") && !scene.powerUps.active("doubleJump"), "能力を解除");
    assert(!scene.movementState.airJumpUsed && scene.movementState.speed === PLAYER.speed, "ジャンプ回数と助走を解除");
    assert(scene.items.items.every(item => !item.collected && item.image.visible), "全アイテムを復元");
    near(scene.items.originX, 0, "アイテム補正量を解除");
    aligned();
  };

  await restart(stage); aligned();
  const count = scene.children.length, staticCount = scene.physics.world.staticBodies.size;
  const tea = scene.items.items.find(item => item.definition.kind === "tea");
  const shrimp = scene.items.items.find(item => item.definition.kind === "shrimp");
  key("ArrowRight", true);
  for (let i = 0; i < 100 && !tea.collected; i++) step();
  assert(tea.collected && !tea.image.visible && !shrimp.collected, "徒歩でお茶のみ取得");
  near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "取得したフレームからShiftなしで最高速度");
  key("ArrowRight", false); step();
  const remaining = scene.powerUps.secondsLeft("autoDash"); frames(60);
  near(scene.powerUps.secondsLeft("autoDash"), remaining - 1, "同じお茶の場所で毎フレーム効果を延長しない");
  assert(scene.children.length === count && scene.physics.world.staticBodies.size === staticCount, "取得で表示数・床や岩のボディ数は変わらない");
  collectBoth();
  assert(scene.feedback.message.text.includes("えびを取得！") && scene.feedback.message.visible, "取得した種類を短い文字で表示");
  place(600); key("ArrowRight", true); step();
  near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "停止後の移動再開も最初のフレームから最高速度");
  key("Space", true); scene.update(0, 0); key("Space", false); frames(12);
  const launchSpeed = scene.body.velocity.x;
  key("Space", true); scene.update(0, 0);
  near(scene.body.velocity.y, -PLAYER.jumpSpeed * PLAYER.airJumpMultiplier, "同じ強さで2段目のジャンプ");
  near(scene.body.velocity.x, launchSpeed, "2段目でも横速度を維持");
  frames(2); const heldY = scene.body.velocity.y; scene.update(0, 0);
  near(scene.body.velocity.y, heldY, "押しっぱなしで追加ジャンプしない");
  key("Space", false); key("Space", true); const thirdY = scene.body.velocity.y; scene.update(0, 0); key("Space", false);
  near(scene.body.velocity.y, thirdY, "3段目のジャンプを拒否");
  key("ArrowRight", false); frames(100);
  assert(scene.body.blocked.down && !scene.movementState.airJumpUsed, "着地で空中ジャンプを回復");
  pass("文字マップの両素材の取得、表示消去、一度だけ反映、お茶は即最高速度・停止後の再開、併用、2段ジャンプと無限ジャンプ防止");

  reset(); collectBoth(); place(600);
  frames(Math.max(ITEM_TYPES.tea.durationSeconds, ITEM_TYPES.shrimp.durationSeconds) * 60);
  assert(!scene.powerUps.active("autoDash") && !scene.powerUps.active("doubleJump"), "設定時間で両効果が終了");
  assert(scene.items.items.every(item => item.collected && !item.image.visible), "時間切れではアイテムを復元しない");
  key("ArrowRight", true); step(); near(scene.body.velocity.x, PLAYER.speed, "時間切れ後は通常歩行");
  key("ShiftLeft", true); frames(PLAYER.accelerationSeconds * 60);
  near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "時間切れ後もShiftダッシュが使える");
  reset(); restored(); collectBoth();
  const remainingBeforeBlur = scene.powerUps.secondsLeft("autoDash");
  game.events.emit(Phaser.Core.Events.BLUR); frames(120);
  near(scene.powerUps.secondsLeft("autoDash"), remainingBeforeBlur, "フォーカス喪失でゲームと効果時間を停止");
  game.events.emit(Phaser.Core.Events.FOCUS); reset(); restored();
  pass("設定時間で終了、時間切れ後の通常操作、アイテム取得済み状態、フォーカス喪失と手動リセット");

  collectBoth();
  const hole = stage.holes[0]; place(hole.x + hole.width / 2, WORLD.ground + 5);
  scene.body.blocked.down = false;
  key("ArrowRight", true);
  let wall = false, respawn = false;
  for (let i = 0; i < 120; i++) {
    step();
    if (scene.body.blocked.right) { wall = true; near(scene.body.velocity.x, 0, "効果併用中も穴の壁で停止"); }
    if (scene.body.center.x === WORLD.width / 2) { respawn = true; break; }
  }
  assert(wall && respawn, "能力取得後も穴へ落下してリスポーン"); restored();
  near(scene.children.length, count, "リスポーンで表示が増えない");
  near(scene.physics.world.staticBodies.size, staticCount, "リスポーンでボディが増えない");
  pass("パワーアップ中の穴の壁・落下・リスポーンで全能力解除と全アイテム復元");

  await restart({ ...stage, holes: [] });
  const rock = stage.obstacles[0];
  for (const sign of [-1, 1]) {
    reset(); collectBoth();
    const code = sign > 0 ? "ArrowRight" : "ArrowLeft";
    place(sign > 0 ? rock.x - PLAYER.width / 2 - 20 : rock.x + rock.width + PLAYER.width / 2 + 20);
    key(code, true); frames(30);
    near(sign > 0 ? scene.body.right : scene.body.left, sign > 0 ? rock.x : rock.x + rock.width, "自動ダッシュ中も岩の側面で停止");
    near(scene.body.velocity.x, 0, "岩を押してもめり込まない");
    near(scene.movementState.speed, PLAYER.speed, "岩の側面で助走を解除");
    key(code, false); key(sign > 0 ? "ArrowLeft" : "ArrowRight", true); frames(5);
    assert(sign > 0 ? scene.body.right < rock.x : scene.body.left > rock.x + rock.width, "能力有効中も岩から反対方向へ離れられる");
    key("ArrowLeft", false); key("ArrowRight", false);
  }
  place(rock.x + rock.width / 2, rock.y); frames(2);
  assert(scene.body.blocked.down, "能力有効中も岩上へ着地");
  key("Space", true); scene.update(0, 0); key("Space", false); frames(10);
  key("Space", true); scene.update(0, 0); key("Space", false);
  near(scene.body.velocity.y, -PLAYER.jumpSpeed * PLAYER.airJumpMultiplier, "岩上からも2段ジャンプ");
  reset(); restored();
  pass("能力併用中の岩の左右衝突・停止維持・助走解除・離脱、岩上着地と2段ジャンプ");

  const airStage = { id: "air-item-test", background: stage.background, items: [
    { id: "air-tea", kind: "tea", x: 650, y: 280, width: 60, height: 36 },
    { id: "air-shrimp", kind: "shrimp", x: 650, y: 280, width: 60, height: 36 }
  ] };
  await restart(airStage);
  const airPickup = () => {
    key("ArrowRight", true); key("Space", true); step(); key("Space", false);
    for (let i = 0; i < 25 && !scene.powerUps.active("doubleJump"); i++) step();
    assert(scene.powerUps.active("autoDash") && scene.powerUps.active("doubleJump") && !scene.body.blocked.down, "空中で両アイテムを取得");
    near(scene.body.velocity.x, PLAYER.speed, "空中取得で横速度が変わらない");
  };
  airPickup();
  scene.update(0, Math.max(ITEM_TYPES.tea.durationSeconds, ITEM_TYPES.shrimp.durationSeconds) * 1000);
  assert(!scene.powerUps.active("autoDash") && !scene.powerUps.active("doubleJump"), "長い更新間隔でも実際の経過時間で効果終了");
  near(scene.body.velocity.x, PLAYER.speed, "空中の効果終了でも横速度を維持");
  const expiredY = scene.body.velocity.y;
  key("Space", true); scene.update(0, 0); key("Space", false);
  near(scene.body.velocity.y, expiredY, "時間切れ後は未使用の空中ジャンプも使えない");
  key("ArrowRight", false); frames(100); reset(); restored();
  airPickup();
  key("Space", true); scene.update(0, 0); key("Space", false);
  near(scene.body.velocity.y, -PLAYER.jumpSpeed * PLAYER.airJumpMultiplier, "空中取得後すぐに追加ジャンプを使える");
  for (let i = 0; i < 120 && !scene.body.blocked.down; i++) step();
  assert(scene.body.blocked.down, "空中取得後に地上へ着地");
  near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "空中取得では着地したフレームから最高速度");
  reset(); restored();
  pass("空中取得と時間切れで速度維持・着地で即最高速度・更新間隔によらない持続時間・空中での手動リセット");

  for (const sign of [-1, 1]) {
    const distant = { ...stage, ...parseStageMap(map, { ...STAGE_MAP_GRID, originX: 680 + sign * REBASE_DISTANCE }) };
    await restart(distant);
    const target = scene.items.items[0];
    const originalX = target.image.x;
    // Cross the rebase boundary away from the image, then approach its rendered bounds.
    place(WORLD.width / 2 + sign * (REBASE_DISTANCE + 10)); step(); aligned();
    near(scene.items.originX, sign * REBASE_DISTANCE, "アイテムも左右の座標補正へ参加");
    assert(!target.collected, "離れた座標で誤取得しない");
    place(originalX); scene.update(0, 0); aligned();
    assert(!target.collected, "補正前のローカル座標では誤取得しない");
    place(target.image.x); scene.update(0, 0); aligned();
    assert(target.collected && scene.powerUps.active("autoDash"), "複数補正後も表示位置で取得");
    const left = scene.items.items[1];
    place(WORLD.width / 2 - sign * REBASE_DISTANCE * 3); scene.update(0, 0);
    place(left.image.x); scene.update(0, 0); aligned();
    assert(left.collected && scene.powerUps.active("doubleJump"), "戻って未取得アイテムを表示位置で取得");
    reset(); restored();
  }
  pass("左右・複数回の座標補正と再訪でも表示位置で取得、誤取得なし、補正後の復元");

  await restart({ ...stage, ...parseStageMap(map, { ...STAGE_MAP_GRID, originX: 680, cellWidth: 80, cellHeight: 40 }) });
  aligned(); collectBoth();
  await restart(stage); restored();
  near(scene.children.length, count, "再起動でアイテムの表示が重複しない");
  near(scene.physics.world.colliders.getActive().length, 2, "再起動で衝突処理が重複しない");
  await restart({ id: "legacy-item-test", background: stage.background, decorations: [stage.items[0]] });
  place(stage.items[0].x + stage.items[0].width / 2); scene.update(0, 0);
  assert(scene.powerUps.active("autoDash") && scene.items.items[0].collected, "既存decorationsの座標指定も取得可能");
  pass("マス寸法変更・シーン再起動・オブジェクト数・既存座標指定の互換性");
}
