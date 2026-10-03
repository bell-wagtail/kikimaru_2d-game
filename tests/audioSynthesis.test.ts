import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AUDIO_TRACKS, WALK_MUSIC } from "../src/audioDefinition.ts";
import type { AudioTrack } from "../src/audioDefinition.ts";
import { synthesizeTrack, encodeWav } from "../src/audioSynthesis.ts";

test("全音源が定義通りのステレオPCMで、非数値・クリッピング・無音がない", () => {
  for (const track of Object.keys(AUDIO_TRACKS) as AudioTrack[]) {
    const pcm = synthesizeTrack(track, 8000);
    assert.equal(pcm[0].length, Math.round(AUDIO_TRACKS[track].seconds * 8000));
    assert.equal(pcm[0].length, pcm[1].length);
    for (const channel of pcm) {
      let peak = 0, energy = 0;
      for (const sample of channel) { assert.ok(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample)); energy += sample ** 2; }
      assert.ok(peak > 0.3 && peak < 0.8); assert.ok(energy / channel.length > 0.0001);
      if (track !== "walk") { assert.equal(Math.abs(channel[0]), 0); assert.equal(Math.abs(channel.at(-1)!), 0); }
    }
  }
});

test("BGMのループ境界と前後に無音区間・急な波形の段差がない", () => {
  const pcm = synthesizeTrack("walk");
  for (const channel of pcm) {
    assert.ok(Math.abs(channel[0] - channel.at(-1)!) < 0.015);
    for (const samples of [channel.subarray(0, 4410), channel.subarray(-4410)]) {
      const rms = Math.sqrt(samples.reduce((sum, value) => sum + value ** 2, 0) / samples.length);
      assert.ok(rms > 0.005, `ループ端のRMS: ${rms}`);
    }
  }
});

test("保存WAVは合成結果と一致し、標準PCMとして定義した長さ・形式を持つ", async () => {
  for (const track of Object.keys(AUDIO_TRACKS) as AudioTrack[]) {
    const saved = await readFile(new URL(`../src/audio-assets/${AUDIO_TRACKS[track].filename}`, import.meta.url));
    const generated = encodeWav(synthesizeTrack(track), WALK_MUSIC.sampleRate);
    assert.deepEqual(saved, Buffer.from(generated));
    assert.equal(saved.toString("ascii", 0, 4), "RIFF"); assert.equal(saved.toString("ascii", 8, 12), "WAVE");
    assert.equal(saved.readUInt16LE(20), 1); assert.equal(saved.readUInt16LE(22), 2);
    assert.equal(saved.readUInt32LE(24), WALK_MUSIC.sampleRate); assert.equal(saved.readUInt16LE(34), 16);
    assert.equal(saved.readUInt32LE(40), saved.length - 44);
  }
});
