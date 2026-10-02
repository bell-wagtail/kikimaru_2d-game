import type { QuizResult, QuizView } from "./quiz";

export class QuizOverlay {
  private readonly dialog = document.createElement("dialog");
  private readonly prompt = document.createElement("h2");
  private readonly choices = document.createElement("div");
  private readonly result = document.createElement("div");
  private readonly verdict = document.createElement("p");
  private readonly fact = document.createElement("p");
  private readonly resume = document.createElement("button");

  constructor(onAnswer: (index: number) => void, onResume: () => void) {
    this.dialog.id = "quiz-dialog";
    this.dialog.setAttribute("aria-labelledby", "quiz-prompt");
    this.prompt.id = "quiz-prompt";
    const label = document.createElement("p");
    label.className = "quiz-label";
    label.textContent = "ききまるの地域クイズ";
    this.choices.className = "quiz-choices";
    this.result.id = "quiz-result";
    this.result.setAttribute("role", "status");
    this.result.setAttribute("aria-atomic", "true");
    this.fact.id = "quiz-fact";
    this.result.append(this.verdict, this.fact);
    this.resume.type = "button";
    this.resume.textContent = "おさんぽを続ける";
    this.resume.addEventListener("click", onResume);
    this.dialog.addEventListener("cancel", event => event.preventDefault());
    this.choices.addEventListener("click", event => {
      const target = event.target;
      if (target instanceof HTMLButtonElement && !target.disabled) onAnswer(Number(target.dataset.choice));
    });
    this.dialog.append(label, this.prompt, this.choices, this.result, this.resume);
    document.body.append(this.dialog);
  }

  show(quiz: QuizView): void {
    this.prompt.textContent = quiz.prompt;
    this.choices.replaceChildren(...quiz.choices.map((text, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.choice = String(index);
      button.textContent = text;
      return button;
    }));
    this.verdict.textContent = "";
    this.fact.textContent = "";
    this.result.hidden = true;
    this.resume.hidden = true;
    this.dialog.showModal();
    this.choices.querySelector<HTMLButtonElement>("button")!.focus({ preventScroll: true });
  }

  answered(result: QuizResult, actualChange: number, score: number): void {
    for (const button of this.choices.querySelectorAll<HTMLButtonElement>("button")) button.disabled = true;
    const signed = (points: number) => `${points >= 0 ? "+" : ""}${points}`;
    const adjustment = actualChange === result.points ? "" : `（実際の増減 ${signed(actualChange)}点）`;
    this.verdict.textContent = `${result.correct ? "正解！" : "不正解"} 正解は「${result.correctAnswer}」。${signed(result.points)}点${adjustment} · スコア ${score}点`;
    this.fact.textContent = `豆知識：${result.explanation}`;
    this.result.hidden = false;
    this.resume.hidden = false;
    this.resume.focus({ preventScroll: true });
  }

  close(): void { if (this.dialog.open) this.dialog.close(); }

  destroy(): void { this.close(); this.dialog.remove(); }
}
