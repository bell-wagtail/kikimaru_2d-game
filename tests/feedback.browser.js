import Phaser from "phaser";
import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES } from "../src/stages.ts";
import { ITEM_TYPES } from "../src/items.ts";
import { ITEM_FEEDBACK } from "../src/feedback.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";

export async function verifyItemFeedback({ scene, game, key, step, restart, pass, assert, near }) {
  const frames = count => { for (let i = 0; i < count; i++) step(); };
  const reset = () => { document.querySelector("#reset").click(); step(); };
  const stage = { id: "feedback-test", background: STAGES.teaRiver.background, items: [
    { id: "tea", kind: "tea", x: 800, y: WORLD.ground - 36, width: 60, height: 36 },
    { id: "shrimp", kind: "shrimp", x: 1000, y: WORLD.ground - 36, width: 60, height: 36 },
    { id: "tea-again", kind: "tea", x: 1200, y: WORLD.ground - 36, width: 60, height: 36 }
  ] };
  const place = (x, bottom = WORLD.ground) => {
    scene.body.reset(x, bottom - PLAYER.height / 2);
    scene.body.blocked.down = bottom === WORLD.ground;
    scene.previousPlayerX = x;
  };
  const collect = id => {
    const item = scene.items.items.find(item => item.definition.id === id);
    place(item.image.x); scene.update(0, 0);
  };
  const glows = () => scene.feedback.glows;
  const glow = kind => glows().find(item => item.kind === kind);
  const message = () => scene.feedback.message;
  const aligned = () => {
    for (const { kind, image } of glows()) {
      if (!image.visible) continue;
      near(image.x, scene.actor.x, "光が表示キャラクターの中心へ追従");
      near(image.y, scene.actor.y - scene.body.height * ITEM_FEEDBACK.centerHeightRatio, "光の中心高さ");
      near(image.displayWidth, Math.max(scene.body.width, scene.body.height) * ITEM_TYPES[kind].glow.diameterScale, "キャラクターの大きさから光の直径を決定");
      near(image.displayHeight, image.displayWidth, "光が円形のまま");
      assert(image.alpha >= ITEM_FEEDBACK.minAlpha && image.alpha <= ITEM_FEEDBACK.maxAlpha, "光の透明度の範囲");
      assert(!image.body, "光が衝突・取得のボディを持たない");
      assert(scene.children.getIndex(image) < scene.children.getIndex(scene.actor), "光をキャラクターの後ろへ描く");
    }
    near(message().scrollFactorX, 0, "通知を画面へ固定");
    assert(message().depth > scene.actor.depth, "通知はキャラクターより手前に表示");
  };
  const empty = () => {
    assert(glows().every(item => !item.image.visible), "全ての光を消去");
    assert(!message().visible && message().text === "", "通知を消去");
  };

  await restart(stage); empty();
  const count = scene.children.length, textures = scene.textures.getTextureKeys().length;
  collect("tea");
  assert(glow("tea").image.visible && !glow("shrimp").image.visible, "お茶だけで緑の光を表示");
  assert(message().text === "お茶を取得！" && message().visible, "取得した瞬間に短い文字を表示");
  frames(ITEM_FEEDBACK.noticeSeconds * 60);
  assert(!message().visible && glow("tea").image.visible, "通知だけが消えて光は継続");
  collect("shrimp");
  assert(glows().every(item => item.image.visible), "併用中は二重の光");
  assert(!document.querySelector("#state").textContent.includes("秒"), "能力名と残り秒数を常設しない");
  assert(glow("shrimp").image.displayWidth > glow("tea").image.displayWidth, "赤の外側と緑の内側を分離");
  aligned();
  const normalPhase = glow("shrimp").phase; step();
  const normalAdvance = (glow("shrimp").phase - normalPhase + 1) % 1;
  scene.powerUps.advance(ITEM_TYPES.tea.durationSeconds - ITEM_FEEDBACK.noticeSeconds - ITEM_FEEDBACK.warningSeconds / 2);
  scene.update(0, 0);
  const urgentPhase = glow("tea").phase; step();
  const urgentAdvance = (glow("tea").phase - urgentPhase + 1) % 1;
  assert(urgentAdvance > normalAdvance, "終了が近い効果だけ明滅の周期を短くする");
  const otherPhase = glow("shrimp").phase;
  collect("tea-again");
  near(scene.powerUps.secondsLeft("autoDash"), ITEM_TYPES.tea.durationSeconds, "再取得で効果時間を更新");
  near(glow("tea").phase, 0, "再取得で落ち着いた明滅へ戻す");
  near(glow("shrimp").phase, otherPhase, "別効果の明滅を変更しない");
  assert(message().text.includes("お茶を取得！") && glows().length === 2 && scene.children.length === count, "再取得で光や通知オブジェクトが増えない");
  pass("お茶の緑・えびの赤・二重の円形発光、取得通知と自動消去、終了前の周期短縮と再取得");

  reset(); collect("tea"); frames(60); collect("shrimp"); place(600);
  frames((ITEM_TYPES.tea.durationSeconds - 1) * 60);
  assert(!glow("tea").image.visible && glow("shrimp").image.visible, "効果時間に従って光を個別に消す");
  assert(message().text === "お茶の効果が終了しました", "時間切れを一度通知");
  frames(60);
  assert(glows().every(item => !item.image.visible) && message().text.includes("えびの効果が終了しました"), "両効果の終了を表示");
  frames(ITEM_FEEDBACK.noticeSeconds * 60); empty();
  pass("個別の時間切れで光を消去、終了通知の重なり・表示時間・一度だけの通知");

  reset(); collect("tea"); collect("shrimp");
  const phaseBeforeBlur = glow("tea").phase, noticeBeforeBlur = message().text;
  game.events.emit(Phaser.Core.Events.BLUR); frames(180);
  near(glow("tea").phase, phaseBeforeBlur, "フォーカス喪失で明滅を停止");
  assert(message().text === noticeBeforeBlur, "停止中は通知時間も進めない");
  game.events.emit(Phaser.Core.Events.FOCUS);
  for (const sign of [-1, 1]) {
    key(sign > 0 ? "ArrowRight" : "ArrowLeft", true); frames(5); aligned();
    key("ArrowRight", false); key("ArrowLeft", false);
    place(WORLD.width / 2 + sign * (REBASE_DISTANCE + 20)); scene.update(0, 0); aligned();
    near(glow("tea").image.x, scene.body.center.x, "左右の座標補正後も光がずれない");
    key("Space", true); scene.update(0, 0); key("Space", false); frames(10); aligned();
    reset(); empty(); collect("tea"); collect("shrimp");
  }
  place(600, WORLD.height + PLAYER.height + 100); scene.update(0, 0); empty();
  frames(ITEM_FEEDBACK.noticeSeconds * 60); empty();
  near(scene.children.length, count, "補正・リセット・リスポーンで演出が増えない");
  pass("左右反転・ジャンプ・左右の座標補正に追従、フォーカス停止、リセット・リスポーンで演出を全消去");

  collect("tea"); collect("shrimp");
  await restart(stage); empty();
  near(scene.children.length, count, "シーン再起動で光・通知が重複しない");
  near(scene.textures.getTextureKeys().length, textures, "再起動で発光テクスチャを再利用");
  near(scene.physics.world.colliders.getActive().length, 2, "演出がColliderを増やさない");
  pass("演出の表示数・テクスチャ・Colliderを維持し、シーン再起動で消去");
}
