import Phaser from "phaser";
import { WalkScene } from "../src/scenes/WalkScene.ts";
import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES } from "../src/stages.ts";
import { advanceTile } from "../src/scrolling.ts";

const game = new Phaser.Game({
  type: new URLSearchParams(location.search).has("canvas") ? Phaser.CANVAS : Phaser.WEBGL,
  parent: "stage", width: WORLD.width, height: WORLD.height, banner: false,
  audio: { noAudio: true },
  physics: { default: "arcade", arcade: { gravity: { x: 0, y: PLAYER.gravity }, fixedStep: true, fps: 60 } },
  scene: [WalkScene]
});
const output = document.querySelector("#results");
const run = document.querySelector("#run");
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
    output.textContent = "準備完了";
  }
};
game.events.on("poststep", ready);

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
  game.loop.stop();
  const scene = game.scene.getScene("walk");
  scene.physics.resume();
  const lines = [];
  const pass = message => { lines.push(`PASS ${message}`); output.textContent = lines.join("\n"); };
  try {
    document.querySelector("#reset").click();
    step();
    key("ShiftLeft", true); step();
    near(scene.body.velocity.x, 0, "Shift単独で移動しない");
    key("ArrowRight", true); step();
    near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "Shiftで加速");
    assert(document.querySelector("#state").textContent === "右へダッシュ中", "ダッシュの表示");
    key("ShiftRight", true); key("ShiftLeft", false); step();
    near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "片方のShift解除で維持");
    key("ShiftRight", false); step();
    near(scene.body.velocity.x, PLAYER.speed, "Shift解除で通常速度");
    key("Space", true); step(); key("Space", false);
    near(scene.body.velocity.y, -PLAYER.jumpSpeed, "通常ジャンプの初速");
    key("ShiftLeft", true); step();
    near(scene.body.velocity.x, PLAYER.speed, "徒歩ジャンプ中のShiftで加速しない");
    near(scene.body.velocity.y, -PLAYER.jumpSpeed + PLAYER.gravity / 60, "Shiftで鉛直速度を変えない");
    assert(document.querySelector("#state").textContent === "ジャンプ！", "徒歩ジャンプの表示を維持");
    for (let frame = 0; frame < 120 && !scene.body.blocked.down; frame++) {
      step();
      if (!scene.body.blocked.down) near(scene.body.velocity.x, PLAYER.speed, "着地までは徒歩速度");
    }
    assert(scene.body.blocked.down, "徒歩ジャンプが着地");
    near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "着地後に押下中のShiftを反映");
    key("Space", true); step(); key("Space", false);
    near(scene.body.velocity.y, -PLAYER.jumpSpeed, "ダッシュジャンプの初速");
    key("ShiftLeft", false); step();
    assert(document.querySelector("#state").textContent === "ダッシュジャンプ！", "ダッシュジャンプの表示を維持");
    near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "空中でShiftを離してもダッシュ速度");
    for (let frame = 0; frame < 120 && !scene.body.blocked.down; frame++) {
      step();
      if (!scene.body.blocked.down) near(scene.body.velocity.x, PLAYER.speed * PLAYER.dashMultiplier, "着地まではダッシュ速度");
    }
    assert(scene.body.blocked.down, "ダッシュジャンプが着地");
    near(scene.body.velocity.x, PLAYER.speed, "着地後にShift解除を反映");
    key("ArrowRight", false);
    pass("Shift単独・左右Shift併用・地上の速度切替・徒歩／ダッシュの踏切速度維持・着地時のShift反映・表示");
    document.querySelector("#reset").click(); step();
    const count = scene.children.length;
    const partCount = scene.parts.length;
    for (const [code, sign, dash] of [["ArrowRight",1,false],["ArrowLeft",-1,false],["ArrowRight",1,true],["ArrowLeft",-1,true]]) {
      if (dash) key("ShiftLeft", true);
      key(code, true);
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

    const restored = new Promise(resolve => scene.events.once("create", resolve));
    scene.scene.restart({ stage: STAGES.teaRiver });
    game.loop.start(game.step.bind(game));
    await restored;
    game.loop.stop();
    step(); render();
    pass(`全項目完了（${game.renderer.type === Phaser.CANVAS ? "Canvas" : "WebGL"}）`);
  } catch (error) {
    output.textContent = `${lines.join("\n")}\nFAIL ${error.stack}`;
    render();
  } finally {
    key("ArrowLeft",false); key("ArrowRight",false); key("Space",false);
    key("ShiftLeft",false); key("ShiftRight",false);
    run.disabled = false;
    game.loop.start(game.step.bind(game));
  }
});
