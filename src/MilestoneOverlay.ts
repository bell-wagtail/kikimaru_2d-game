import type { PlayResult } from "./playResult";

export class MilestoneOverlay {
  private readonly startDialog = document.createElement("dialog");
  private readonly resultDialog = document.createElement("dialog");
  private readonly score = document.createElement("p");
  private readonly quiz = document.createElement("p");
  private readonly dock = document.createElement("div");

  constructor(onStart: () => void, onRetry: () => void) {
    const button = (id: string, label: string, action: () => void) => {
      const element = document.createElement("button");
      element.id = id; element.type = "button"; element.textContent = label;
      element.addEventListener("click", action);
      return element;
    };
    const title = (id: string, text: string) => {
      const element = document.createElement("h2");
      element.id = id; element.textContent = text;
      return element;
    };
    this.startDialog.id = "start-dialog";
    this.startDialog.className = this.resultDialog.className = "milestone-dialog";
    this.startDialog.setAttribute("aria-labelledby", "start-title");
    const message = document.createElement("p");
    message.textContent = "歩いて、ジャンプして、おさんぽを楽しもう。";
    this.startDialog.append(title("start-title", "おさんぽのスタート"), message,
      button("start-walk", "おさんぽを始める", onStart));
    this.startDialog.addEventListener("cancel", event => event.preventDefault());
    this.resultDialog.id = "goal-dialog";
    this.resultDialog.setAttribute("aria-labelledby", "goal-title");
    this.score.id = "goal-score"; this.quiz.id = "goal-quiz";
    this.resultDialog.append(title("goal-title", "ゴール！ おつかれさま"), this.score, this.quiz,
      button("retry-walk", "もう一度", onRetry), button("close-result", "結果を閉じる", () => this.closeResult()));
    this.resultDialog.addEventListener("cancel", event => { event.preventDefault(); this.closeResult(); });
    this.dock.className = "result-dock";
    this.dock.hidden = true;
    this.dock.append(button("show-result", "結果を見る", () => this.openResult()), button("retry-dock", "もう一度", onRetry));
    (document.querySelector(".scene") ?? document.querySelector("#stage")!.parentElement!).append(this.dock);
    document.body.append(this.startDialog, this.resultDialog);
  }

  showStart(): void { this.startDialog.showModal(); }
  closeStart(): void { if (this.startDialog.open) this.startDialog.close(); }

  showResult(result: Readonly<PlayResult>): void {
    this.score.textContent = `取得スコア ${result.score} / ${result.maximumScore}点`;
    this.quiz.textContent = `クイズ正解数 ${result.correctCount} / ${result.quizCount}問 · 未回答 ${result.unansweredCount}問`;
    this.dock.hidden = false;
    this.openResult();
  }

  private openResult(): void {
    if (!this.resultDialog.open) this.resultDialog.showModal();
  }

  private closeResult(): void {
    if (this.resultDialog.open) this.resultDialog.close();
    this.dock.querySelector<HTMLButtonElement>("button")!.focus({ preventScroll: true });
  }

  reset(): void {
    this.closeStart();
    if (this.resultDialog.open) this.resultDialog.close();
    this.dock.hidden = true;
    this.score.textContent = this.quiz.textContent = "";
  }

  destroy(): void { this.reset(); this.startDialog.remove(); this.resultDialog.remove(); this.dock.remove(); }
}
