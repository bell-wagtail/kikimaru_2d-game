import Phaser from "phaser";
import rig from "../kikimaru-assets/rig-layout.json";
import { bindControls, InputState } from "../input";
import { applyMovement, PLAYER, WORLD } from "../movement";

const partUrls = import.meta.glob<string>("../kikimaru-assets/assets/character/right/*.png", {
  eager: true, query: "?url", import: "default"
});
const backgroundUrl = new URL("../kikimaru-assets/assets/backgrounds/tea_river.png", import.meta.url).href;
type RigPart = (typeof rig.views.right)[number];

export class WalkScene extends Phaser.Scene {
  private controls = new InputState();
  private body!: Phaser.Physics.Arcade.Body;
  private actor!: Phaser.GameObjects.Container;
  private shadow!: Phaser.GameObjects.Ellipse;
  private parts: { layout: RigPart; image: Phaser.GameObjects.Image }[] = [];
  private facing = 1;
  private phase = 0;
  private clock = 0;
  private loadFailed = false;
  private status = document.querySelector<HTMLElement>("#state")!;

  constructor() { super("walk"); }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
      this.loadFailed = true;
      document.querySelector<HTMLElement>("#loading")!.textContent = "画像を読み込めませんでした。開発サーバーを起動して再読み込みしてください。";
      this.status.textContent = "画像の読み込みエラー";
    });
    this.load.image("background", backgroundUrl);
    for (const part of new Set(rig.views.right.map(item => item.part))) {
      this.load.image(part, partUrls[`../kikimaru-assets/assets/character/right/${part}.png`]);
    }
  }

  create(): void {
    if (this.loadFailed) return;
    const background = this.add.image(WORLD.width / 2, WORLD.height / 2, "background");
    background.setScale(Math.max(WORLD.width / background.width, WORLD.height / background.height));
    this.add.rectangle(0, 0, WORLD.width, WORLD.height, 0xf9f7e7, 0.1).setOrigin(0);
    this.add.rectangle(0, WORLD.ground - 3, WORLD.width, 10, 0xc1cc97).setOrigin(0);
    this.add.rectangle(0, WORLD.ground + 7, WORLD.width, WORLD.height - WORLD.ground, 0xe8d9b8).setOrigin(0);
    const marks = this.add.graphics().fillStyle(0xd5c29e);
    for (let x = 20; x < WORLD.width; x += 63) marks.fillRect(x, WORLD.ground + 33 + (x % 5) * 8, 9, 2);

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
    const inset = WORLD.margin - PLAYER.width / 2;
    this.physics.world.setBounds(inset, 0, WORLD.width - inset * 2, WORLD.ground);

    const unbind = bindControls(this.controls, () => this.resetPlayer());
    const suspend = () => { this.controls.clear(); this.body.setVelocityX(0); this.physics.pause(); };
    const resume = () => { this.controls.clear(); this.physics.resume(); };
    this.game.events.on(Phaser.Core.Events.BLUR, suspend);
    this.game.events.on(Phaser.Core.Events.FOCUS, resume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unbind();
      this.game.events.off(Phaser.Core.Events.BLUR, suspend);
      this.game.events.off(Phaser.Core.Events.FOCUS, resume);
    });

    document.querySelector<HTMLElement>("#loading")!.hidden = true;
    this.status.textContent = "ひとやすみ · Spaceでジャンプ";
    this.animate(false, false, 0);
  }

  private makeApron(): void {
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

  private resetPlayer(): void {
    this.controls.clear();
    this.body.reset(WORLD.width / 2, WORLD.ground - PLAYER.height / 2);
    this.body.setVelocity(0);
    this.facing = 1;
    this.phase = 0;
    this.clock = 0;
  }

  update(_time: number, delta: number): void {
    if (!this.body || this.physics.world.isPaused) return;
    const movement = applyMovement(this.body, this.controls);
    if (movement.facing) this.facing = movement.facing;
    const airborne = movement.jumping || !(this.body.blocked.down || this.body.touching.down);
    this.animate(movement.walking, airborne, Math.min(delta / 1000, 0.05));
    const label = airborne ? "ジャンプ！" : movement.walking ? (this.facing === 1 ? "右へおさんぽ中" : "左へおさんぽ中") : "ひとやすみ · Spaceでジャンプ";
    if (this.status.textContent !== label) this.status.textContent = label;
  }

  private animate(walking: boolean, airborne: boolean, dt: number): void {
    this.clock += dt;
    this.phase = walking ? this.phase + dt * 12 : 0;
    const bob = airborne ? 0 : walking ? Math.abs(Math.sin(this.phase)) * 6 : Math.sin(this.clock * 2.5) * 2;
    this.actor.setPosition(this.body.center.x, this.body.bottom - bob * PLAYER.scale);
    this.actor.setScale(PLAYER.scale * this.facing, PLAYER.scale);
    const height = Math.max(0, WORLD.ground - this.body.bottom);
    this.shadow.setX(this.body.center.x).setScale(1 - Math.min(height / 500, 0.4)).setAlpha(1 - Math.min(height / 250, 0.6));
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
        rotation = airborne ? side * 0.6 : walking ? Math.sin(this.phase) * side * 0.35 : 0;
      }
      image.setPosition(layout.x + layout.w * layout.pivot[0] - 200 + dx,
        layout.y + layout.h * layout.pivot[1] - rig.canvas.groundY + dy).setRotation(rotation);
    }
  }
}
