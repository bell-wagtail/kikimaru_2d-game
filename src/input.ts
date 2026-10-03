export type Action = "left" | "right" | "jump" | "dash";

export const keyActions: Readonly<Record<string, Action>> = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  Space: "jump", ArrowUp: "jump", KeyW: "jump",
  ShiftLeft: "dash", ShiftRight: "dash"
};

export class InputState {
  private sources = new Map<string, Action>();
  private jumpQueued = false;

  press(source: string, action: Action): void {
    if (this.sources.has(source)) return;
    // A held jump cannot re-trigger on landing, including through a second input device.
    if (action === "jump" && !this.active("jump")) this.jumpQueued = true;
    this.sources.set(source, action);
  }

  release(source: string): void { this.sources.delete(source); }

  active(action: Action): boolean {
    return [...this.sources.values()].includes(action);
  }

  get direction(): number {
    return Number(this.active("right")) - Number(this.active("left"));
  }

  consumeJump(): boolean {
    const requested = this.jumpQueued;
    this.jumpQueued = false;
    return requested;
  }

  clear(): void {
    this.sources.clear();
    this.jumpQueued = false;
  }
}

export function bindControls(state: InputState, reset: () => void, enabled: () => boolean = () => true): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-action]")];
  const stage = document.querySelector<HTMLElement>("#stage")!;
  const refresh = () => buttons.forEach(button => {
    button.classList.toggle("pressed", state.active(button.dataset.action as Action));
  });
  const clear = () => { state.clear(); refresh(); };

  window.addEventListener("keydown", event => {
    if (!enabled()) return;
    const action = keyActions[event.code];
    if (!action || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    // Preserve native Space activation when a real button has keyboard focus.
    if (event.code === "Space" && event.target instanceof HTMLButtonElement) return;
    // Keep Shift available to browser navigation such as Shift+Tab.
    if (action !== "dash") event.preventDefault();
    if (!event.repeat) state.press(`key:${event.code}`, action);
    refresh();
  }, options);
  window.addEventListener("keyup", event => { state.release(`key:${event.code}`); refresh(); }, options);
  window.addEventListener("blur", clear, options);
  document.addEventListener("visibilitychange", clear, options);
  stage.addEventListener("pointerdown", () => { if (enabled()) stage.focus({ preventScroll: true }); }, options);

  for (const button of buttons) {
    button.addEventListener("pointerdown", event => {
      if (event.button !== 0 || !enabled()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      state.press(`pointer:${event.pointerId}`, button.dataset.action as Action);
      refresh();
    }, options);
    const release = (event: PointerEvent) => { state.release(`pointer:${event.pointerId}`); refresh(); };
    button.addEventListener("pointerup", release, options);
    button.addEventListener("pointercancel", release, options);
    button.addEventListener("lostpointercapture", release, options);
    button.addEventListener("click", event => {
      if (event.detail !== 0 || button.dataset.action !== "jump" || !enabled()) return;
      state.press("keyboard-button", "jump");
      state.release("keyboard-button");
      stage.focus({ preventScroll: true });
    }, options);
    button.addEventListener("contextmenu", event => event.preventDefault(), options);
  }

  document.querySelector<HTMLButtonElement>("#reset")!.addEventListener("click", () => {
    if (!enabled()) return;
    clear();
    reset();
    stage.focus({ preventScroll: true });
  }, options);

  return () => { controller.abort(); clear(); };
}
