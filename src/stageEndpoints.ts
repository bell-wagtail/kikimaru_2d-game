import type Phaser from "phaser";
import type { Bounds } from "./obstacles";
import type { StageDefinition } from "./stages";
import { endpointPosition } from "./endpoints";
import { PLAYER } from "./movement";

export const MILESTONE_FEEDBACK = { respawnSeconds: 0.75, flagWidthScale: 3, flagHeightScale: 6, labelGap: 8 } as const;

export class StageEndpoints {
  private originX = 0;
  private readonly startRing?: Phaser.GameObjects.Ellipse;
  private readonly startLabel?: Phaser.GameObjects.Text;
  private readonly goalFlag?: Phaser.GameObjects.Image;
  private readonly goalLabel?: Phaser.GameObjects.Text;
  private readonly sparkles: Phaser.GameObjects.Image[] = [];
  private readonly stage: StageDefinition;

  constructor(scene: Phaser.Scene, stage: StageDefinition) {
    this.stage = stage;
    const textStyle = { fontFamily: '"Yu Gothic UI", "Meiryo", sans-serif', fontSize: "15px",
      fontStyle: "bold", color: "#665270", backgroundColor: "#fffdf2", padding: { x: 10, y: 4 } };
    if (stage.start) {
      this.startRing = scene.add.ellipse(0, 0, stage.start.width * 1.6, 12, 0xe6cb72, 0.75);
      this.startLabel = scene.add.text(0, 0, "START", textStyle).setOrigin(0.5, 1);
    }
    if (stage.goal) {
      const source = scene.textures.get("props/goal_flag").getSourceImage() as HTMLImageElement;
      const scale = Math.min(stage.goal.width * MILESTONE_FEEDBACK.flagWidthScale / source.width,
        stage.goal.height * MILESTONE_FEEDBACK.flagHeightScale / source.height);
      this.goalFlag = scene.add.image(0, 0, "props/goal_flag").setOrigin(0.5, 1)
        .setDisplaySize(source.width * scale, source.height * scale);
      this.goalLabel = scene.add.text(0, 0, "GOAL", textStyle).setOrigin(0.5, 1);
    }
    if (stage.start || stage.goal) {
      for (let index = 0; index < 3; index++) {
        this.sparkles.push(scene.add.image(0, 0, "front/sparkle").setDisplaySize(38, 38).setDepth(3).setVisible(false));
      }
    }
    this.place();
  }

  touchesGoal(player: Bounds): boolean {
    if (!this.goalFlag) return false;
    const flag = this.goalFlag.getBounds();
    return player.left < flag.right && player.right > flag.left && player.top < flag.bottom && player.bottom > flag.top;
  }

  celebrate(x: number, bottom: number, height: number): void {
    this.sparkles.forEach((sparkle, index) => sparkle.setPosition(x + (index - 1) * 78,
      bottom - height * (index === 1 ? 1.15 : 0.65)).setVisible(true));
  }

  clearCelebration(): void { for (const sparkle of this.sparkles) sparkle.setVisible(false); }

  rebase(shift: number): void {
    this.originX += shift;
    for (const sparkle of this.sparkles) sparkle.x -= shift;
    this.place();
  }

  reset(): void { this.originX = 0; this.clearCelebration(); this.place(); }

  private place(): void {
    if (this.stage.start) {
      const { x, bottom } = endpointPosition(this.stage.start);
      this.startRing!.setPosition(x - this.originX, bottom + 2);
      this.startLabel!.setPosition(x - this.originX, bottom + 38);
    }
    if (this.stage.goal) {
      const { x, bottom } = endpointPosition(this.stage.goal);
      this.goalFlag!.setPosition(x - this.originX, bottom);
      this.goalLabel!.setPosition(x - this.originX,
        bottom - Math.max(this.goalFlag!.displayHeight, PLAYER.height) - MILESTONE_FEEDBACK.labelGap);
    }
  }
}
