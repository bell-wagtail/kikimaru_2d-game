import Phaser from "phaser";
import { WalkScene } from "./scenes/WalkScene";
import { PLAYER, WORLD } from "./movement";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "stage",
  width: WORLD.width,
  height: WORLD.height,
  backgroundColor: "#dce8d6",
  banner: false,
  audio: { noAudio: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: PLAYER.gravity }, debug: false, fixedStep: true, fps: 60 }
  },
  scene: [WalkScene]
});
