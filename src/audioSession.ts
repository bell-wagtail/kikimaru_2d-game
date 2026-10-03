import { AUDIO_CUES, AUDIO_DEFAULTS, AUDIO_TRACKS } from "./audioDefinition.ts";
import type { AudioCue } from "./audioDefinition.ts";

export type AudioPreferences = { bgm: number; effects: number; muted: boolean };
export interface AudioPort {
  playLoop(resume: boolean, volume: number): boolean;
  pauseLoop(): void;
  stopLoop(): void;
  playCue(cue: AudioCue, volume: number): void;
  stopCues(): void;
  volumes(bgm: number, effects: number): void;
}

export class AudioSession {
  phase: "waiting" | "walking" | "quiz" | "goal" = "waiting";
  loopState: "stopped" | "playing" | "paused" = "stopped";
  unlocked = false;
  focused = true;
  private pendingStart = false;
  private destroyed = false;

  private readonly port: AudioPort;
  readonly preferences: AudioPreferences;
  constructor(port: AudioPort, preferences: AudioPreferences = { ...AUDIO_DEFAULTS }) {
    this.port = port; this.preferences = preferences;
  }

  reset(waiting: boolean): void {
    if (this.destroyed) return;
    this.port.stopCues(); this.port.stopLoop();
    this.loopState = "stopped";
    this.phase = waiting ? "waiting" : "walking";
    this.pendingStart = !waiting;
    this.sync(); this.flushStart();
  }

  start(): void {
    if (this.destroyed || this.phase !== "waiting") return;
    this.phase = "walking"; this.pendingStart = true;
    this.sync(); this.flushStart();
  }

  quiz(): void {
    if (this.destroyed) return;
    this.phase = "quiz"; this.pendingStart = false;
    this.port.stopCues(); this.sync(); this.cue(AUDIO_CUES.quiz);
  }

  resumeWalk(): void {
    if (this.destroyed || this.phase !== "quiz") return;
    this.port.stopCues(); this.phase = "walking"; this.sync();
  }

  goal(): void {
    if (this.destroyed || this.phase === "goal") return;
    this.phase = "goal"; this.pendingStart = false;
    this.port.stopCues(); this.sync(); this.cue(AUDIO_CUES.goal);
  }

  cue(cue: AudioCue): void {
    if (this.audible && this.preferences.effects > 0) this.port.playCue(cue, this.preferences.effects * AUDIO_TRACKS[cue].gain);
  }

  setUnlocked(value: boolean): void {
    if (this.destroyed) return;
    this.unlocked = value; this.sync(); this.flushStart();
  }

  setFocused(value: boolean): void {
    if (this.destroyed) return;
    this.focused = value;
    if (!value) this.port.stopCues();
    this.sync();
  }

  setMuted(value: boolean): void {
    if (this.destroyed) return;
    this.preferences.muted = value;
    if (value) { this.pendingStart = false; this.port.stopCues(); }
    this.sync();
  }

  setVolume(channel: "bgm" | "effects", value: number): void {
    if (this.destroyed) return;
    this.preferences[channel] = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    this.port.volumes(this.preferences.bgm * AUDIO_TRACKS.walk.gain, this.preferences.effects);
    if (!this.preferences.effects) this.port.stopCues();
    this.sync();
  }

  private get audible(): boolean { return !this.destroyed && this.unlocked && this.focused && !this.preferences.muted; }

  private flushStart(): void {
    if (!this.pendingStart || !this.unlocked) return;
    this.pendingStart = false;
    if (this.phase === "walking") this.cue(AUDIO_CUES.start);
  }

  private sync(): void {
    if (this.destroyed) return;
    if (this.phase === "waiting" || this.phase === "goal") {
      if (this.loopState !== "stopped") { this.loopState = "stopped"; this.port.stopLoop(); }
    } else if (this.phase === "walking" && this.audible && this.preferences.bgm > 0) {
      if (this.loopState !== "playing") {
        const resume = this.loopState === "paused";
        this.loopState = this.port.playLoop(resume, this.preferences.bgm * AUDIO_TRACKS.walk.gain) ? "playing" : "stopped";
      }
    } else if (this.loopState === "playing") {
      this.loopState = "paused"; this.port.pauseLoop();
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true; this.pendingStart = false; this.loopState = "stopped";
    this.port.stopCues(); this.port.stopLoop();
  }
}
