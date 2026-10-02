export interface QuizQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly choices: readonly [string, string, string, string];
  readonly correctIndex: number;
}

export const QUIZ_QUESTIONS = [
  { id: "horai-bridge", prompt: "蓬莱橋の長さは？",
    choices: ["897.4m", "1234m", "575m", "223m"], correctIndex: 0 },
  { id: "dream-bridge", prompt: "夢のつり橋があるのは？",
    choices: ["寸又峡", "接岨湖", "大井川", "井川湖"], correctIndex: 0 },
  { id: "shimada-festival", prompt: "島田で3年に一度の大祭といえば？",
    choices: ["帯祭り", "髷祭り", "金谷茶まつり", "大井川大花火大会"], correctIndex: 0 }
] as const satisfies readonly QuizQuestion[];
