import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES } from "../src/stages.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";
import { itemPoints, SCORE_RULES } from "../src/score.ts";

export async function verifyTrailStage({ scene, key, step, restart, pass, assert, near }) {
  const stage = STAGES.teaRiverTrail;
  const quizzes = stage.items.filter(item => item.kind === "quiz").sort((a, b) => a.x - b.x);
  const elevated = stage.obstacles.filter(rock => WORLD.ground - rock.y > PLAYER.height);
  const lower = elevated.filter(rock => rock.y === Math.max(...elevated.map(rock => rock.y)));
  const upper = elevated.filter(rock => rock.y === Math.min(...elevated.map(rock => rock.y)));
  const bridge = stage.obstacles.filter(rock => stage.holes.some(hole => rock.x >= hole.x && rock.x < hole.x + hole.width));
  const groundFruit = stage.items.filter(item => ["mandarin", "strawberry"].includes(item.kind) && item.y + item.height === WORLD.ground);
  const bonusItems = stage.items.filter(item => item.y + item.height < WORLD.ground && item.y + item.height <= lower[0].y);
  const answeredIds = [];
  const stop = () => { key("ArrowRight", false); key("Space", false); };
  const answer = () => {
    const question = scene.quiz.current;
    near(scene.body.bottom, WORLD.ground, "クイズは着地した平地で接触");
    near(scene.body.velocity.y, 0, "クイズ接触時に落下していない");
    assert(scene.body.blocked.down, "クイズの前後で地面に着地できる");
    answeredIds.push(question.id);
    document.querySelectorAll("#quiz-dialog [data-choice]")[question.correctIndex].click();
    document.querySelector("#quiz-dialog > button").click();
    assert(!scene.quiz.current && !scene.physics.world.isPaused, "回答して明示的に再開");
  };
  const tick = () => {
    step();
    if (scene.quiz.current) answer();
    assert(scene.body.bottom <= WORLD.ground + 1e-6, "通常ルートと高台の移動で穴へ落下しない");
  };
  const walkTo = x => {
    let reached = false;
    for (let frame = 0; frame < 1600; frame++) {
      key("ArrowRight", true);
      if (scene.body.blocked.down && scene.body.velocity.y >= 0) {
        const holeAhead = stage.holes.some(hole => scene.body.center.x < hole.x && scene.body.right >= hole.x - PLAYER.width / 2);
        if (holeAhead || scene.body.blocked.right) key("Space", true);
      }
      tick(); key("Space", false);
      if (scene.body.center.x >= x) { reached = true; break; }
    }
    stop(); tick();
    assert(reached, "左右移動と地上ジャンプで次の区間へ進める");
  };
  const settle = bottom => {
    stop();
    let landed = false;
    for (let frame = 0; frame < 150; frame++) {
      tick();
      if (scene.body.blocked.down && scene.body.velocity.y === 0) { landed = true; break; }
    }
    assert(landed, "移動入力を離して足場へ着地できる");
    near(scene.body.bottom, bottom, "意図した足場の高さへ着地");
  };
  const jumpTo = (x, bottom, doubleJump) => {
    key("ArrowRight", true); key("Space", true); tick(); key("Space", false);
    assert(scene.body.velocity.y < 0, "前の足場からジャンプ");
    let landed = false, secondJumped = false;
    for (let frame = 0; frame < 180; frame++) {
      if (scene.body.center.x >= x) key("ArrowRight", false);
      if (doubleJump && !secondJumped && scene.body.velocity.y >= 0 && !scene.body.blocked.down) {
        key("Space", true); tick(); key("Space", false);
        assert(scene.movementState.airJumpUsed && scene.body.velocity.y < 0, "えびの追加ジャンプで高台へ届く");
        secondJumped = true;
      }
      tick();
      if (scene.body.blocked.down && scene.body.velocity.y === 0) {
        near(scene.body.bottom, bottom, "次の高台へ着地");
        if (scene.body.center.x >= x) { landed = true; break; }
      }
    }
    stop(); tick();
    assert(landed && (!doubleJump || secondJumped), "高台の中心まで進み、静止できる");
  };
  const item = definition => scene.items.items.find(item => item.definition.id === definition.id);
  const restored = () => {
    near(scene.score.value, SCORE_RULES.initial, "ステージのスコアを初期化");
    assert(scene.items.items.every(item => !item.collected && item.image.visible), "ステージの全アイテムとマーカーを復元");
    assert(!scene.quiz.current && !scene.powerUps.activeItems().length, "クイズと能力を初期化");
  };
  const aligned = () => {
    for (const { definition, image, body } of scene.obstacles.items) {
      near(body.left, definition.x - scene.obstacles.originX, "高台と橋の物理座標");
      near(image.x, body.left, "高台と橋の表示と衝突が一致");
      assert(scene.physics.world.staticTree.search({ minX: body.left, minY: body.top, maxX: body.right, maxY: body.bottom }).includes(body), "高台と橋が補正後の衝突検索へ参加");
    }
    for (const { definition, image } of scene.items.items) {
      near(image.x, definition.x + definition.width / 2 - scene.items.originX, "全種類のアイテムの表示座標");
      near(image.y, definition.y + definition.height, "地上と高台のアイテムの高さ");
    }
  };

  await restart(stage); restored(); aligned();
  const children = scene.children.length, bodies = scene.physics.world.staticBodies.size;
  assert(quizzes.length === 3 && groundFruit.length > 0 && bonusItems.some(item => item.kind === "fish"), "地上の果物・高台のご褒美・3か所のクイズがある");
  assert(elevated.every(rock => rock.y + rock.height <= WORLD.ground - PLAYER.height), "高台の下にはキャラクターが歩ける高さがある");
  walkTo(bridge[0].x + bridge[0].width / 2); settle(bridge[0].y);
  walkTo(quizzes.at(-1).x + quizzes.at(-1).width + PLAYER.width); settle(WORLD.ground);
  assert(groundFruit.every(definition => item(definition).collected), "地上ルートで果物を集められる");
  assert(bonusItems.every(definition => !item(definition).collected), "高台へ登らず地上ルートを通れる");
  assert(quizzes.every(definition => item(definition).collected) && new Set(answeredIds).size === quizzes.length, "序盤・中盤・終盤で異なるクイズに挑戦");
  const collectedPoints = scene.items.items.filter(item => item.collected).reduce((sum, item) => sum + itemPoints(item.definition.kind), 0);
  near(scene.score.value, collectedPoints + quizzes.length * SCORE_RULES.quizCorrect, "通常ルートの得点");
  let reachedGoal = false;
  for (let frame = 0; frame < 300; frame++) {
    key("ArrowRight", true); tick();
    if (scene.playResult.current) { reachedGoal = true; break; }
  }
  stop();
  assert(reachedGoal && scene.playResult.current.correctCount === quizzes.length && scene.playResult.current.unansweredCount === 0,
    "地上ルートの続きでゴールへ歩いて到達し、全クイズの結果を確定");
  near(scene.playResult.current.score, collectedPoints + quizzes.length * SCORE_RULES.quizCorrect, "実際に歩いて到達したゴールの得点");
  pass("寄り道ステージ：開始位置から地上ジャンプだけで穴と低い橋を越え、高台の下を歩き、果物と平地の3問を取得して終盤へ進む");

  document.querySelector("#retry-walk").click(); document.querySelector("#start-walk").click(); tick(); restored();
  const shrimp = stage.items.find(item => item.kind === "shrimp");
  walkTo(shrimp.x + shrimp.width / 2); settle(WORLD.ground);
  assert(scene.powerUps.active("doubleJump"), "高台の手前でえびを取得");
  jumpTo(lower.at(-1).x + lower.at(-1).width / 2, lower[0].y, true);
  jumpTo(upper[0].x + upper[0].width / 2, upper[0].y, false);
  const fish = bonusItems.find(item => item.kind === "fish");
  walkTo(fish.x + fish.width / 2); settle(upper[0].y);
  assert(bonusItems.every(definition => item(definition).collected), "2段ジャンプと高台の歩行で魚といちごを取得");
  walkTo(quizzes[1].x + quizzes[1].width + PLAYER.width); settle(WORLD.ground);
  near(scene.children.length, children, "移動と回答で表示を増やさない");
  near(scene.physics.world.staticBodies.size, bodies, "移動と回答でボディを増やさない");
  pass("寄り道ステージ：えびで下段の高台へ2段ジャンプ、上段へ通常ジャンプ、魚といちごを集めて中盤の平地へ戻れる");

  for (const sign of [-1, 1]) {
    const shift = sign * REBASE_DISTANCE;
    const shifted = { ...stage,
      // This coordinate regression deliberately travels outside the trail; bounded travel is tested separately.
      walls: undefined,
      start: { ...stage.start, x: stage.start.x + shift },
      goal: { ...stage.goal, x: stage.goal.x + shift },
      obstacles: stage.obstacles.map(rock => ({ ...rock, x: rock.x + shift })),
      items: stage.items.map(item => ({ ...item, x: item.x + shift })),
      holes: stage.holes.map(hole => ({ ...hole, x: hole.x + shift })) };
    await restart(shifted);
    const initialShift = scene.items.originX;
    scene.body.reset(WORLD.width / 2 + sign * (REBASE_DISTANCE + 10), WORLD.ground - PLAYER.height / 2);
    scene.previousPlayerX = scene.body.center.x;
    scene.update(0, 0); aligned();
    near(scene.items.originX, initialShift + shift, "開始時の補正に加えて左右の座標補正を適用");
    const mandarin = scene.items.items.find(item => item.definition.kind === "mandarin");
    scene.body.reset(mandarin.image.x, WORLD.ground - PLAYER.height / 2);
    scene.previousPlayerX = scene.body.center.x;
    scene.update(0, 0);
    assert(mandarin.collected, "補正後の表示位置で果物を取得");
    const marker = scene.items.items.find(item => item.definition.kind === "quiz");
    scene.body.reset(marker.image.x, WORLD.ground - PLAYER.height / 2);
    scene.previousPlayerX = scene.body.center.x;
    tick();
    assert(marker.collected, "補正後の表示位置でクイズへ接触");
    document.querySelector("#reset").click(); step(); restored(); aligned();
  }
  await restart(stage); restored(); aligned();
  near(scene.children.length, children, "再起動で表示を重複させない");
  near(scene.physics.world.staticBodies.size, bodies, "再起動でボディを重複させない");
  pass("寄り道ステージ：左右の座標補正後も高台・橋・果物・クイズの表示と判定が一致し、リセットと再起動で復元");
}
