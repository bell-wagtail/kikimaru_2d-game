import { AUDIO_TRACKS } from "../src/audioDefinition.ts";
const urls = import.meta.glob("../src/audio-assets/*.wav", { eager: true, query: "?url", import: "default" });
for (const [key, track] of Object.entries(AUDIO_TRACKS)) {
  const section = document.createElement("section"), title = document.createElement("h2"), button = document.createElement("button"), sound = document.createElement("audio");
  title.textContent = track.label; button.textContent = `${track.label}を試聴`;
  sound.src = urls[`../src/audio-assets/${track.filename}`]; sound.controls = true; sound.preload = "metadata"; sound.loop = key === "walk"; sound.volume = key === "walk" ? 0.4 : 0.65;
  button.addEventListener("click", async () => {
    for (const other of document.querySelectorAll("audio")) { other.pause(); other.currentTime = 0; }
    try { await sound.play(); document.querySelector("#status").textContent = `${track.label}を再生中`; }
    catch { document.querySelector("#status").textContent = "音声を再生できませんでした。音源ファイルを開いて試聴してください。"; }
  });
  sound.addEventListener("ended", () => { document.querySelector("#status").textContent = `${track.label}の試聴が終了しました`; });
  section.append(title, button, sound); document.querySelector("#tracks").append(section);
}
