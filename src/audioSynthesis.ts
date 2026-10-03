import { AUDIO_TRACKS, WALK_MUSIC } from "./audioDefinition.ts";
import type { AudioTrack } from "./audioDefinition.ts";

type Instrument = "wood" | "bell" | "pad" | "bass" | "brush";
type Note = { at: number; midi: number; length: number; gain: number; pan: number; instrument: Instrument };
export type StereoPcm = readonly [Float32Array, Float32Array];

function musicNotes(): Note[] {
  const beat = 60 / WALK_MUSIC.bpm;
  const chords = [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57],
    [55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57],
    [59, 62, 66], [52, 55, 59], [48, 52, 55], [50, 54, 57],
    [55, 59, 62], [48, 52, 55], [50, 54, 57], [55, 59, 62]];
  // Each pair is a beat position and MIDI pitch; rests leave room for the game cues.
  const melody = [
    [[0, 71], [0.75, 74], [1.5, 76], [2.5, 74], [3.25, 71]],
    [[0, 67], [1, 71], [2, 74], [3, 71]],
    [[0, 72], [0.75, 71], [1.5, 67], [2.5, 64], [3.25, 67]],
    [[0, 69], [1, 74], [2, 72], [3, 69]],
    [[0, 71], [0.5, 74], [1.5, 79], [2.75, 76]],
    [[0, 74], [1, 71], [2.25, 67]],
    [[0, 64], [0.75, 67], [1.5, 72], [2.5, 71], [3.25, 67]],
    [[0, 69], [1, 66], [2.5, 74]],
    [[0, 74], [0.75, 78], [1.5, 76], [2.5, 74]],
    [[0, 71], [1, 67], [2, 64], [3, 67]],
    [[0, 72], [0.75, 76], [1.5, 79], [2.75, 76]],
    [[0, 74], [1, 72], [2, 69], [3, 66]],
    [[0, 67], [0.75, 71], [1.5, 74], [2.5, 76], [3.25, 74]],
    [[0, 72], [1, 71], [2, 67], [3, 64]],
    [[0, 69], [0.75, 72], [1.5, 74], [2.75, 66]],
    [[0, 67], [1.5, 71], [2.5, 74]]
  ];
  const notes: Note[] = [];
  const add = (bar: number, position: number, midi: number, length: number, gain: number, pan: number, instrument: Instrument) =>
    notes.push({ at: (bar * 4 + position) * beat, midi, length: length * beat, gain, pan, instrument });
  for (let bar = 0; bar < WALK_MUSIC.bars; bar++) {
    const chord = chords[bar];
    for (const [position, midi] of melody[bar]) {
      add(bar, position, midi, 0.95, 0.32, -0.12, "wood");
      if (position === 0 && bar % 2 === 0) add(bar, position, midi + 12, 1.7, 0.06, 0.48, "bell");
    }
    chord.forEach((midi, index) => add(bar, 0, midi + 12, 4.3, 0.045, (index - 1) * 0.45, "pad"));
    add(bar, 0, chord[0] - 12, 1.1, 0.22, 0, "bass");
    add(bar, 2, chord[0] - 5, 0.85, 0.14, 0, "bass");
    for (const position of [0.5, 1.5, 2.5, 3.5]) {
      add(bar, position, chord[1] + 12, 0.45, 0.07, 0.28, "wood");
      add(bar, position, 0, 0.14, 0.035, position < 2 ? -0.35 : 0.35, "brush");
    }
  }
  return notes;
}

function cueNotes(track: Exclude<AudioTrack, "walk">): Note[] {
  const patterns: Record<Exclude<AudioTrack, "walk">, readonly (readonly [number, number])[]> = {
    item: [[0, 79], [0.095, 86]], start: [[0, 67], [0.18, 71], [0.36, 74], [0.56, 79]],
    goal: [[0, 67], [0.18, 71], [0.36, 74], [0.7, 79], [0.7, 71], [0.7, 74], [1.2, 83], [1.2, 79]],
    quiz: [[0, 74], [0.17, 79], [0.37, 78]], correct: [[0, 72], [0.14, 76], [0.3, 79], [0.5, 84]],
    incorrect: [[0, 67], [0.22, 64]], powerEnd: [[0, 79], [0.15, 74], [0.3, 71]]
  };
  return patterns[track].map(([at, midi], index) => ({ at, midi, length: track === "goal" ? 1.05 : 0.4,
    gain: 0.3, pan: (index % 2 ? 1 : -1) * 0.15, instrument: track === "incorrect" ? "wood" : "bell" }));
}

export function synthesizeTrack(track: AudioTrack, sampleRate = WALK_MUSIC.sampleRate): StereoPcm {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error("不正なサンプルレート");
  const count = Math.round(AUDIO_TRACKS[track].seconds * sampleRate);
  const channels: StereoPcm = [new Float32Array(count), new Float32Array(count)];
  const loop = track === "walk";
  const notes = loop ? musicNotes() : cueNotes(track);
  let noiseSeed = 0x6421;
  for (const note of notes) {
    const start = Math.round(note.at * sampleRate);
    const samples = Math.ceil(note.length * sampleRate);
    const frequency = 440 * 2 ** ((note.midi - 69) / 12);
    const stereo = [Math.sqrt((1 - note.pan) / 2), Math.sqrt((1 + note.pan) / 2)];
    let previousNoise = 0;
    for (let index = 0; index < samples; index++) {
      const t = index / sampleRate, p = 2 * Math.PI * frequency * t;
      const attack = Math.min(1, t / (note.instrument === "pad" ? 0.12 : 0.004));
      const release = Math.min(1, (note.length - t) / (note.instrument === "pad" ? 0.2 : 0.025));
      let value: number;
      switch (note.instrument) {
        case "wood": value = Math.sin(p) * Math.exp(-t * 5.5) + 0.27 * Math.sin(3 * p) * Math.exp(-t * 15)
          + (frequency * 5 < sampleRate / 2 ? 0.08 * Math.sin(5 * p) * Math.exp(-t * 25) : 0); break;
        case "bell": value = Math.sin(p + 0.55 * Math.sin(2 * p) * Math.exp(-t * 7)) * Math.exp(-t * 4)
          + (frequency * 2.76 < sampleRate / 2 ? 0.18 * Math.sin(2.76 * p) * Math.exp(-t * 8) : 0); break;
        case "pad": value = (Math.sin(p) + 0.13 * Math.sin(2 * p)) * 0.75; break;
        case "bass": value = (Math.sin(p) + 0.15 * Math.sin(2 * p)) * Math.exp(-t * 5); break;
        case "brush": {
          noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
          const noise = noiseSeed / 0x80000000 - 1;
          value = (noise - previousNoise) * Math.exp(-t * 35);
          previousNoise = noise;
          break;
        }
      }
      const destination = loop ? (start + index) % count : start + index;
      if (destination >= count) break;
      for (let channel = 0; channel < 2; channel++) channels[channel][destination] += value * attack * release * note.gain * stereo[channel];
    }
  }
  // A finite stereo echo includes the previous loop's tail at the beginning of a loop.
  const dry = channels.map(channel => channel.slice());
  for (const [seconds, gain] of [[0.073, 0.12], [0.137, 0.09], [0.223, 0.06], [0.311, 0.035]]) {
    const delay = Math.round(seconds * sampleRate);
    for (let channel = 0; channel < 2; channel++) for (let index = 0; index < count; index++) {
      const source = index - delay;
      if (source >= 0 || loop) channels[channel][index] += dry[1 - channel][(source + count) % count] * gain;
    }
  }
  let peak = 0;
  for (const channel of channels) {
    const mean = channel.reduce((sum, value) => sum + value, 0) / count;
    for (let index = 0; index < count; index++) {
      channel[index] -= mean;
      if (!loop) channel[index] *= Math.min(1, index / (sampleRate * 0.004), (count - 1 - index) / (sampleRate * 0.025));
      peak = Math.max(peak, Math.abs(channel[index]));
    }
  }
  const scale = (loop ? 0.65 : 0.75) / Math.max(peak, 1e-9);
  for (const channel of channels) for (let index = 0; index < count; index++) channel[index] *= scale;
  return channels;
}

export function encodeWav(channels: StereoPcm, sampleRate: number): Uint8Array {
  if (!channels[0].length || channels[0].length !== channels[1].length) throw new Error("不正なPCMチャンネル");
  const dataBytes = channels[0].length * 4;
  const bytes = new Uint8Array(44 + dataBytes), view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => [...value].forEach((character, index) => view.setUint8(at + index, character.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, 36 + dataBytes, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, dataBytes, true);
  for (let index = 0; index < channels[0].length; index++) for (let channel = 0; channel < 2; channel++) {
    const value = channels[channel][index];
    if (!Number.isFinite(value)) throw new Error("PCMに非数値が含まれています");
    view.setInt16(44 + index * 4 + channel * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true);
  }
  return bytes;
}
