export const WALK_MUSIC = { bpm: 96, beatsPerBar: 4, bars: 16, sampleRate: 44100 } as const;

export const AUDIO_TRACKS = {
  item: { filename: "item.wav", label: "アイテム取得", seconds: 0.55, gain: 0.65 },
  start: { filename: "start.wav", label: "スタート", seconds: 1.15, gain: 0.65 },
  goal: { filename: "goal.wav", label: "ゴール", seconds: 2.6, gain: 0.75 },
  quiz: { filename: "quiz.wav", label: "クイズ開始", seconds: 0.85, gain: 0.6 },
  correct: { filename: "correct.wav", label: "正解", seconds: 1.15, gain: 0.65 },
  incorrect: { filename: "incorrect.wav", label: "誤答", seconds: 0.8, gain: 0.5 },
  powerEnd: { filename: "power-end.wav", label: "アイテム効果終了", seconds: 0.95, gain: 0.5 },
  walk: { filename: "walk.wav", label: "おさんぽBGM", seconds: WALK_MUSIC.bars * WALK_MUSIC.beatsPerBar * 60 / WALK_MUSIC.bpm, gain: 0.75 }
} as const;

export type AudioTrack = keyof typeof AUDIO_TRACKS;
export type AudioCue = Exclude<AudioTrack, "walk">;
export const AUDIO_DEFAULTS = { bgm: 0.35, effects: 0.7, muted: false } as const;

export const AUDIO_CUES = { pickup: "item", start: "start", goal: "goal", quiz: "quiz",
  correct: "correct", incorrect: "incorrect", powerEnd: "powerEnd" } as const satisfies Record<string, AudioCue>;
