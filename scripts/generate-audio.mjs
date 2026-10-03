import { mkdir, writeFile } from "node:fs/promises";
import { AUDIO_TRACKS, WALK_MUSIC } from "../src/audioDefinition.ts";
import { synthesizeTrack, encodeWav } from "../src/audioSynthesis.ts";

const destination = new URL("../src/audio-assets/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const [key, track] of Object.entries(AUDIO_TRACKS)) {
  const pcm = synthesizeTrack(key);
  await writeFile(new URL(track.filename, destination), encodeWav(pcm, WALK_MUSIC.sampleRate));
  console.log(`${track.filename}: ${track.seconds.toFixed(2)}秒`);
}
