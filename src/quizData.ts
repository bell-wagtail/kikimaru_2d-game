export interface QuizQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly choices: readonly [string, string, string, string];
  readonly correctIndex: number;
  readonly explanation: string;
  readonly sourceUrl: string;
}

export const QUIZ_QUESTIONS = [
  { id: "horai-bridge", prompt: "「やくなし」の語呂合わせで知られる、蓬莱橋の長さは？",
    choices: ["897.4m", "734.6m", "575.2m", "223.8m"], correctIndex: 0,
    explanation: "蓬莱橋は、897.4を「やくなし＝厄無し」と読む語呂合わせで親しまれる木造歩道橋です。",
    sourceUrl: "https://www.city.shimada.shizuoka.jp/kanko-docs/houraibasi.html" },
  { id: "dream-bridge", prompt: "夢のつり橋がある渓谷は？",
    choices: ["寸又峡", "接岨峡", "天龍峡", "昇仙峡"], correctIndex: 0,
    explanation: "夢のつり橋は、川根本町の寸又峡にあり、エメラルドグリーンの湖に架かっています。",
    sourceUrl: "https://okuooi.gr.jp/outdoor/details.php?id=120" },
  { id: "shimada-festival", prompt: "島田で3年に一度開かれる伝統のお祭りは？",
    choices: ["帯まつり（島田大祭）", "島田髷まつり", "金谷茶まつり", "大井川大花火大会"], correctIndex: 0,
    explanation: "帯まつりは、大奴（おおやっこ）が華やかな帯を太刀に掛けて練り歩く、島田の伝統のお祭りです。",
    sourceUrl: "https://www.city.shimada.shizuoka.jp/kanko-docs/shimadataisai_105.html" }
] as const satisfies readonly QuizQuestion[];
