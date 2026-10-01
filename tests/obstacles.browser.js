import { PLAYER, WORLD } from "../src/movement.ts";
import { STAGES } from "../src/stages.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";

export async function verifyObstacles({ scene, key, step, restart, pass, assert, near }) {
  const frames = count => { for (let i = 0; i < count; i++) step(); };
  const maxSpeed = PLAYER.speed * PLAYER.dashMultiplier;
  const collisionStage = {
    id: "collision-test", background: STAGES.teaRiver.background,
    obstacles: [
      { id: "left-rock", kind: "rock", x: 120, y: WORLD.ground - 36, width: 60, height: 36 },
      { id: "right-rock", kind: "rock", x: 1020, y: WORLD.ground - 36, width: 60, height: 36 }
    ], decorations: []
  };
  const gain = (maxSpeed - PLAYER.speed) / PLAYER.accelerationSeconds;
  const speeds = [0, PLAYER.accelerationSeconds / 2, PLAYER.accelerationSeconds];
  const reset = () => { document.querySelector("#reset").click(); step(); };
  const place = (x, bottom = WORLD.ground) => {
    scene.body.reset(x, bottom - PLAYER.height / 2);
    scene.body.blocked.down = bottom === WORLD.ground;
    scene.previousPlayerX = x;
  };
  const launch = (sign, runUp, x) => {
    reset();
    key(sign > 0 ? "ArrowRight" : "ArrowLeft", true);
    if (runUp) key("ShiftLeft", true);
    frames(runUp * 60);
    scene.update(0, 0);
    const speed = PLAYER.speed + gain * runUp;
    near(Math.abs(scene.body.velocity.x), speed, "実際の助走速度");
    place(x);
    key("Space", true); scene.update(0, 0); key("Space", false);
    near(Math.abs(scene.body.velocity.x), speed, "障害物ジャンプの踏切速度");
    near(scene.body.velocity.y, -PLAYER.jumpSpeed, "障害物ジャンプの初速");
    key("ShiftLeft", runUp === 0);
    return speed;
  };
  const aligned = () => {
    for (const { definition, image, body } of scene.obstacles.items) {
      near(image.x, definition.x - scene.obstacles.originX, "表示とステージ座標");
      near(body.left, image.x, "表示と物理X"); near(body.top, image.y, "表示と物理Y");
      near(body.width, definition.width, "物理幅"); near(body.height, definition.height, "物理高さ");
      assert(scene.physics.world.staticTree.search({ minX: body.left, minY: body.top, maxX: body.right, maxY: body.bottom }).includes(body), "衝突検索の位置が古い");
    }
  };
  await restart(collisionStage);
  const count = scene.children.length;
  const staticCount = scene.physics.world.staticBodies.size;
  near(staticCount, collisionStage.obstacles.length + 1, "岩と床の固定ボディ数");
  aligned();
  const rock = collisionStage.obstacles[1];
  for (const sign of [-1, 1]) for (const runUp of speeds) {
    const code = sign > 0 ? "ArrowRight" : "ArrowLeft";
    const label = runUp === 0 ? "徒歩" : runUp === PLAYER.accelerationSeconds ? "最高速度" : "加速途中";
    const wall = sign > 0 ? rock.x - PLAYER.width / 2 : rock.x + rock.width + PLAYER.width / 2;
    reset();
    const distance = runUp ? PLAYER.speed * runUp + gain * runUp * runUp / 2 : 80;
    place(wall - sign * distance);
    key(code, true);
    if (runUp) key("ShiftLeft", true);
    let incoming = 0;
    for (let i = 0; i < 120; i++) {
      incoming = Math.abs(scene.body.velocity.x);
      step();
      if (scene.body.blocked[sign > 0 ? "right" : "left"]) break;
    }
    assert(scene.body.blocked[sign > 0 ? "right" : "left"], "側面で停止");
    if (runUp === 0) near(incoming, PLAYER.speed, "徒歩衝突");
    else if (runUp < PLAYER.accelerationSeconds) assert(incoming > PLAYER.speed && incoming < maxSpeed, "加速途中の衝突");
    else near(incoming, maxSpeed, "最高速度の衝突");
    near(scene.body.center.x, wall, "側面の接触位置");
    frames(120);
    near(scene.body.center.x, wall, "押し続けても岩にめり込まない");
    near(scene.body.velocity.x, 0, "壁際で停止を維持");
    near(scene.movementState.speed, PLAYER.speed, "壁で助走リセット");
    key(code, false); key(sign > 0 ? "ArrowLeft" : "ArrowRight", true); step();
    assert(sign * scene.body.velocity.x < 0, "壁から逆方向へ離れられる");

    const topLaunch = wall - sign * 12;
    const speed = launch(sign, runUp, topLaunch);
    let over = false, landed = false;
    for (let i = 0; i < 100; i++) {
      step();
      if (!over && scene.body.bottom < rock.y && scene.body.center.x > rock.x && scene.body.center.x < rock.x + rock.width) {
        near(Math.abs(scene.body.velocity.x), speed, "空中で踏切速度を維持");
        key(code, false); step(); over = true;
      }
      if (over && scene.body.blocked.down) { landed = true; break; }
    }
    assert(landed, "岩の上へ着地"); near(scene.body.bottom, rock.y, "岩上面の着地位置");
    frames(90); near(scene.body.bottom, rock.y, "岩上で静止");
    key("Space", true); step(); key("Space", false);
    assert(scene.body.velocity.y < 0, "岩上から再ジャンプ");
    frames(90); near(scene.body.bottom, rock.y, "岩上へ再着地");
    key(code, true);
    for (let i = 0; i < 100 && scene.body.bottom < WORLD.ground; i++) step();
    near(scene.body.bottom, WORLD.ground, "岩から歩いて降りる");

    // At this launch distance, even walking clears both the near and far edges of the low rock.
    const crossSpeed = launch(sign, runUp, wall - sign * crossDistance(runUp));
    let crossed = false;
    for (let i = 0; i < 120; i++) {
      step();
      assert(!scene.body.blocked.left && !scene.body.blocked.right, "飛び越え中の側面衝突");
      assert(!(scene.body.blocked.down && Math.abs(scene.body.bottom - rock.y) < 1e-6), "飛び越え中に岩上へ着地");
      if (!scene.body.blocked.down) near(Math.abs(scene.body.velocity.x), crossSpeed, "飛び越え中の速度保持");
      if (scene.body.blocked.down) {
        crossed = sign > 0 ? scene.body.left > rock.x + rock.width : scene.body.right < rock.x;
        break;
      }
    }
    assert(crossed, "岩を飛び越えて地面に着地");
    pass(`${sign > 0 ? "左側から右へ" : "右側から左へ"}・${label}：側面停止、岩上着地・静止・再ジャンプ・歩いて降りる、飛び越え`);
  }

  // Jumping while pressed against a wall must eventually permit horizontal movement above its top.
  reset(); place(rock.x - PLAYER.width / 2);
  key("ArrowRight", true); frames(10);
  key("Space", true); step(); key("Space", false); frames(70);
  assert(scene.body.center.x > rock.x, "壁際からジャンプして岩に乗り越える");
  pass("壁際からのジャンプで上方へ抜けられる");

  const launchSpeed = launch(1, PLAYER.accelerationSeconds, WORLD.width / 2);
  frames(5); key("ArrowRight", false); step();
  near(scene.body.velocity.x, 0, "空中の左右入力解除で停止");
  key("ArrowLeft", true); step(); near(scene.body.velocity.x, -launchSpeed, "空中で逆方向へ踏切速度を維持");
  key("ArrowLeft", false); key("ArrowRight", true); step();
  near(scene.body.velocity.x, launchSpeed, "空中で再び右へ方向転換");
  pass("空中の停止・左右方向転換でも踏切速度を保持");

  for (const sign of [-1, 1]) {
    const center = WORLD.width / 2 + sign * REBASE_DISTANCE;
    const edgeRock = { id: "rebase-rock", kind: "rock", x: center - 30, y: WORLD.ground - 36, width: 60, height: 36 };
    await restart({ ...collisionStage, obstacles: [edgeRock, { ...edgeRock, id: "distant-rock", x: -sign * 40000, width: 96, height: 72, y: WORLD.ground - 72 }] });
    const code = sign > 0 ? "ArrowRight" : "ArrowLeft";
    const wall = sign > 0 ? edgeRock.x - PLAYER.width / 2 : edgeRock.x + edgeRock.width + PLAYER.width / 2;
    launch(sign, PLAYER.accelerationSeconds, wall - sign * crossDistance(PLAYER.accelerationSeconds));
    let rebased = false, onTop = false;
    for (let i = 0; i < 100; i++) {
      const before = scene.body.center.x + scene.obstacles.originX;
      const velocity = scene.body.velocity.x;
      step(); aligned();
      if (scene.obstacles.originX !== 0 && !rebased) {
        rebased = true; key(code, false);
        near(scene.body.center.x + scene.obstacles.originX, before + velocity / 60, "座標補正でステージ位置が飛ばない");
      }
      if (rebased && scene.body.blocked.down) { onTop = Math.abs(scene.body.bottom - edgeRock.y) < 1e-6; break; }
    }
    assert(rebased && onTop, "空中で座標補正を跨いで岩上へ着地");
    near(scene.obstacles.originX, sign * REBASE_DISTANCE, "座標補正量");
    const localRock = scene.obstacles.items[0].body;
    place(sign > 0 ? localRock.left - PLAYER.width / 2 - 20 : localRock.right + PLAYER.width / 2 + 20);
    key(code, true); frames(30);
    near(scene.body.velocity.x, 0, "補正後の側面停止");
    aligned();
    // Cross a second origin shift and return to the same fixed obstacle.
    key(code, false);
    place(WORLD.width / 2 + sign * (REBASE_DISTANCE + 20)); step(); aligned();
    near(scene.obstacles.originX, sign * REBASE_DISTANCE * 2, "複数回の座標補正");
    const origin = scene.obstacles.originX;
    place(wall - origin - sign * 20); key(code, true); frames(30);
    near(scene.body.center.x + scene.obstacles.originX, wall, "戻った岩のステージ位置");
    near(scene.body.velocity.x, 0, "複数補正後の衝突");
    reset(); aligned(); near(scene.obstacles.originX, 0, "補正後のリセット");
    near(scene.body.center.x, WORLD.width / 2, "補正後のプレイヤーリセット");
    near(scene.scenery.background.tilePositionX, 0, "補正後の背景リセット");
    pass(`${sign > 0 ? "右" : "左"}方向：空中の座標補正→岩上着地、補正後の側面衝突、複数補正・再訪・リセット`);
  }

  await restart(collisionStage);
  reset(); aligned();
  assert(scene.children.length === count && scene.physics.world.staticBodies.size === staticCount, "再起動で岩やボディが重複");
  near(scene.physics.world.colliders.getActive().length, 2, "再起動でColliderが重複");
  launch(1, PLAYER.accelerationSeconds, rock.x - PLAYER.width / 2 - crossDistance(PLAYER.accelerationSeconds));
  frames(12); reset(); aligned();
  near(scene.body.velocity.x, 0, "空中リセットの速度");
  near(scene.body.center.x, WORLD.width / 2, "空中リセットの位置");
  key("ArrowRight", true); step(); near(scene.body.velocity.x, PLAYER.speed, "空中リセット後の助走");
  reset();
  place(rock.x + rock.width / 2, rock.y); frames(2); reset(); aligned();
  near(scene.body.bottom, WORLD.ground, "岩上リセット");
  pass("ステージ変更で種類・配置・寸法を反映、再起動で重複なし、空中・岩上のリセット");
}

function crossDistance(runUp) {
  return (PLAYER.speed + (PLAYER.speed * PLAYER.dashMultiplier - PLAYER.speed) * runUp / PLAYER.accelerationSeconds) * 0.095;
}
