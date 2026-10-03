import Phaser from "phaser";
import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES, DEFAULT_STAGE, stageItems } from "../src/stages.ts";
import { parseStageMap } from "../src/stageMap.ts";
import { endpointPosition } from "../src/endpoints.ts";
import { itemPoints, SCORE_RULES, stageTotals } from "../src/score.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";
import { QUIZ_QUESTIONS } from "../src/quizData.ts";
import { MILESTONE_FEEDBACK } from "../src/stageEndpoints.ts";

export async function verifyEndpoints({ scene, game, key, step, restart, pass, assert, near }) {
  const click = id => document.getElementById(id).click();
  const frames = count => { for (let index = 0; index < count; index++) step(); };
  const text = "I.o.j.F.F.M.S.Q.Q.Q...G...";
  const grid = { cellWidth: 80, cellHeight: 40, originX: 720, groundY: WORLD.ground };
  const stage = { id: "endpoints-test", background: STAGES.teaRiver.background,
    ...parseStageMap(`${text}\n${"=".repeat(text.length)}`, grid) };
  const place = (x, bottom = WORLD.ground) => {
    scene.body.reset(x, bottom - PLAYER.height / 2);
    scene.body.blocked.down = bottom === WORLD.ground;
    scene.previousPlayerX = x;
  };
  const collect = target => { place(target.image.x, target.definition.y + target.definition.height); scene.update(0, 0); };
  const answer = correct => {
    const index = correct ? scene.quiz.current.correctIndex : (scene.quiz.current.correctIndex + 1) % 4;
    document.querySelectorAll("#quiz-dialog [data-choice]")[index].click();
  };
  const finishQuiz = () => document.querySelector("#quiz-dialog > button").click();
  const initial = () => {
    const position = endpointPosition(scene.stageDefinition.start);
    near(scene.body.center.x, position.x - scene.endpoints.originX, "指定スタートの横位置");
    near(scene.body.bottom, position.bottom, "指定スタートの足元");
    near(scene.actor.x - scene.cameras.main.scrollX, WORLD.width / 2, "開始直後からカメラ中央");
    near(scene.score.value, SCORE_RULES.initial, "得点を初期化");
    near(scene.quiz.answeredCount, 0, "回答数を初期化");
    near(scene.quiz.correctCount, 0, "正答数を初期化");
    assert(!scene.playResult.current && scene.items.items.every(item => !item.collected), "結果と取得済み状態を初期化");
    assert(!scene.powerUps.activeItems().length, "能力を解除");
    assert(scene.parts.find(part => part.layout.id === "head").image.texture.key === "head_idle", "通常表情に戻る");
    assert(scene.actor.list.every((part, index) => part === scene.parts[index].image), "通常のパーツ描画順へ戻る");
    near(scene.scenery.background.tilePositionX, 0, "背景を開始時の位相に復元");
  };
  const frozen = () => JSON.stringify({ x: scene.body.center.x, y: scene.body.bottom, velocity: [scene.body.velocity.x, scene.body.velocity.y],
    clock: scene.clock, phase: scene.phase, actor: [scene.actor.x, scene.actor.y], powers: scene.powerUps.activeItems().map(kind =>
      [kind, scene.powerUps.secondsLeft(kind === "tea" ? "autoDash" : "doubleJump")]),
    glows: scene.feedback.glows.map(glow => [glow.phase, glow.image.x, glow.image.y, glow.image.alpha]),
    notices: [...scene.feedback.notices.notices.entries()], lines: [scene.speedLines.phase, scene.speedLines.graphics.visible],
    background: scene.scenery.background.tilePositionX, ground: scene.scenery.ground.tilePositionX, scroll: scene.cameras.main.scrollX,
    sparkles: scene.endpoints.sparkles.map(image => [image.x, image.y, image.visible]) });

  await restart(stage, { autoStart: false }); initial();
  const children = scene.children.length, bodies = scene.physics.world.staticBodies.size;
  assert(document.querySelector("#start-dialog").open && scene.starting && scene.physics.world.isPaused, "指定スタートは開始操作を待つ");
  const waiting = frozen();
  key("ArrowRight", true); key("Space", true); key("ShiftLeft", true); frames(120);
  assert(frozen() === waiting && scene.controls.direction === 0 && !scene.controls.consumeJump(), "開始待機中の時間と入力を停止");
  const cancelStart = new Event("cancel", { cancelable: true });
  document.querySelector("#start-dialog").dispatchEvent(cancelStart);
  assert(cancelStart.defaultPrevented && document.querySelector("#start-dialog").open, "開始待機はEscで閉じない");
  game.events.emit(Phaser.Core.Events.BLUR); game.events.emit(Phaser.Core.Events.FOCUS);
  assert(scene.physics.world.isPaused && frozen() === waiting, "フォーカス復帰でも開始操作を待つ");
  click("start-walk");
  assert(!scene.starting && !scene.physics.world.isPaused && !document.querySelector("#start-dialog").open, "開始ボタンでゲーム開始");
  assert(scene.controls.direction === 0 && !scene.controls.consumeJump(), "開始時の入力解除");
  key("ArrowRight", false); key("Space", false); key("ShiftLeft", false);
  click("reset"); initial(); assert(scene.starting, "手動リセットでも開始待機"); click("start-walk");
  pass("I指定・開始ボタン・入力停止・Esc拒否・フォーカス復帰・手動リセットで指定位置へ復元");

  for (const target of scene.items.items.filter(item => item.definition.kind !== "quiz")) collect(target);
  const markers = scene.items.items.filter(item => item.definition.kind === "quiz");
  collect(markers[0]); answer(false); finishQuiz(); collect(markers[1]); answer(true);
  scene.answerQuiz(scene.quiz.current.correctIndex);
  near(scene.quiz.answeredCount, 2, "回答の重複を数えない"); near(scene.quiz.correctCount, 1, "正答数の重複を数えない"); finishQuiz();
  const expected = stage.items.reduce((sum, item) => sum + itemPoints(item.kind), 0) + SCORE_RULES.quizIncorrect + SCORE_RULES.quizCorrect;
  near(scene.score.value, expected, "全種類のアイテム・同種2個・正解・誤答を取得点へ反映");
  place(scene.endpoints.goalFlag.x); scene.body.setVelocity(180, -40); scene.update(0, 0);
  assert(scene.playResult.current && document.querySelector("#goal-dialog").open && scene.physics.world.isPaused, "ゴール接触で一度だけ結果を確定");
  assert(document.querySelector("#goal-score").textContent === `取得スコア ${expected} / ${stageTotals(stage.items).maximumScore}点`, "取得点とMAP満点を表示");
  assert(document.querySelector("#goal-quiz").textContent === "クイズ正解数 1 / 3問 · 未回答 1問", "正解数・全マーカー数・未回答数を表示");
  assert(scene.parts.find(part => part.layout.id === "head").image.texture.key === "right/head_happy" &&
    scene.endpoints.sparkles.every(image => image.visible), "喜びの表情ときらめきを表示");
  const goal = frozen(), result = scene.playResult.current;
  key("ArrowLeft", true); key("Space", true); frames(180); scene.update(0, 60000);
  scene.finishGoal(); scene.processContacts();
  game.events.emit(Phaser.Core.Events.BLUR); frames(30); game.events.emit(Phaser.Core.Events.FOCUS);
  assert(frozen() === goal && scene.playResult.current === result && scene.score.value === expected && scene.physics.world.isPaused,
    "ゴール中の物理・能力時間・発光・通知・線・背景・姿勢を停止し、結果を多重確定しない");
  click("close-result"); assert(!document.querySelector("#goal-dialog").open && scene.physics.world.isPaused, "閉じてもゴール状態を保持");
  click("show-result"); assert(document.querySelector("#goal-dialog").open, "同じ確定結果を再表示");
  const cancelGoal = new Event("cancel", { cancelable: true }); document.querySelector("#goal-dialog").dispatchEvent(cancelGoal);
  assert(!document.querySelector("#goal-dialog").open && scene.playResult.current === result, "Escで結果表示だけ閉じる");
  click("retry-dock"); initial(); assert(scene.starting && !document.querySelector("#goal-dialog").open, "再挑戦で全状態を初期化");
  near(scene.children.length, children, "再挑戦で表示を増やさない"); near(scene.physics.world.staticBodies.size, bodies, "再挑戦で物理ボディを増やさない");
  click("start-walk"); place(1400, WORLD.height + PLAYER.height + 10); scene.update(0, 0); initial();
  assert(scene.starting && !document.querySelector("#start-dialog").open, "落下時は短いスタート演出を自動再生");
  game.events.emit(Phaser.Core.Events.BLUR); scene.update(0, 60000);
  near(scene.respawnSeconds, MILESTONE_FEEDBACK.respawnSeconds, "フォーカス停止中はリスポーン演出時間も停止");
  game.events.emit(Phaser.Core.Events.FOCUS); scene.update(0, MILESTONE_FEEDBACK.respawnSeconds * 1000);
  assert(!scene.starting && !scene.physics.world.isPaused, "短い演出の後に自動再開");
  pass("ゴール時の取得点・満点・正答数・未回答数、誤答減点と重複防止、全時間停止、閉じる・Esc・再表示・再挑戦・落下再演出");

  const count = QUIZ_QUESTIONS.length * 2 + 5;
  const overlap = { ...stage, id: "goal-quiz-overlap", items: [
    ...stage.items.filter(item => item.kind !== "quiz"),
    ...Array.from({ length: count }, (_, index) => ({ id: `quiz-${index}`, kind: "quiz", ...stage.goal }))
  ] };
  await restart(overlap);
  for (const target of scene.items.items.filter(item => item.definition.kind !== "quiz")) collect(target);
  place(scene.endpoints.goalFlag.x); scene.update(0, 0);
  const cycle = new Set(); let previous;
  for (let index = 0; index < count; index++) {
    assert(scene.quiz.current && !scene.playResult.current && !document.querySelector("#goal-dialog").open, "同時接触はクイズを先に処理");
    if (index % QUIZ_QUESTIONS.length === 0) cycle.clear();
    const id = scene.quiz.current.id;
    assert(!cycle.has(id) && (QUIZ_QUESTIONS.length === 1 || id !== previous), "2巡以上でも出題方針を維持");
    cycle.add(id); previous = id;
    answer(true); finishQuiz();
  }
  const full = stageTotals(overlap.items).maximumScore;
  assert(full > 1000 && scene.playResult.current?.score === full && scene.score.value === full, "固定上限を超えて全取得・全正解で満点");
  assert(scene.playResult.current.correctCount === count && scene.playResult.current.quizCount === count && scene.playResult.current.unansweredCount === 0,
    "問題プール数ではなく全配置マーカー数分を集計");
  click("retry-walk"); initial(); click("start-walk");
  pass("ゴールと重なる全クイズを1問ずつ優先し、2巡以上の全正解と全取得で1000点超の満点を正しく確定");

  for (const sign of [-1, 1]) {
    const shift = sign * REBASE_DISTANCE * 3;
    const changed = { ...grid, cellWidth: 100, cellHeight: 44, originX: shift + 600 };
    const shifted = { id: `endpoint-rebase-${sign}`, background: stage.background,
      ...parseStageMap(`I.....G\n=======`, changed) };
    await restart(shifted, { autoStart: false }); initial();
    const startShift = scene.endpoints.originX;
    click("start-walk");
    place(WORLD.width / 2 + sign * (REBASE_DISTANCE + 10)); scene.update(0, 0);
    place(WORLD.width / 2 - sign * REBASE_DISTANCE * 2); scene.update(0, 0);
    const position = endpointPosition(shifted.goal);
    near(scene.endpoints.goalFlag.x, position.x - scene.endpoints.originX, "ゴール表示を累積補正へ参加");
    if (Math.abs(scene.endpoints.originX) > 0) {
      place(position.x); assert(!scene.endpoints.touchesGoal(scene.body), "元の座標では誤接触しない");
    }
    place(scene.endpoints.goalFlag.x); scene.update(0, 0);
    assert(scene.playResult.current && scene.playResult.current.score === 0 && scene.playResult.current.maximumScore === 0,
      "補正と接触が同じフレームでも空MAPのゴールを検出");
    near(scene.actor.x - scene.cameras.main.scrollX, WORLD.width / 2, "補正後のゴールでも表示と物理を一致");
    assert(document.querySelector("#goal-score").textContent === "取得スコア 0 / 0点" &&
      document.querySelector("#goal-quiz").textContent === "クイズ正解数 0 / 0問 · 未回答 0問", "空MAPの表示を有限値に保つ");
    click("close-result"); click("reset"); initial(); near(scene.endpoints.originX, startShift, "リセットはスタートを基準に再補正");
    click("start-walk"); place(700, WORLD.height + PLAYER.height + 10); scene.update(0, 0); initial();
    await restart(shifted, { autoStart: false }); initial();
    assert(document.querySelectorAll("#goal-dialog").length === 1 && document.querySelectorAll("#start-dialog").length === 1,
      "再起動でダイアログを重複させない");
    click("start-walk"); step();
    near(scene.physics.world.colliders.getActive().length, 2, "開始・ゴール用Colliderを増やさない");
  }
  pass("マス寸法と原点変更・左右と複数回の補正・補正フレームのゴール・空MAP・リセットと落下と再起動の指定スタート復元");

  const platform = { id: "endpoint-platform", background: stage.background,
    ...parseStageMap(".I....G.\nxxxxxxxx\n........", { ...grid, originX: 600 }) };
  await restart(platform, { autoStart: false }); initial();
  click("start-walk"); frames(30); near(scene.body.bottom, platform.obstacles[0].y, "岩上の指定スタートで着地");
  place(scene.endpoints.goalFlag.x, platform.goal.y + platform.goal.height); scene.update(0, 0);
  assert(scene.playResult.current, "穴の上の岩足場にあるゴールにも接触");
  await restart({ id: "legacy-endpoint-free", background: stage.background });
  near(scene.body.center.x, WORLD.width / 2, "未指定の座標ステージは従来位置");
  assert(!scene.starting && !scene.physics.world.isPaused && !scene.playResult.current, "未指定ステージは即開始して自由歩行");
  assert(stageItems(STAGES.teaRiver).length === STAGES.teaRiver.items.length && DEFAULT_STAGE === STAGES.teaRiver,
    "ユーザー編集済みMAPと通常起動を維持");
  pass("岩足場のスタートとゴール、未指定の文字MAPと座標指定ステージの互換性、再起動時の状態とイベントの復元");
}
