import Phaser from "phaser";
import { AUDIO_DEFAULTS, AUDIO_TRACKS } from "./audioDefinition";
import type { AudioCue, AudioTrack } from "./audioDefinition";
import { AudioSession } from "./audioSession";
import type { AudioPort, AudioPreferences } from "./audioSession";
import { AudioControls } from "./AudioControls";

const urls = import.meta.glob<string>("./audio-assets/*.wav", { eager: true, query: "?url", import: "default" });
const key = (track: AudioTrack) => `walk-audio-${track}`;
const preferences: AudioPreferences = { ...AUDIO_DEFAULTS };
let gestureSeen = false;

export function preloadAudio(scene: Phaser.Scene): void {
  for (const [track, definition] of Object.entries(AUDIO_TRACKS)) {
    if (!scene.cache.audio.exists(key(track as AudioTrack))) scene.load.audio(key(track as AudioTrack), urls[`./audio-assets/${definition.filename}`]);
  }
}

class PhaserAudioBank implements AudioPort {
  readonly sounds = new Map<AudioTrack, Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound>();
  readonly supported: boolean;
  failed = false;

  constructor(readonly manager: Phaser.Sound.BaseSoundManager, scene: Phaser.Scene) {
    this.supported = !(manager instanceof Phaser.Sound.NoAudioSoundManager);
    manager.pauseOnBlur = false;
    if (!this.supported) return;
    for (const track of Object.keys(AUDIO_TRACKS) as AudioTrack[]) {
      if (!scene.cache.audio.exists(key(track))) continue;
      try { this.sounds.set(track, scene.sound.add(key(track)) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound); }
      catch { this.failed = true; }
    }
  }

  private attempt(action: () => void): void { try { action(); } catch { this.failed = true; } }
  playLoop(resume: boolean, volume: number): boolean {
    const sound = this.sounds.get("walk"); if (!sound) return false;
    let success = false;
    this.attempt(() => {
      success = resume && sound.isPaused ? sound.resume() : sound.play({ loop: true, volume });
      sound.setVolume(volume);
    });
    return success;
  }
  pauseLoop(): void { this.attempt(() => { this.sounds.get("walk")?.pause(); }); }
  stopLoop(): void { this.attempt(() => { this.sounds.get("walk")?.stop(); }); }
  playCue(cue: AudioCue, volume: number): void {
    this.attempt(() => { const sound = this.sounds.get(cue); if (sound) { sound.stop(); sound.play({ volume }); } });
  }
  stopCues(): void { this.attempt(() => { for (const [track, sound] of this.sounds) if (track !== "walk") sound.stop(); }); }
  volumes(bgm: number, effects: number): void {
    this.attempt(() => { for (const [track, sound] of this.sounds) sound.setVolume(track === "walk" ? bgm : effects * AUDIO_TRACKS[track].gain); });
  }
  destroy(): void { for (const sound of this.sounds.values()) this.attempt(() => sound.destroy()); this.sounds.clear(); }
}

export class WalkAudio {
  readonly session: AudioSession;
  private readonly bank: PhaserAudioBank;
  private readonly controls: AudioControls;
  private readonly controller = new AbortController();
  private focused = true;
  private destroyed = false;
  private blocked = false;
  private readonly context?: AudioContext;
  private readonly onUnlocked = () => {
    if (this.destroyed || !gestureSeen) return;
    this.session.setUnlocked(!this.context || this.context.state === "running"); this.refresh();
  };

  constructor(scene: Phaser.Scene) {
    this.bank = new PhaserAudioBank(scene.sound, scene);
    this.session = new AudioSession(this.bank, preferences);
    this.controls = new AudioControls(this.session, () => this.refresh());
    this.bank.manager.on(Phaser.Sound.Events.UNLOCKED, this.onUnlocked);
    const options = { signal: this.controller.signal };
    if (scene.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      this.context = scene.sound.context;
      this.context.addEventListener("statechange", () => {
        if (this.destroyed) return;
        const running = this.context!.state === "running" && gestureSeen;
        this.session.setUnlocked(running); this.refresh();
      }, options);
    }
    const gesture = (event: Event) => {
      if (!event.isTrusted || document.hidden) return;
      if (event.type !== "click" && event.target instanceof Element && event.target.closest(".audio-mute")) return;
      gestureSeen = true; this.unlock();
    };
    document.addEventListener("pointerdown", gesture, { ...options, capture: true });
    document.addEventListener("keydown", gesture, { ...options, capture: true });
    document.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest(".audio-mute")) gesture(event);
    }, options);
    document.addEventListener("visibilitychange", () => this.focus(this.focused), options);
    this.focus(true);
    if (gestureSeen) this.unlock();
    this.refresh();
  }

  private unlock(): void {
    if (this.destroyed || !this.bank.supported) return;
    if (this.context) {
      try {
        void this.context.resume().then(() => {
          if (this.destroyed) return;
          this.blocked = this.context!.state !== "running";
          this.session.setUnlocked(!this.blocked); this.refresh();
        }).catch(() => { if (!this.destroyed) { this.blocked = true; this.session.setUnlocked(false); this.refresh(); } });
      } catch { this.blocked = true; this.refresh(); }
    } else {
      this.session.setUnlocked(!(this.bank.manager as Phaser.Sound.HTML5AudioSoundManager).locked); this.refresh();
    }
  }

  focus(value: boolean): void {
    this.focused = value; this.session.setFocused(value && !document.hidden);
    if (value && !document.hidden && gestureSeen && this.context?.state !== "running") this.unlock();
    this.refresh();
  }

  refresh(): void {
    const message = !this.bank.supported || !this.bank.sounds.size ? "音声を利用できません · おさんぽは続けられます"
      : this.blocked || this.bank.failed ? "音を再生できません · 次の操作で再試行します"
      : this.bank.sounds.size < Object.keys(AUDIO_TRACKS).length ? "一部の音源を読み込めませんでした"
      : this.session.preferences.muted ? "ミュート中"
      : !this.session.unlocked ? "操作すると音が流れます"
      : this.session.phase === "walking" && this.session.focused ? "音声ON" : "BGMはおやすみ中";
    this.controls.refresh(message);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true; this.controller.abort(); this.bank.manager.off(Phaser.Sound.Events.UNLOCKED, this.onUnlocked);
    this.session.destroy(); this.bank.destroy(); this.controls.destroy();
  }
}
