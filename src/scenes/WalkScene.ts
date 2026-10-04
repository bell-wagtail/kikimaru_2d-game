import Phaser from "phaser";
import rig from "../kikimaru-assets/rig-layout.json";
import { bindControls, InputState } from "../input";
import { applyMovement, MovementState, PLAYER, WORLD } from "../movement";
import { backgroundAsset, itemAsset, DEFAULT_STAGE, obstacleAsset, stageItems, milestoneAsset } from "../stages";
import type { StageDefinition } from "../stages";
import { RepeatingScenery } from "../RepeatingScenery";
import { rebaseBody, rebaseShift } from "../scrolling";
import { FixedObstacles } from "../FixedObstacles";
import { validateObstacles } from "../obstacles";
import { StageItems } from "../StageItems";
import { ITEM_TYPES, isPowerUpKind, validateItems } from "../items";
import { PowerUpState } from "../powerUps";
import { ItemFeedback } from "../ItemFeedback";
import { SpeedLines } from "../SpeedLines";
import { GROUND, StageGround } from "../StageGround";
import { canLandOnGround } from "../ground";
import { ScoreState, itemPoints, stageTotals } from "../score";
import { QuizState } from "../quiz";
import { QuizOverlay } from "../QuizOverlay";
import { endpointPosition, validateEndpoint } from "../endpoints";
import { StageEndpoints, MILESTONE_FEEDBACK } from "../stageEndpoints";
import { PlayResultState } from "../playResult";
import { MilestoneOverlay } from "../MilestoneOverlay";
import { preloadAudio, WalkAudio } from "../WalkAudio";
import { AUDIO_CUES } from "../audioDefinition";
import { StageWalls } from "../StageWalls";
import { validateWalls } from "../walls";

const partUrls = import.meta.glob<string>("../kikimaru-assets/assets/character/right/*.png", {
  eager: true, query: "?url", import: "default"
});
type RigPart = (typeof rig.views.right)[number];

export class WalkScene extends Phaser.Scene {
  private controls = new InputState();
  private movementState = new MovementState();
  private powerUps = new PowerUpState();
  private score = new ScoreState(0);
  private quiz = new QuizState();
  private quizOverlay!: QuizOverlay;
  private playResult = new PlayResultState({ maximumScore: 0, quizCount: 0 });
  private milestoneOverlay!: MilestoneOverlay;
  private audio!: WalkAudio;
  private endpoints!: StageEndpoints;
  private starting = false;
  private respawnSeconds = 0;
  private pendingGoal = false;
  private focusPaused = false;
  private body!: Phaser.Physics.Arcade.Body;
  private actor!: Phaser.GameObjects.Container;
  private shadow!: Phaser.GameObjects.Ellipse;
  private parts: { layout: RigPart; image: Phaser.GameObjects.Image }[] = [];
  private facing = 1;
  private phase = 0;
  private clock = 0;
  private actorBob = 0;
  private loadFailed = false;
  private stageDefinition: StageDefinition = DEFAULT_STAGE;
  private scenery!: RepeatingScenery;
  private obstacles!: FixedObstacles;
  private items!: StageItems;
  private feedback!: ItemFeedback;
  private speedLines!: SpeedLines;
  private ground!: StageGround;
  private walls!: StageWalls;
  private previousPlayerX = WORLD.width / 2;
  private status = document.querySelector<HTMLElement>("#state")!;
  private scoreLabel = document.querySelector<HTMLElement>("#score")!;

  constructor() { super("walk"); }

  init(data: { stage?: StageDefinition } = {}): void {
    this.stageDefinition = data.stage ?? DEFAULT_STAGE;
    this.loadFailed = false;
    this.parts = [];
    this.facing = 1;
    this.phase = 0;
    this.clock = 0;
    this.actorBob = 0;
    this.focusPaused = false;
    this.starting = false;
    this.respawnSeconds = 0;
    this.pendingGoal = false;
    this.previousPlayerX = WORLD.width / 2;
    this.controls.clear();
    this.movementState.reset();
    this.powerUps.reset();
    const totals = stageTotals(stageItems(this.stageDefinition));
    this.score = new ScoreState(totals.maximumScore);
    this.playResult = new PlayResultState(totals);
    this.quiz.reset();
  }

  preload(): void {
    const onLoadError = (file: Phaser.Loader.File) => {
      if (file.type === "audio") return;
      this.loadFailed = true;
      document.querySelector<HTMLElement>("#loading")!.textContent = "画像を読み込めませんでした。開発サーバーを起動して再読み込みしてください。";
      this.status.textContent = "画像の読み込みエラー";
    };
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onLoadError);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onLoadError));
    preloadAudio(this);
    const background = backgroundAsset(this.stageDefinition);
    this.load.image(background.key, background.url);
    const obstacles = this.stageDefinition.obstacles ?? [];
    validateObstacles(obstacles);
    for (const name of ["start", "goal"] as const) {
      const endpoint = this.stageDefinition[name];
      if (endpoint) validateEndpoint(endpoint, `${this.stageDefinition.id}の${name}`, WORLD.ground, obstacles, this.stageDefinition.holes ?? []);
    }
    if (this.stageDefinition.start || this.stageDefinition.goal) {
      for (const key of ["props/goal_flag", "right/head_happy", "front/sparkle"]) {
        const asset = milestoneAsset(key);
        this.load.image(asset.key, asset.url);
      }
    }
    for (const kind of new Set(obstacles.map(obstacle => obstacle.kind))) {
      const asset = obstacleAsset(kind);
      this.load.image(asset.key, asset.url);
    }
    const items = stageItems(this.stageDefinition);
    validateItems(items);
    validateWalls(this.stageDefinition.walls, this.stageDefinition.start, this.stageDefinition.goal, items);
    for (const kind of new Set(items.map(item => item.kind))) {
      const asset = itemAsset(kind);
      this.load.image(asset.key, asset.url);
    }
    for (const part of new Set(rig.views.right.map(item => item.part))) {
      this.load.image(part, partUrls[`../kikimaru-assets/assets/character/right/${part}.png`]);
    }
  }

  create(): void {
    if (this.loadFailed) return;
    this.scenery = new RepeatingScenery(this, this.stageDefinition);
    this.ground = new StageGround(this, this.stageDefinition.holes ?? []);
    this.obstacles = new FixedObstacles(this, this.stageDefinition.obstacles ?? []);
    this.walls = new StageWalls(this, this.stageDefinition.walls);
    this.items = new StageItems(this, stageItems(this.stageDefinition));
    this.endpoints = new StageEndpoints(this, this.stageDefinition);
    this.cameras.main.setScroll(0, 0);
    this.feedback = new ItemFeedback(this);
    this.speedLines = new SpeedLines(this);
    this.quizOverlay = new QuizOverlay(index => this.answerQuiz(index), () => this.resumeQuiz());
    this.milestoneOverlay = new MilestoneOverlay(() => this.startWalk(), () => this.resetPlayer());
    this.audio = new WalkAudio(this);
    this.updateScore();
    this.physics.resume();

    this.makeApron();
    this.shadow = this.add.ellipse(WORLD.width / 2, WORLD.ground + 3, 94, 16, 0x58456a, 0.15);
    this.actor = this.add.container(WORLD.width / 2, WORLD.ground).setScale(PLAYER.scale);
    for (const layout of rig.views.right) {
      const image = this.add.image(0, 0, layout.tint ? "apron-colored" : layout.part)
        .setOrigin(layout.pivot[0], layout.pivot[1]).setDisplaySize(layout.w, layout.h).setFlipX(layout.mirror ?? false);
      this.actor.add(image);
      this.parts.push({ layout, image });
    }

    // A separate body keeps arm animation and mirrored artwork out of collision geometry.
    const hitbox = this.add.zone(WORLD.width / 2, WORLD.ground - PLAYER.height / 2, PLAYER.width, PLAYER.height);
    this.physics.add.existing(hitbox);
    this.body = hitbox.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true).setBounce(0);
    this.physics.add.collider(hitbox, this.obstacles.group);
    this.physics.add.collider(hitbox, this.ground.group, undefined, (_player, floor) => {
      const floorBody = (floor as Phaser.Types.Physics.Arcade.GameObjectWithBody).body;
      // A player already below the bank can hit its wall, but cannot be lifted onto its surface.
      floorBody.checkCollision.up = canLandOnGround(this.body.prev.y + this.body.height, this.body.velocity.y, WORLD.ground);
      return true;
    });

    const unbind = bindControls(this.controls, () => this.resetPlayer(),
      () => !this.quiz.current && !this.focusPaused && !this.starting && !this.playResult.current,
      () => !this.quiz.current && !this.focusPaused);
    const suspend = () => {
      this.focusPaused = true;
      this.audio.focus(false);
      this.clearControls();
      if (!this.quiz.current && !this.starting && !this.playResult.current) { this.body.setVelocityX(0); this.speedLines.reset(); }
      this.physics.pause();
    };
    const resume = () => {
      this.focusPaused = false;
      this.audio.focus(true);
      this.clearControls();
      if (!this.quiz.current && !this.starting && !this.playResult.current) this.physics.resume();
    };
    this.game.events.on(Phaser.Core.Events.BLUR, suspend);
    this.game.events.on(Phaser.Core.Events.FOCUS, resume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unbind();
      this.game.events.off(Phaser.Core.Events.BLUR, suspend);
      this.game.events.off(Phaser.Core.Events.FOCUS, resume);
      this.quizOverlay.destroy();
      this.milestoneOverlay.destroy();
      this.audio.destroy();
    });

    document.querySelector<HTMLElement>("#loading")!.hidden = true;
    document.querySelector<HTMLElement>("#reset")!.textContent = this.stageDefinition.start ? "スタートに戻る" : "まんなかに戻る";
    this.resetPlayer("initial");
  }

  private makeApron(): void {
    if (this.textures.exists("apron-colored")) return;
    // Pre-compose only the apron to preserve the original look in both Canvas and WebGL.
    const source = this.textures.get("apron_tint").getSourceImage() as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = rig.defaultApronColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(source, 0, 0);
    this.textures.addCanvas("apron-colored", canvas);
  }

  private resetPlayer(reason: "initial" | "manual" | "fall" = "manual"): void {
    this.clearControls();
    this.movementState.reset();
    this.powerUps.reset();
    this.score.reset();
    this.updateScore();
    this.quiz.reset();
    this.quizOverlay.close();
    this.playResult.reset();
    this.milestoneOverlay.reset();
    this.pendingGoal = false;
    this.starting = !!this.stageDefinition.start;
    this.respawnSeconds = reason === "fall" && this.starting ? MILESTONE_FEEDBACK.respawnSeconds : 0;
    this.feedback.reset();
    this.speedLines.reset();
    this.obstacles.reset();
    this.items.reset();
    this.ground.reset();
    this.endpoints.reset();
    this.walls.reset();
    const start = this.stageDefinition.start ? endpointPosition(this.stageDefinition.start) : { x: WORLD.width / 2, bottom: WORLD.ground };
    this.body.reset(start.x, start.bottom - PLAYER.height / 2);
    this.body.setVelocity(0);
    this.facing = 1;
    this.phase = 0;
    this.clock = 0;
    this.scenery.reset();
    this.rebaseWorld();
    this.previousPlayerX = this.body.center.x;
    this.cameras.main.setScroll(this.body.center.x - WORLD.width / 2, 0);
    for (const { layout, image } of this.parts) {
      if (layout.id === "head") image.setTexture(layout.part).setDisplaySize(layout.w, layout.h);
      this.actor.bringToTop(image);
    }
    this.animate(false, false, 0);
    if (this.starting) {
      this.physics.pause();
      this.endpoints.celebrate(this.actor.x, this.actor.y, this.body.height);
      this.status.textContent = reason === "fall" ? "スタートからもう一度" : "おさんぽのスタート";
      if (!this.respawnSeconds) this.milestoneOverlay.showStart();
    } else {
      this.status.textContent = "ひとやすみ · Spaceでジャンプ";
      if (!this.focusPaused) this.physics.resume();
    }
    this.audio.session.reset(this.starting);
    this.audio.refresh();
  }

  private startWalk(): void {
    if (!this.starting) return;
    this.starting = false;
    this.respawnSeconds = 0;
    this.milestoneOverlay.closeStart();
    this.endpoints.clearCelebration();
    this.clearControls();
    this.status.textContent = "ひとやすみ · Spaceでジャンプ";
    if (!this.focusPaused) this.physics.resume();
    this.audio.session.start(); this.audio.refresh();
    document.querySelector<HTMLElement>("#stage")!.focus({ preventScroll: true });
  }

  private rebaseWorld(): void {
    const shift = rebaseShift(this.body.center.x, WORLD.width / 2);
    if (!shift) return;
    rebaseBody(this.body, this.body.gameObject as Phaser.GameObjects.Zone, shift);
    this.obstacles.rebase(shift);
    this.items.rebase(shift);
    this.ground.rebase(shift);
    this.endpoints.rebase(shift);
    this.walls.rebase(shift);
  }

  private updateScore(): void {
    const label = `${this.score.value}点`;
    if (this.scoreLabel.textContent !== label) this.scoreLabel.textContent = label;
  }

  private clearControls(): void {
    this.controls.clear();
    for (const button of document.querySelectorAll("[data-action]")) button.classList.remove("pressed");
  }

  private beginQuiz(): void {
    const question = this.quiz.begin();
    if (!question) return;
    this.clearControls();
    this.physics.pause();
    this.status.textContent = "クイズに挑戦中";
    this.quizOverlay.show(question);
    this.audio.session.quiz(); this.audio.refresh();
  }

  private answerQuiz(index: number): void {
    const result = this.quiz.answer(index);
    if (!result) return;
    const actualChange = this.score.change(result.points);
    this.updateScore();
    this.quizOverlay.answered(result, actualChange, this.score.value);
    this.audio.session.cue(result.correct ? AUDIO_CUES.correct : AUDIO_CUES.incorrect);
    this.audio.refresh();
  }

  private resumeQuiz(): void {
    if (!this.quiz.finish()) return;
    this.quizOverlay.close();
    this.clearControls();
    if (this.pendingGoal && this.processContacts()) return;
    this.audio.session.resumeWalk(); this.audio.refresh();
    if (!this.focusPaused) this.physics.resume();
    document.querySelector<HTMLElement>("#stage")!.focus({ preventScroll: true });
  }

  update(_time: number, delta: number): void {
    if (this.loadFailed || !this.body || this.focusPaused) return;
    if (this.starting) {
      if (this.respawnSeconds > 0) {
        this.respawnSeconds = Math.max(0, this.respawnSeconds - Math.max(0, delta / 1000));
        if (!this.respawnSeconds) this.startWalk();
      }
      return;
    }
    if (this.quiz.current || this.playResult.current || this.physics.world.isPaused) return;
    if (this.body.top > GROUND.respawnTop) {
      this.resetPlayer("fall");
      return;
    }
    this.scenery.advance(this.body.center.x - this.previousPlayerX);
    this.rebaseWorld();
    this.previousPlayerX = this.body.center.x;
    this.cameras.main.setScroll(this.body.center.x - WORLD.width / 2, 0);
    const dt = Math.min(delta / 1000, 0.05);
    const elapsed = Math.max(0, delta / 1000);
    this.feedback.advance(elapsed);
    const expired = this.powerUps.advance(elapsed);
    if (this.processContacts(expired)) return;
    const contacts = this.obstacles.contacts(this.body);
    const groundContacts = this.ground.contacts(this.body);
    const wallContacts = this.walls.contacts(this.body);
    this.body.blocked.left ||= contacts.left || groundContacts.left || wallContacts.left;
    this.body.blocked.right ||= contacts.right || groundContacts.right || wallContacts.right;
    const movement = applyMovement(this.body, this.controls, this.movementState, dt, this.powerUps);
    if (movement.facing) this.facing = movement.facing;
    const airborne = movement.jumping || !(this.body.blocked.down || this.body.touching.down);
    this.animate(movement.walking, airborne, dt, movement.pace);
    const anchor = { x: this.actor.x, bottom: this.actor.y, width: this.body.width, height: this.body.height };
    this.feedback.update(anchor, this.powerUps, elapsed);
    this.speedLines.update(anchor, this.body.velocity.x, elapsed);
    const directionLabel = this.facing === 1 ? "右へ" : "左へ";
    const motionLabel = airborne ? (movement.dashing ? "ダッシュジャンプ！" : "ジャンプ！")
      : movement.walking ? `${directionLabel}${movement.dashing ? "ダッシュ中" : "おさんぽ中"}`
      : "ひとやすみ · Spaceでジャンプ";
    if (this.status.textContent !== motionLabel) this.status.textContent = motionLabel;
  }

  private processContacts(expired: ReturnType<PowerUpState["advance"]> = []): boolean {
    if (this.playResult.current) return true;
    const acquired = this.items.collect(this.body);
    for (const kind of acquired) {
      if (isPowerUpKind(kind)) this.powerUps.acquire(kind);
      this.score.change(itemPoints(kind));
    }
    this.updateScore();
    const pickups = acquired.filter(kind => ITEM_TYPES[kind].type !== "quiz");
    const ended = expired.filter(kind => !this.powerUps.active(ITEM_TYPES[kind].effect));
    this.feedback.notify(pickups, ended);
    if (pickups.length) this.audio.session.cue(AUDIO_CUES.pickup);
    if (ended.length) this.audio.session.cue(AUDIO_CUES.powerEnd);
    if (pickups.length || ended.length) this.audio.refresh();
    const goalContact = this.endpoints.touchesGoal(this.body);
    const quizContact = acquired.some(kind => ITEM_TYPES[kind].type === "quiz");
    if (!quizContact && !goalContact && !this.pendingGoal) return false;
    this.alignActor();
    const anchor = { x: this.actor.x, bottom: this.actor.y, width: this.body.width, height: this.body.height };
    this.feedback.update(anchor, this.powerUps, 0);
    this.speedLines.update(anchor, this.body.velocity.x, 0);
    if (quizContact) {
      this.pendingGoal ||= goalContact;
      this.beginQuiz();
    } else {
      this.finishGoal();
    }
    return true;
  }

  private finishGoal(): void {
    if (this.playResult.current) return;
    const result = this.playResult.finish(this.score.value, this.quiz.answeredCount, this.quiz.correctCount);
    this.pendingGoal = false;
    this.clearControls();
    this.physics.pause();
    for (const { layout, image } of this.parts) {
      if (layout.id === "head") image.setTexture("right/head_happy").setDisplaySize(layout.w, layout.h);
      if (layout.id.includes("arm")) this.actor.bringToTop(image);
    }
    this.animate(false, false, 0);
    this.endpoints.celebrate(this.actor.x, this.actor.y, this.body.height);
    this.status.textContent = "ゴール！ おつかれさま";
    this.milestoneOverlay.showResult(result);
    this.audio.session.goal(); this.audio.refresh();
  }

  private animate(walking: boolean, airborne: boolean, dt: number, pace = 1): void {
    this.clock += dt;
    this.phase = walking ? this.phase + dt * 12 * pace : 0;
    this.actorBob = airborne ? 0 : walking ? Math.abs(Math.sin(this.phase)) * 6 : Math.sin(this.clock * 2.5) * 2;
    this.alignActor();
    for (const { layout, image } of this.parts) {
      let dx = 0, dy = 0, rotation = 0;
      if (layout.id.includes("foot")) {
        const side = layout.id === "left_foot" ? 1 : -1;
        if (walking) {
          dx = Math.sin(this.phase) * side * 15;
          dy = -Math.max(0, Math.cos(this.phase) * side) * 10;
          rotation = Math.sin(this.phase) * side * 0.13;
        } else if (airborne) { dy = -8; rotation = side * 0.13; }
      }
      if (layout.id.includes("arm")) {
        const side = layout.x < 200 ? 1 : -1;
        rotation = this.playResult.current ? side * 2.2 : airborne ? side * 0.6 : walking ? Math.sin(this.phase) * side * 0.35 : 0;
      }
      image.setPosition(layout.x + layout.w * layout.pivot[0] - 200 + dx,
        layout.y + layout.h * layout.pivot[1] - rig.canvas.groundY + dy).setRotation(rotation);
    }
  }

  private alignActor(): void {
    this.actor.setPosition(this.body.center.x, this.body.bottom - this.actorBob * PLAYER.scale);
    this.actor.setScale(PLAYER.scale * this.facing, PLAYER.scale);
    const height = Math.max(0, WORLD.ground - this.body.bottom);
    this.shadow.setX(this.body.center.x).setScale(1 - Math.min(height / 500, 0.4)).setAlpha(1 - Math.min(height / 250, 0.6));
    this.shadow.setVisible(this.body.bottom <= WORLD.ground && this.ground.hasFloorAt(this.body.center.x));
  }
}
