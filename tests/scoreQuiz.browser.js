import Phaser from "phaser";
import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES, STAGE_MAP_GRID } from "../src/stages.ts";
import { parseStageMap } from "../src/stageMap.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";
import { SCORE_RULES } from "../src/score.ts";
import { QUIZ_QUESTIONS } from "../src/quizData.ts";
import { QuizState } from "../src/quiz.ts";
import map from "./fixtures/score-quiz.txt?raw";

export async function verifyScoreQuiz({ scene, game, key, step, restart, pass, assert, near }) {
  const stage = { id: "score-quiz-test", background: STAGES.teaRiver.background,
    ...parseStageMap(map, { ...STAGE_MAP_GRID, originX: 800 }) };
  const frames = count => { for (let i = 0; i < count; i++) step(); };
  const item = kind => scene.items.items.find(item => item.definition.kind === kind);
  const dialog = () => document.querySelector("#quiz-dialog");
  const choices = () => [...dialog().querySelectorAll("[data-choice]")];
  const resume = () => dialog().querySelector(":scope > button");
  const reset = () => { document.querySelector("#reset").click(); step(); };
  const place = (x, bottom = WORLD.ground) => {
    scene.body.reset(x, bottom - PLAYER.height / 2);
    scene.body.blocked.down = bottom === WORLD.ground;
    scene.previousPlayerX = x;
  };
  const collect = kind => {
    place(item(kind).image.x); scene.update(0, 0);
    if (kind === "quiz" && scene.quiz.current && !scene.quiz.result) {
      assert(dialog().querySelector("#quiz-result").hidden && dialog().querySelector("#quiz-fact").textContent === "", "未回答では豆知識を表示せず、前の問題の解説も残さない");
    }
  };
  const score = expected => {
    near(scene.score.value, expected, "スコア値");
    assert(document.querySelector("#score").textContent === `${expected}点`, "スコア表示が現在値と一致");
  };
  const answer = correct => {
    const question = scene.quiz.current;
    const index = correct ? question.correctIndex : (question.correctIndex + 1) % 4;
    choices()[index].click();
    assert(scene.quiz.result.correct === correct, "並べ替え後の正誤判定");
    assert(choices().every(button => button.disabled), "回答後は全選択肢を無効化");
    assert(dialog().querySelector("#quiz-result").textContent.includes(question.choices[question.correctIndex]), "正解を表示");
    assert(!dialog().querySelector("#quiz-result").hidden && dialog().querySelector("#quiz-fact").textContent === `豆知識：${question.explanation}`, "正解・不正解とも現在の問題の豆知識を表示");
    assert(!resume().hidden && scene.physics.world.isPaused, "結果表示中も停止し、明示的な再開を待つ");
  };
  const finish = () => {
    resume().click();
    assert(!dialog().open && !scene.quiz.current && !scene.physics.world.isPaused, "再開ボタンで終了して物理を再開");
    assert(scene.controls.direction === 0 && !scene.controls.consumeJump() && !scene.controls.active("dash"), "再開時に全入力を解除");
  };
  const restored = () => {
    score(SCORE_RULES.initial);
    assert(scene.items.items.every(item => !item.collected && item.image.visible), "魚・果物・クイズ・能力アイテムを復元");
    assert(!scene.quiz.current && !dialog().open, "クイズ状態と画面を解除");
    assert(!scene.powerUps.active("autoDash") && !scene.powerUps.active("doubleJump"), "従来どおり能力を解除");
    near(scene.items.originX, 0, "アイテムの補正量を解除");
  };
  const aligned = () => {
    for (const target of scene.items.items) {
      near(target.image.x, target.definition.x + target.definition.width / 2 - scene.items.originX, "魚・果物・クイズも表示を座標補正");
      assert(target.image.visible === !target.collected && !target.image.body, "取得状態と表示が一致し、物理ボディを追加しない");
      assert(target.image.displayWidth <= target.definition.width && target.image.displayHeight <= target.definition.height, "素材をマスへ収める");
    }
  };

  await restart(stage); restored(); aligned();
  const children = scene.children.length, bodies = scene.physics.world.staticBodies.size;
  collect("tea"); score(10); collect("shrimp"); score(20); collect("fish"); score(70);
  assert(scene.powerUps.active("autoDash") && scene.powerUps.active("doubleJump"), "配点追加後も能力を併用");
  assert(scene.feedback.message.text.includes("魚を取得！"), "能力のない魚の取得通知");
  collect("fish"); score(70);
  assert(!item("fish").image.visible && scene.feedback.glows.length === 2, "魚は一度だけ取得し発光を増やさない");
  collect("quiz"); score(70);
  assert(dialog().open && choices().length === 4 && item("quiz").collected && !item("quiz").image.visible, "マーカー接触で4択を表示して消費");
  answer(true); score(170);
  choices()[scene.quiz.current.correctIndex].click(); scene.answerQuiz(scene.quiz.current.correctIndex); score(170);
  assert(dialog().querySelector("#quiz-result").textContent.includes("+100点"), "正解時の配点を表示");
  frames(120); score(170); finish();
  collect("quiz"); assert(!dialog().open, "同じマーカーでその回は再挑戦しない");
  pass("能力取得10点・魚50点・魚の一度だけ取得、クイズ4択と正解100点、回答後だけ豆知識表示、多重回答防止、明示的な再開とマーカー消費");

  reset(); restored(); collect("mandarin"); score(20); collect("strawberry"); score(50);
  assert(scene.feedback.message.text.includes("みかんを取得！") && scene.feedback.message.text.includes("いちごを取得！"), "果物は種類ごとの取得通知を表示");
  assert(scene.powerUps.activeItems().length === 0 && scene.feedback.glows.every(glow => !glow.image.visible), "果物には能力時間・発光を追加しない");
  for (const kind of ["mandarin", "strawberry"]) {
    collect(kind); score(50);
    assert(item(kind).collected && !item(kind).image.visible, "果物も一度だけ取得して表示を消す");
  }
  reset(); restored(); collect("tea"); collect("shrimp");
  const powerTimes = [scene.powerUps.secondsLeft("autoDash"), scene.powerUps.secondsLeft("doubleJump")];
  collect("mandarin"); collect("strawberry"); score(70);
  near(scene.powerUps.secondsLeft("autoDash"), powerTimes[0], "みかん・いちご取得でお茶の時間を変更しない");
  near(scene.powerUps.secondsLeft("doubleJump"), powerTimes[1], "みかん・いちご取得でえびの時間を変更しない");
  assert(scene.feedback.glows.length === 2, "果物取得で能力の発光を増やさない");
  pass("みかん20点・いちご30点と取得通知、一度だけ取得、能力なし・発光なし、併用中の能力時間を維持");

  reset(); restored(); collect("fish"); collect("quiz"); answer(false); score(20);
  assert(dialog().querySelector("#quiz-result").textContent.includes("-30点"), "不正解の減点を表示"); finish();
  reset(); collect("quiz"); answer(false); score(0);
  assert(dialog().querySelector("#quiz-result").textContent.includes("実際の増減 +0点"), "下限で実際の変化も表示"); finish();
  reset(); scene.score.change(scene.score.maximum - 10); collect("quiz"); answer(true); score(scene.score.maximum);
  assert(dialog().querySelector("#quiz-result").textContent.includes("実際の増減 +10点"), "上限で実際の変化も表示"); finish();
  collect("fish"); score(scene.score.maximum);
  collect("mandarin"); collect("strawberry"); score(scene.score.maximum);
  pass("不正解30点減点と豆知識、下限とMAP満点上限での結果表示、再出題で前の解説を消去、全リセットで初期点と再挑戦");

  reset(); collect("tea"); collect("shrimp");
  key("ArrowRight", true); key("ShiftLeft", true); scene.update(0, 0);
  place(item("quiz").image.x, WORLD.ground - 10);
  scene.body.setVelocity(PLAYER.speed * PLAYER.dashMultiplier, -210);
  scene.movementState.airJumpUsed = true;
  scene.update(0, 0);
  assert(dialog().open && scene.physics.world.isPaused && resume().hidden, "空中で接触して停止、未回答では再開を表示しない");
  near(scene.actor.x, scene.body.center.x, "接触フレームにも表示と物理を合わせる");
  const frozen = () => JSON.stringify({ x: scene.body.center.x, y: scene.body.bottom, vx: scene.body.velocity.x, vy: scene.body.velocity.y,
    speed: scene.movementState.speed, airJump: scene.movementState.airJumpUsed, actor: [scene.actor.x, scene.actor.y, scene.clock, scene.phase],
    powers: [scene.powerUps.secondsLeft("autoDash"), scene.powerUps.secondsLeft("doubleJump")],
    glows: scene.feedback.glows.map(glow => [glow.phase, glow.image.alpha, glow.image.x, glow.image.y]),
    notices: [...scene.feedback.notices.notices.entries()], speedLines: [scene.speedLines.phase, scene.speedLines.graphics.visible],
    scroll: [scene.scenery.background.tilePositionX, scene.scenery.ground.tilePositionX, scene.cameras.main.scrollX] });
  const before = frozen();
  const cancel = new Event("cancel", { cancelable: true });
  dialog().dispatchEvent(cancel); assert(cancel.defaultPrevented && dialog().open, "Esc相当のキャンセルを拒否");
  resume().click(); document.querySelector("#reset").click();
  key("ArrowLeft", true); key("Space", true); document.querySelector("[data-action=jump]").click();
  frames(240); scene.update(0, 60000);
  assert(scene.controls.direction === 0 && !scene.controls.consumeJump(), "クイズ中はゲーム入力を受け付けない");
  assert(frozen() === before && dialog().open, "能力・通知・明滅・線・背景・物理・姿勢がすべて停止");
  game.events.emit(Phaser.Core.Events.BLUR); frames(120); game.events.emit(Phaser.Core.Events.FOCUS); frames(120);
  assert(scene.physics.world.isPaused && frozen() === before, "フォーカス復帰でもクイズを解除せず速度と演出を保持");
  answer(true); finish();
  assert(frozen() === before, "回答後の再開時にも空中の位置・速度・能力時間を保持");
  key("ArrowRight", false); key("ArrowLeft", false); key("ShiftLeft", false); key("Space", false);
  step(); assert(scene.body.bottom !== JSON.parse(before).y, "再開後の物理更新で空中移動を継続");
  assert(scene.powerUps.secondsLeft("autoDash") < JSON.parse(before).powers[0], "再開後から能力時間を進める");
  pass("空中クイズ中の物理・能力・発光・通知・背景・アニメ停止、未回答の閉鎖拒否、入力解除、フォーカス復帰と速度保持での再開");

  reset(); collect("fish"); collect("mandarin"); collect("strawberry"); collect("quiz"); answer(true); score(200); finish();
  const hole = stage.holes[0]; place(hole.x + hole.width / 2, WORLD.ground + 5);
  let respawned = false;
  for (let i = 0; i < 150; i++) { step(); if (scene.body.center.x === WORLD.width / 2) { respawned = true; break; } }
  assert(respawned, "魚・果物・回答済みクイズを持つ状態から穴へ落ちてリスポーン"); restored();
  collect("mandarin"); collect("strawberry"); collect("quiz"); answer(false); score(20); finish();
  near(scene.children.length, children, "リスポーン・再挑戦でも表示を増やさない");
  near(scene.physics.world.staticBodies.size, bodies, "新アイテムとクイズで物理ボディを増やさない");
  pass("落下リスポーンでスコア0・魚と果物とクイズを復元して再取得と再挑戦、表示と物理ボディ数を維持");

  for (const sign of [-1, 1]) {
    await restart({ ...stage, ...parseStageMap(map, { ...STAGE_MAP_GRID, originX: 800 + sign * REBASE_DISTANCE }) });
    const fish = item("fish"), marker = item("quiz"), fruits = [item("mandarin"), item("strawberry")];
    place(WORLD.width / 2 + sign * (REBASE_DISTANCE + 10)); scene.update(0, 0); aligned();
    near(scene.items.originX, sign * REBASE_DISTANCE, "魚とクイズも左右の補正へ参加");
    assert(!fish.collected && !marker.collected && fruits.every(fruit => !fruit.collected), "補正境界で誤接触しない");
    place(fish.image.x + sign * REBASE_DISTANCE); scene.update(0, 0); aligned();
    assert(!fish.collected && !marker.collected, "補正前の座標では誤接触しない");
    for (const fruit of fruits) {
      place(fruit.image.x + sign * REBASE_DISTANCE); scene.update(0, 0); aligned();
      assert(!fruit.collected, "果物も補正前の座標では誤取得しない");
    }
    collect("fish"); score(50);
    collect("mandarin"); score(70); collect("strawberry"); score(100);
    place(WORLD.width / 2 - sign * REBASE_DISTANCE * 3); scene.update(0, 0); aligned();
    collect("quiz"); assert(dialog().open && marker.collected, "複数補正後に表示位置でクイズ接触");
    near(scene.actor.x - scene.cameras.main.scrollX, WORLD.width / 2, "補正と接触が同フレームでもキャラクター表示が一致");
    answer(true); score(200); finish(); aligned();
    reset(); restored(); aligned();
  }
  pass("左右・複数回の座標補正後の魚と果物取得・クイズ接触と再訪、元の座標で誤接触せず、補正後の復元");

  await restart({ ...stage, ...parseStageMap(map, { ...STAGE_MAP_GRID, originX: 800, cellWidth: 80, cellHeight: 40 }) });
  aligned(); collect("fish"); collect("mandarin"); collect("strawberry"); score(100); collect("quiz");
  await restart(stage); restored();
  assert(document.querySelectorAll("#quiz-dialog").length === 1, "未回答の再起動でもダイアログとイベントを重複させない");
  near(scene.children.length, children, "再起動でPhaser表示が重複しない");
  near(scene.physics.world.colliders.getActive().length, 2, "クイズ用Colliderを追加しない");
  const overlap = { ...stage, items: Array.from({ length: QUIZ_QUESTIONS.length * 2 + 1 }, (_, index) => (
    { ...stage.items.find(item => item.kind === "quiz"), id: `quiz-${index}` }
  )) };
  await restart(overlap);
  scene.quiz = new QuizState(QUIZ_QUESTIONS, () => 0);
  const cycleIds = new Set();
  let previousId;
  for (let index = 0; index < overlap.items.length; index++) {
    collect("quiz");
    assert(dialog().open && scene.items.items.filter(item => item.collected).length === index + 1, "重なるマーカーも1問ずつ消費");
    if (index % QUIZ_QUESTIONS.length === 0) cycleIds.clear();
    const id = scene.quiz.current.id;
    assert(!cycleIds.has(id), "一巡の途中で同じ問題を繰り返さない");
    if (QUIZ_QUESTIONS.length > 1) assert(id !== previousId, "一巡の境目でも同じ問題が連続しない");
    cycleIds.add(id); previousId = id;
    if (cycleIds.size === QUIZ_QUESTIONS.length) {
      assert(QUIZ_QUESTIONS.every(question => cycleIds.has(question.id)), "全問を出題してから新しい一巡を始める");
    }
    answer(true); finish();
  }
  score(overlap.items.length * SCORE_RULES.quizCorrect);
  pass("マス寸法変更・未回答での再起動・ダイアログ重複防止、問題数より多い重なるマーカーで2巡以上を重複なく出題");

  const firstId = QUIZ_QUESTIONS[0].id;
  const firstQuestion = () => {
    collect("quiz");
    assert(scene.quiz.current.id === firstId, "ステージのリセットで出題履歴も初期化");
    answer(true); finish();
  };
  reset(); restored(); firstQuestion();
  place(hole.x + hole.width / 2, WORLD.ground + 5);
  respawned = false;
  for (let index = 0; index < 150; index++) {
    step();
    if (scene.body.center.x === WORLD.width / 2) { respawned = true; break; }
  }
  assert(respawned, "出題履歴を持った状態から落下リスポーン");
  restored(); firstQuestion();
  await restart(overlap); restored(); firstQuestion();
  await restart(stage); restored(); firstQuestion();
  pass("手動リセット・落下リスポーン・再起動・別ステージ開始で出題履歴を初期化");
}
