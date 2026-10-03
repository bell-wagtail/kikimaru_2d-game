import test from "node:test";
import assert from "node:assert/strict";
import { AudioSession } from "../src/audioSession.ts";
import type { AudioPort } from "../src/audioSession.ts";
import { AUDIO_DEFAULTS } from "../src/audioDefinition.ts";

function fixture() {
  const calls: { name: string; values: unknown[] }[] = [];
  const record = (name: string, ...values: unknown[]) => calls.push({ name, values });
  const port: AudioPort = {
    playLoop: (resume, volume) => { record(resume ? "resume" : "play", volume); return true; },
    pauseLoop: () => record("pause"), stopLoop: () => record("stop"),
    playCue: (cue, volume) => record(cue, volume), stopCues: () => record("clear"),
    volumes: (...values) => record("volumes", ...values)
  };
  const session = new AudioSession(port);
  const count = (name: string) => calls.filter(call => call.name === name).length;
  return { session, calls, count, port };
}

test("開始前と操作前は無音、最初の操作後に開始音とBGMを一度だけ再生", () => {
  const { session, count } = fixture();
  session.reset(true); session.setUnlocked(true);
  assert.equal(count("play"), 0); assert.equal(count("start"), 0);
  session.setUnlocked(false); session.start(); session.start();
  assert.equal(count("play"), 0);
  session.setUnlocked(true); session.setUnlocked(true); session.start();
  assert.equal(count("play"), 1); assert.equal(count("start"), 1);
});

test("未指定スタートも最初の操作で再生し、待機中のミュートでは開始音を遅延再生しない", () => {
  const { session, count } = fixture();
  session.reset(false); assert.equal(count("play"), 0);
  session.setMuted(true); session.setUnlocked(true); session.setMuted(false);
  assert.equal(count("play"), 1); assert.equal(count("start"), 0);
});

test("クイズとフォーカス喪失ではBGMを一時停止、戻っても開始・回答音を再生しない", () => {
  const { session, count } = fixture();
  session.setUnlocked(true); session.reset(false); session.quiz();
  session.cue("correct"); session.setFocused(false); session.setFocused(true);
  assert.equal(count("resume"), 0);
  session.resumeWalk(); session.resumeWalk();
  assert.equal(count("resume"), 1); assert.equal(count("correct"), 1); assert.equal(count("start"), 1);
  session.setFocused(false); session.cue("item"); session.setFocused(true);
  assert.equal(count("item"), 0); assert.equal(count("resume"), 2); assert.equal(count("play"), 1);
});

test("複数クイズは各開始音を再生し、最後までBGMを止める", () => {
  const { session, count } = fixture();
  session.setUnlocked(true); session.reset(false);
  for (let index = 0; index < 3; index++) { session.quiz(); session.cue("correct"); }
  assert.equal(count("quiz"), 3); assert.equal(count("correct"), 3); assert.equal(count("resume"), 0);
  session.goal(); assert.equal(count("goal"), 1); assert.equal(session.loopState, "stopped");
});

test("ゴール確定は一度、結果再表示とフォーカス復帰では再生せず再挑戦で全音を止める", () => {
  const { session, count } = fixture();
  session.setUnlocked(true); session.reset(false); session.goal(); session.goal();
  session.setFocused(false); session.setFocused(true); session.resumeWalk();
  assert.equal(count("goal"), 1); assert.equal(count("resume"), 0);
  session.reset(true); assert.equal(session.loopState, "stopped");
  assert.equal(count("powerEnd"), 0); session.start();
  assert.equal(count("play"), 2); assert.equal(count("start"), 2);
});

test("ミュート・BGMゼロ・音量変更は反映し、シーン再起動用の設定を保持できる", () => {
  const { session, count, port } = fixture();
  session.setUnlocked(true); session.reset(false); session.setMuted(true); session.cue("goal");
  assert.equal(count("goal"), 0); assert.equal(session.loopState, "paused");
  session.setMuted(false); session.setVolume("bgm", 0); session.setVolume("effects", 0);
  session.cue("item"); assert.equal(count("item"), 0);
  session.setVolume("bgm", 0.5); assert.equal(session.loopState, "playing");
  const next = new AudioSession(port, session.preferences);
  assert.equal(next.preferences.bgm, 0.5); assert.equal(next.preferences.effects, 0);
  assert.equal(AUDIO_DEFAULTS.bgm, 0.35);
});

test("再生不可と破棄後はゲーム側の呼び出しで例外や遅延音を起こさない", () => {
  const { session, port, calls, count } = fixture();
  port.playLoop = () => false;
  session.reset(false); session.setUnlocked(true);
  assert.equal(session.loopState, "stopped");
  session.destroy(); const length = calls.length;
  session.setUnlocked(true); session.start(); session.reset(false); session.quiz(); session.goal();
  session.cue("item"); session.setMuted(false); session.setVolume("bgm", 1); session.setFocused(true); session.destroy();
  assert.equal(calls.length, length); assert.equal(count("item"), 0);
});
