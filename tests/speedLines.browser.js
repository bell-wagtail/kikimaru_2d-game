import Phaser from "phaser";
import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES } from "../src/stages.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";

export async function verifySpeedLines({ scene, game, key, step, restart, pass, assert, near }) {
  const stage = { id: "speed-lines", background: STAGES.teaRiver.background };
  const frames = count => { for (let i = 0; i < count; i++) step(); };
  const graphic = () => scene.speedLines.graphics;
  const reset = () => { document.querySelector("#reset").click(); step(); };
  const aligned = sign => {
    const image = graphic();
    assert(image.visible, "ダッシュ中に線を表示");
    near(image.x, scene.actor.x, "線の横位置をキャラクターへ合わせる");
    near(image.y, scene.actor.y, "線の高さをキャラクターへ合わせる");
    near(image.scaleX, sign, "実際の横速度に応じて後方を切り替える");
    assert(!image.body && scene.children.getIndex(image) < scene.children.getIndex(scene.actor), "線はキャラクターの背後に描き、物理ボディを持たない");
  };
  const capture = () => {
    const image = graphic(), rectangles = [];
    const original = image.fillRoundedRect;
    image.fillRoundedRect = function(...args) { rectangles.push(args); return original.apply(this, args); };
    try { scene.update(0, 0); } finally { image.fillRoundedRect = original; }
    return rectangles;
  };

  await restart(stage);
  const children = scene.children.length;
  key("ShiftLeft", true); frames(10); assert(!graphic().visible, "Shift単独では線を出さない");
  key("ShiftLeft", false); key("ArrowRight", true); frames(10);
  assert(!graphic().visible, "通常歩行では線を出さない");
  key("ShiftLeft", true); frames(PLAYER.accelerationSeconds * 30);
  const halfway = capture(), halfwayAlpha = graphic().alpha;
  assert(halfway.length > 0 && halfway.every(([x,, width]) => x + width < -scene.body.width / 2), "加速途中の線がキャラクターの後方にある");
  aligned(1);
  frames(PLAYER.accelerationSeconds * 30);
  const full = capture();
  assert(full.length > halfway.length && Math.max(...full.map(rect => rect[2])) > Math.max(...halfway.map(rect => rect[2])) && graphic().alpha > halfwayAlpha, "最高速度では線が多く・長く・はっきり見える");
  key("ShiftLeft", false); frames(PLAYER.decelerationSeconds * 30);
  const slowing = capture();
  assert(slowing.length < full.length && Math.max(...slowing.map(rect => rect[2])) < Math.max(...full.map(rect => rect[2])), "減速に応じて線が少なく短くなる");
  frames(PLAYER.decelerationSeconds * 30); assert(!graphic().visible, "徒歩速度へ戻ると消える");
  key("ArrowRight", false); step();
  pass("通常歩行とShift単独では線なし、実速度による加減速で線の長さ・本数・濃さが変化");

  reset(); key("ArrowRight", true); key("ShiftLeft", true); frames(PLAYER.accelerationSeconds * 60);
  key("Space", true); scene.update(0, 0); key("Space", false);
  const takeoff = scene.body.velocity.x, alpha = graphic().alpha;
  key("ShiftLeft", false); frames(8);
  near(scene.body.velocity.x, takeoff, "空中の速度維持"); near(graphic().alpha, alpha, "空中ではShiftを離しても線の強さを維持"); aligned(1);
  key("ArrowRight", false); step(); assert(!graphic().visible, "空中で横移動を止めると線を消す");
  key("ArrowLeft", true); step(); aligned(-1);
  for (const sign of [-1, 1]) {
    key("ArrowLeft", false); key("ArrowRight", false); key(sign < 0 ? "ArrowLeft" : "ArrowRight", true);
    scene.body.reset(WORLD.width / 2 + sign * (REBASE_DISTANCE + 20), WORLD.ground - PLAYER.height / 2 - 100);
    scene.body.setVelocityY(-100); scene.previousPlayerX = scene.body.center.x;
    scene.update(0, 0); aligned(sign);
    near(graphic().x - scene.cameras.main.scrollX, WORLD.width / 2, "座標補正後も画面内の位置が一致");
  }
  game.events.emit(Phaser.Core.Events.BLUR); frames(10); assert(!graphic().visible, "フォーカス喪失では線を消す");
  game.events.emit(Phaser.Core.Events.FOCUS); step(); assert(!graphic().visible, "復帰時に線を残さない");
  pass("ジャンプの速度維持・空中停止・左右方向転換・左右の座標補正・フォーカス喪失に追従");

  reset(); scene.powerUps.acquire("tea"); key("ArrowRight", true); frames(PLAYER.accelerationSeconds * 60); aligned(1);
  await restart({ ...stage, obstacles: [{ id: "wall", kind: "rock", x: 950, y: WORLD.ground - 180, width: 60, height: 180 }] });
  key("ArrowRight", true); key("ShiftLeft", true); frames(120);
  assert(scene.body.blocked.right && !graphic().visible, "岩の壁で停止すると線も消える");
  reset(); assert(!graphic().visible, "手動リセットで消去");
  scene.powerUps.acquire("tea"); key("ArrowLeft", true); frames(PLAYER.accelerationSeconds * 60); aligned(-1);
  scene.body.reset(scene.body.center.x, WORLD.height + PLAYER.height + 100); scene.update(0, 0);
  assert(!graphic().visible, "落下リスポーンで消去");
  await restart(stage); assert(!graphic().visible && scene.children.length === children, "再起動でも線を残さず描画数を維持");
  near(scene.physics.world.colliders.getActive().length, 2, "線にColliderを追加しない");
  pass("お茶の自動ダッシュ・岩の衝突停止・手動リセット・落下リスポーン・再起動、表示とColliderの再利用");
}
