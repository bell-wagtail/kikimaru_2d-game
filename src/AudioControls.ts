import type { AudioSession } from "./audioSession";

export class AudioControls {
  private readonly panel = document.createElement("div");
  private readonly status = document.createElement("span");
  private readonly button = document.createElement("button");
  private readonly sliders: HTMLInputElement[] = [];
  private readonly controller = new AbortController();

  constructor(private readonly session: AudioSession, private readonly changed: () => void) {
    this.panel.className = "audio-panel";
    this.panel.setAttribute("role", "group"); this.panel.setAttribute("aria-label", "音の設定");
    this.button.type = "button"; this.button.className = "audio-mute";
    this.button.addEventListener("click", () => { this.session.setMuted(!this.session.preferences.muted); this.changed(); }, { signal: this.controller.signal });
    this.panel.append(this.button);
    for (const [channel, label] of [["bgm", "BGM"], ["effects", "効果音"]] as const) {
      const wrapper = document.createElement("label"); wrapper.textContent = label;
      const slider = document.createElement("input");
      slider.type = "range"; slider.min = "0"; slider.max = "100"; slider.step = "1";
      slider.dataset.audioVolume = channel; slider.setAttribute("aria-label", `${label}の音量`);
      slider.addEventListener("input", () => { this.session.setVolume(channel, Number(slider.value) / 100); this.changed(); }, { signal: this.controller.signal });
      this.sliders.push(slider); wrapper.append(slider); this.panel.append(wrapper);
    }
    this.status.className = "audio-status"; this.status.setAttribute("role", "status"); this.panel.append(this.status);
    document.querySelector(".scene")!.after(this.panel);
    this.refresh("操作すると音が流れます");
  }

  refresh(message: string): void {
    const preferences = this.session.preferences;
    this.button.textContent = preferences.muted ? "音を出す" : "音を消す";
    this.button.setAttribute("aria-pressed", String(preferences.muted));
    for (const slider of this.sliders) slider.value = String(Math.round(preferences[slider.dataset.audioVolume as "bgm" | "effects"] * 100));
    if (this.status.textContent !== message) this.status.textContent = message;
  }

  destroy(): void { this.controller.abort(); this.panel.remove(); }
}
