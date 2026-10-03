import type { AudioSession } from "./audioSession";

export class AudioControls {
  private readonly panel = document.createElement("div");
  private readonly status = document.createElement("span");
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly sliders: HTMLInputElement[] = [];
  private readonly controller = new AbortController();

  constructor(private readonly session: AudioSession, private readonly changed: () => void) {
    this.panel.className = "audio-panel";
    this.panel.setAttribute("role", "group"); this.panel.setAttribute("aria-label", "音の設定");
    this.panel.append(this.muteButton());
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
    for (const dialog of document.querySelectorAll("#start-dialog, #quiz-dialog, #goal-dialog")) dialog.append(this.muteButton());
    this.refresh("操作すると音が流れます");
  }

  private muteButton(): HTMLButtonElement {
    const button = document.createElement("button"); button.type = "button"; button.className = "audio-mute";
    button.addEventListener("click", () => { this.session.setMuted(!this.session.preferences.muted); this.changed(); }, { signal: this.controller.signal });
    this.buttons.push(button); return button;
  }

  refresh(message: string): void {
    const preferences = this.session.preferences;
    for (const button of this.buttons) {
      button.textContent = preferences.muted ? "音を出す" : "音を消す";
      button.setAttribute("aria-pressed", String(preferences.muted));
    }
    for (const slider of this.sliders) slider.value = String(Math.round(preferences[slider.dataset.audioVolume as "bgm" | "effects"] * 100));
    if (this.status.textContent !== message) this.status.textContent = message;
  }

  destroy(): void { this.controller.abort(); this.panel.remove(); for (const button of this.buttons) button.remove(); }
}
