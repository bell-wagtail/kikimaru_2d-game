import Phaser from "phaser";
import { WalkScene } from "../src/scenes/WalkScene.ts";
import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES } from "../src/stages.ts";
import { advanceTile } from "../src/scrolling.ts";
import { verifyObstacles } from "./obstacles.browser.js";
import { verifyStageMap } from "./stageMap.browser.js";
import { verifyGround } from "./ground.browser.js";
import { verifyItems } from "./items.browser.js";
import { verifyItemFeedback } from "./feedback.browser.js";
import { verifySpeedLines } from "./speedLines.browser.js";
import { verifyScoreQuiz } from "./scoreQuiz.browser.js";
import { verifyTrailStage } from "./trailStage.browser.js";
import { verifyEndpoints } from "./endpoints.browser.js";
import { verifyAudio } from "./audio.browser.js";
import { ITEM_TYPES } from "../src/items.ts";

const game = new Phaser.Game({
  type: new URLSearchParams(location.search).has("canvas") ? Phaser.CANVAS : Phaser.WEBGL,
  parent: "stage", width: WORLD.width, height: WORLD.height, banner: false,
  audio: { noAudio: new URLSearchParams(location.search).has("noaudio") },
  physics: { default: "arcade", arcade: { gravity: { x: 0, y: PLAYER.gravity }, fixedStep: true, fps: 60 } },
  scene: [WalkScene]
});
const output = document.querySelector("#results");
const run = document.querySelector("#run");
const previewButtons = [...document.querySelectorAll("[data-feedback-preview], [data-speed-preview], [data-quiz-preview], [data-fruit-preview], [data-trail-preview], [data-goal-preview]")];
let time = 0;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const near = (a, b, message) => assert(Math.abs(a-b) < 1e-6, `${message}: ${a} / ${b}`);
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
const step = () => { time += 1000/60; game.scene.update(time, 1000/60); };
const render = () => { game.renderer.preRender(); game.scene.render(game.renderer); game.renderer.postRender(); };
const ready = () => {
  if (document.querySelector("#loading").hidden) {
    game.events.off("poststep", ready);
    run.disabled = false;
    document.querySelector("#sample-right").disabled = false;
    document.querySelector("#sample-left").disabled = false;
    document.querySelector("#sample-hole").disabled = false;
    for (const button of previewButtons) button.disabled = false;
    output.textContent = "準備完了";
  }
};
game.events.on("poststep", ready);

document.querySelector("[data-goal-preview]").addEventListener("click", async () => {
  run.disabled = true;
  for (const button of previewButtons) button.disabled = true;
  game.loop.stop();
  const scene = game.scene.getScene("walk");
  const recreated = new Promise(resolve => scene.events.once("create", resolve));
  scene.scene.restart({ stage: {
    id: "goal-preview", background: STAGES.teaRiver.background,
    start: { x: 540, y: WORLD.ground - 36, width: 60, height: 36 },
    goal: { x: 900, y: WORLD.ground - 36, width: 60, height: 36 },
    items: ["tea", "shrimp", "mandarin", "strawberry", "quiz", "quiz", "quiz"].map((kind, index) => ({
      id: `preview-${index}`, kind, x: index < 4 ? 720 : 1200 + index * 120,
      y: WORLD.ground - 36, width: 60, height: 36
    }))
  } });
  game.loop.start(game.step.bind(game)); await recreated; game.loop.stop();
  document.querySelector("#start-walk").click();
  scene.body.reset(750, WORLD.ground - PLAYER.height / 2); scene.update(0, 0);
  const flag = scene.endpoints.goalFlag.getBounds();
  scene.body.reset(flag.left - PLAYER.width / 2 + 1, WORLD.ground - PLAYER.height / 2); scene.update(0, 0);
  render();
  output.textContent = "ゴール結果のプレビュー。結果を閉じると、旗・喜びの表情・きらめきと能力の発光を確認できます。「もう一度」で指定スタートへ戻ります。";
  run.disabled = false;
  for (const button of previewButtons) button.disabled = false;
  game.loop.start(game.step.bind(game));
});

for (const button of previewButtons.filter(button => button.hasAttribute("data-trail-preview"))) {
  button.addEventListener("click", async () => {
    run.disabled = true;
    for (const preview of previewButtons) preview.disabled = true;
    game.loop.stop();
    const scene = game.scene.getScene("walk");
    const recreated = new Promise(resolve => scene.events.once("create", resolve));
    scene.scene.restart({ stage: STAGES.teaRiverTrail });
    game.loop.start(game.step.bind(game));
    await recreated;
    game.loop.stop(); scene.physics.resume();
    if (button.dataset.trailPreview === "high") {
      document.querySelector("#start-walk").click();
      const shrimp = STAGES.teaRiverTrail.items.find(item => item.kind === "shrimp");
      scene.body.reset(shrimp.x - PLAYER.width - 20, WORLD.ground - PLAYER.height / 2);
    }
    step(); render();
    output.textContent = "寄り道ステージ。右へ進み、お茶で走り、えびの2段ジャンプで高台へ登れます。クイズは平地に3か所あります。";
    run.disabled = false;
    for (const preview of previewButtons) preview.disabled = false;
    game.loop.start(game.step.bind(game));
  });
}

document.querySelector("[data-fruit-preview]").addEventListener("click", async () => {
  run.disabled = true;
  for (const button of previewButtons) button.disabled = true;
  game.loop.stop();
  const scene = game.scene.getScene("walk");
  const recreated = new Promise(resolve => scene.events.once("create", resolve));
  scene.scene.restart({ stage: {
    id: "fruit-preview", background: STAGES.teaRiver.background,
    items: ["mandarin", "strawberry"].map((kind, index) => ({ id: kind, kind,
      x: WORLD.width / 2 + 90 + index * 180, y: WORLD.ground - 36, width: 60, height: 36 }))
  } });
  game.loop.start(game.step.bind(game));
  await recreated;
  game.loop.stop(); scene.physics.resume(); step(); render();
  output.textContent = "果物プレビュー。右へ進むとみかん・いちごを取得できます。現行マップは変更しません。";
  run.disabled = false;
  for (const button of previewButtons) button.disabled = false;
  game.loop.start(game.step.bind(game));
});

document.querySelector("[data-quiz-preview]").addEventListener("click", async () => {
  run.disabled = true;
  for (const button of previewButtons) button.disabled = true;
  game.loop.stop();
  const scene = game.scene.getScene("walk");
  const recreated = new Promise(resolve => scene.events.once("create", resolve));
  scene.scene.restart({ stage: {
    id: "quiz-preview", background: STAGES.teaRiver.background,
    items: ["tea", "shrimp", "fish", "quiz"].map(kind => ({ id: kind, kind,
      x: WORLD.width / 2 - 30, y: WORLD.ground - 36, width: 60, height: 36 }))
  } });
  game.loop.start(game.step.bind(game));
  await recreated;
  game.loop.stop(); scene.physics.resume(); step(); render();
  output.textContent = "クイズプレビュー。回答後は「おさんぽを続ける」で再開します。現行マップは変更しません。";
  run.disabled = false;
  for (const button of previewButtons) button.disabled = false;
  game.loop.start(game.step.bind(game));
});

for (const button of previewButtons.filter(button => button.hasAttribute("data-feedback-preview"))) {
  button.addEventListener("click", async () => {
    run.disabled = true;
    for (const preview of previewButtons) preview.disabled = true;
    game.loop.stop();
    const scene = game.scene.getScene("walk");
    const kind = button.dataset.feedbackPreview;
    const kinds = kind === "tea" || kind === "shrimp" ? [kind] : ["tea", "shrimp"];
    const recreated = new Promise(resolve => scene.events.once("create", resolve));
    scene.scene.restart({ stage: {
      id: "feedback-preview", background: STAGES.teaRiver.background,
      items: kinds.map(item => ({ id: item, kind: item, x: WORLD.width / 2 - 30, y: WORLD.ground - 36, width: 60, height: 36 }))
    } });
    game.loop.start(game.step.bind(game));
    await recreated;
    game.loop.stop();
    scene.physics.resume();
    step();
    scene.update(0, 0);
    if (kind === "ending") scene.update(0, Math.max(...kinds.map(item => ITEM_TYPES[item].durationSeconds)) * 1000);
    render();
    output.textContent = "演出プレビュー（時間停止）。結合テストを実行すると通常の検証へ戻ります。";
    run.disabled = false;
    for (const preview of previewButtons) preview.disabled = false;
  });
}

for (const button of previewButtons.filter(button => button.hasAttribute("data-speed-preview"))) {
  button.addEventListener("click", async () => {
    run.disabled = true;
    for (const preview of previewButtons) preview.disabled = true;
    game.loop.stop();
    const scene = game.scene.getScene("walk");
    const variant = button.dataset.speedPreview;
    const recreated = new Promise(resolve => scene.events.once("create", resolve));
    scene.scene.restart({ stage: {
      id: "speed-preview", background: STAGES.teaRiver.background,
      items: variant === "both" ? ["tea", "shrimp"].map(kind => ({ id: kind, kind, x: WORLD.width / 2 - 30, y: WORLD.ground - 36, width: 60, height: 36 })) : []
    } });
    game.loop.start(game.step.bind(game));
    await recreated;
    game.loop.stop(); scene.physics.resume(); step();
    key("ArrowRight", true); key("ShiftLeft", true);
    const seconds = PLAYER.accelerationSeconds * (variant === "half" ? 0.5 : 1);
    for (let i = 0; i < Math.ceil(seconds * 60); i++) step();
    key("ArrowRight", false); key("ShiftLeft", false);
    render();
    output.textContent = "スピード線プレビュー（時間停止）。結合テストを実行すると通常の検証へ戻ります。";
    run.disabled = false;
    for (const preview of previewButtons) preview.disabled = false;
  });
}

document.querySelector("#sample-hole").addEventListener("click", () => {
  const scene = game.scene.getScene("walk");
  const hole = scene.stageDefinition.holes?.[0];
  if (!hole) return;
  game.loop.stop();
  scene.physics.resume();
  document.querySelector("#reset").click();
  scene.body.reset(hole.x - PLAYER.width / 2 - 20, WORLD.ground - PLAYER.height / 2);
  step(); render();
  game.loop.start(game.step.bind(game));
});

for (const [id, code] of [["sample-right", "ArrowRight"], ["sample-left", "ArrowLeft"]]) {
  document.getElementById(id).addEventListener("click", () => {
    game.loop.stop();
    game.scene.getScene("walk").physics.resume();
    key(code, true);
    for (let i = 0; i < 240; i++) step();
    key(code, false);
    step();
    render();
    game.loop.start(game.step.bind(game));
  });
}

run.addEventListener("click", async () => {
  run.disabled = true;
  for (const button of previewButtons) button.disabled = true;
  game.loop.stop();
  const scene = game.scene.getScene("walk");
  scene.physics.resume();
  scene.audio.session.setMuted(true);
  const lines = [];
  const pass = message => { lines.push(`PASS ${message}`); output.textContent = lines.join("\n"); };
  const restart = async (stage, { autoStart = true } = {}) => {
    const recreated = new Promise(resolve => scene.events.once("create", resolve));
    scene.scene.restart({ stage });
    game.loop.start(game.step.bind(game));
    await recreated;
    game.loop.stop();
    if (autoStart) {
      if (stage.start) document.querySelector("#start-walk").click();
      scene.physics.resume();
      step();
    }
  };
  try {
    await restart({ ...STAGES.teaRiver, obstacles: [], items: [], decorations: [], holes: [] });
    document.querySelector("#reset").click();
    step();
    const frames = count => { for (let i = 0; i < count; i++) step(); };
    const gain = (PLAYER.speed * PLAYER.dashMultiplier - PLAYER.speed) / PLAYER.accelerationSeconds;
    key("ShiftLeft", true); frames(180);
    near(scene.body.velocity.x, 0, "Shift単独で移動・助走しない");
    key("ArrowRight", true); frames(30);
    near(scene.body.velocity.x, PLAYER.speed + gain * 0.5, "0.5秒の加速");
    key("ShiftRight", true); key("ShiftLeft", false); frames(30);
    near(scene.body.velocity.x, PLAYER.speed + gain, "片方のShift解除でも加速を継続");
    key("ShiftRight", false); frames(30);
    near(scene.body.velocity.x, PLAYER.speed + gain * 0.5, "0.5秒の減速");
    key("ShiftLeft", true); frames(60);
    near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "再加速で最高速度");
    assert(document.querySelector("#state").textContent === "右へダッシュ中", "ダッシュの表示");
    key("ShiftLeft", false); frames(PLAYER.decelerationSeconds * 60);
    near(scene.body.velocity.x, PLAYER.speed, "設定時間で徒歩速度まで減速");
    pass("Shift単独・左右Shift併用・連続加減速・1秒加速→0.5秒減速→1秒加速・表示");

    const flights = [];
    for (const runUp of [0, PLAYER.accelerationSeconds / 2, PLAYER.accelerationSeconds]) {
      document.querySelector("#reset").click(); step();
      key("ArrowRight", true);
      if (runUp) key("ShiftLeft", true);
      frames(runUp * 60);
      // Freeze the acceleration on the launch update to sample the exact run-up speed.
      key("Space", true); scene.update(time, 0); key("Space", false);
      const speed = scene.body.velocity.x;
      near(speed, PLAYER.speed + gain * runUp, "踏切速度");
      near(scene.body.velocity.y, -PLAYER.jumpSpeed, "速度に依存しないジャンプ初速");
      key("ShiftLeft", runUp === 0);
      const startX = scene.body.center.x;
      let peak = scene.body.bottom, duration = 0;
      do {
        step(); duration++;
        peak = Math.min(peak, scene.body.bottom);
        if (!scene.body.blocked.down) near(scene.body.velocity.x, speed, "空中のShift操作で速度が変わらない");
      } while (!scene.body.blocked.down && duration < 120);
      assert(scene.body.blocked.down, "ジャンプが着地");
      near(scene.body.velocity.x, speed + (runUp === 0 ? gain : -gain) / 60, "着地から加減速再開");
      flights.push({ peak, duration, distance: scene.body.center.x - startX, speed });
    }
    for (const flight of flights) {
      near(flight.peak, flights[0].peak, "全速度で最高到達点が一致");
      near(flight.duration, flights[0].duration, "全速度で滞空時間が一致");
      near(flight.distance / flight.speed, flights[0].distance / flights[0].speed, "飛距離は踏切速度に比例");
    }
    assert(flights[0].distance < flights[1].distance && flights[1].distance < flights[2].distance, "助走に応じて飛距離が増加");
    pass("徒歩・加速途中・最高速度のジャンプ：高さと滞空時間一定・飛距離は速度依存・空中維持・着地後の加減速");
    document.querySelector("#reset").click(); step();
    const count = scene.children.length;
    const partCount = scene.parts.length;
    for (const [code, sign, dash] of [["ArrowRight",1,false],["ArrowLeft",-1,false],["ArrowRight",1,true],["ArrowLeft",-1,true]]) {
      document.querySelector("#reset").click(); step();
      if (dash) key("ShiftLeft", true);
      key(code, true);
      frames(PLAYER.accelerationSeconds * 60);
      let rebases = 0, landed = false, jumped = false, airborneRebase = false;
      for (let frame = 0; frame < 12000; frame++) {
        // Jump just before each origin shift to exercise in-flight rebasing.
        const distance = sign * (scene.body.center.x - WORLD.width/2);
        const launch = distance > 8150 && distance < 8160 && scene.body.blocked.down;
        if (launch) key("Space", true);
        const before = scene.body.center.x;
        const oldPhase = scene.scenery.background.tilePositionX;
        const velocity = scene.body.velocity.x;
        step();
        near(scene.body.velocity.x, sign * PLAYER.speed * (dash ? PLAYER.dashMultiplier : 1), "移動速度");
        if (launch) key("Space", false);
        const expected = advanceTile(oldPhase, velocity/60, scene.scenery.scale, scene.scenery.factor, scene.scenery.backgroundWidth);
        near(scene.scenery.background.tilePositionX, expected, "背景の連続性");
        if (Math.abs(scene.body.center.x - before) > 4096) {
          rebases++;
          if (!scene.body.blocked.down) airborneRebase = true;
        }
        if (scene.body.bottom < WORLD.ground-1) jumped = true;
        if (jumped && scene.body.blocked.down) landed = true;
        assert(Math.abs(scene.body.center.x - WORLD.width/2) < 8192, "物理座標が増大");
        near(scene.actor.x-scene.cameras.main.scrollX, WORLD.width/2, "キャラクターのカメラ追従");
        assert(scene.body.bottom <= WORLD.ground+1e-6, "地面のすり抜け");
        assert(!scene.body.blocked.left && !scene.body.blocked.right, "左右端で停止");
        assert(scene.children.length === count, "表示オブジェクトの増加");
      }
      key(code, false);
      if (dash) key("ShiftLeft", false);
      assert(rebases >= 5 && airborneRebase && landed, "座標補正・ジャンプ・着地の未検証");
      pass(`${dash ? "ダッシュで" : "通常速度で"}${sign > 0 ? "右" : "左"}へ200秒相当：反復・座標補正${rebases}回・補正中のジャンプと着地`);
    }
    step();
    const stopped = scene.scenery.background.tilePositionX;
    for (let i=0;i<30;i++) step();
    near(scene.scenery.background.tilePositionX, stopped, "停止時の背景移動");
    key("ArrowLeft",true); key("ArrowRight",true);
    step();
    near(scene.body.velocity.x,0,"左右同時入力");
    key("ArrowLeft",false); key("ArrowRight",false);
    pass("停止・左右同時入力");
    key("ArrowRight",true); key("ShiftLeft",true); step();
    game.events.emit(Phaser.Core.Events.BLUR);
    assert(scene.physics.world.isPaused && scene.body.velocity.x === 0, "フォーカス喪失で停止しない");
    game.events.emit(Phaser.Core.Events.FOCUS);
    key("ArrowRight",false); step();
    assert(!scene.physics.world.isPaused && scene.body.velocity.x === 0, "復帰で勝手に移動");
    key("ArrowRight",true); step();
    near(scene.body.velocity.x, PLAYER.speed, "復帰後にダッシュが残らない");
    key("ShiftLeft",false); key("ShiftLeft",true); step();
    pass("ダッシュ中のフォーカス喪失と復帰");
    document.querySelector("#reset").click();
    step();
    near(scene.body.center.x, WORLD.width/2, "リセット位置");
    near(scene.cameras.main.scrollX, 0, "カメラリセット");
    near(scene.scenery.background.tilePositionX,0,"背景リセット");
    near(scene.scenery.ground.tilePositionX,0,"地面リセット");
    key("ArrowRight",true); step();
    near(scene.body.velocity.x, PLAYER.speed, "リセット後にダッシュが残らない");
    key("ShiftLeft",false); key("ArrowRight",false); step();
    pass("開始位置・背景・地面・カメラ・ダッシュのリセット");

    const variant = { id: "test-stage", background: { ...STAGES.teaRiver.background, scrollFactor: 0.5, seamBlendPixels: 0 } };
    const recreated = new Promise(resolve => scene.events.once("create", resolve));
    scene.scene.restart({ stage: variant });
    game.loop.start(game.step.bind(game));
    await recreated;
    game.loop.stop();
    near(scene.scenery.factor,0.5,"ステージの速度設定");
    near(scene.scenery.backgroundWidth,1536,"継ぎ目補正なしの設定");
    assert(scene.children.length === count,"再起動時の表示オブジェクト重複");
    assert(scene.parts.length === partCount,"再起動時のパーツ重複");
    pass("別ステージ定義での再起動・補正なし設定・オブジェクト再利用");

    await verifyObstacles({ scene, game, key, step, restart, pass, assert, near });
    await verifyStageMap({ scene, key, step, restart, pass, assert, near });
    await verifyGround({ scene, key, step, restart, pass, assert, near });
    await verifyItems({ scene, game, key, step, restart, pass, assert, near });
    await verifyItemFeedback({ scene, game, key, step, restart, pass, assert, near });
    await verifySpeedLines({ scene, game, key, step, restart, pass, assert, near });
    await verifyScoreQuiz({ scene, game, key, step, restart, pass, assert, near });
    await verifyTrailStage({ scene, key, step, restart, pass, assert, near });
    await verifyEndpoints({ scene, game, key, step, restart, pass, assert, near });
    await verifyAudio({ scene, game, step, restart, pass, assert, near });
    await restart(STAGES.teaRiver);
    step(); render();
    pass(`全項目完了（${game.renderer.type === Phaser.CANVAS ? "Canvas" : "WebGL"}）`);
  } catch (error) {
    output.textContent = `${lines.join("\n")}\nFAIL ${error.stack}`;
    render();
  } finally {
    key("ArrowLeft",false); key("ArrowRight",false); key("Space",false);
    key("ShiftLeft",false); key("ShiftRight",false);
    run.disabled = false;
    for (const button of previewButtons) button.disabled = false;
    game.loop.start(game.step.bind(game));
  }
});
