# 次のききまる開発へ引き継ぐ文書セット

2Dゲームで得た成功・失敗と作業合意を、別の種類の開発でも使える形にまとめています。技術選定・実装・公開の新しい依頼は含みません。

## コピーして使う

1. このフォルダの**中身**を、新しいプロジェクトのルートへコピーします。既存の同名ファイルがある場合は上書きせず、必要な内容を統合してください。
2. [PROJECT](docs/PROJECT.md) に目的・対象環境・承認済み素材・設定の正本・ブランチ運用を記入します。未確定欄を過去のゲームの設定で埋めないでください。
3. [STATUS](docs/STATUS.md) をそのプロジェクトの到達点・未確認事項の正本として更新します。2Dゲームの現在の状態はコピーしていません。
4. 次のセッションでは [AGENTS.md](AGENTS.md) を読ませます。GitHub Copilot向けの入口は [.github/copilot-instructions.md](.github/copilot-instructions.md) です。

```text
<新しいプロジェクト>/
├── AGENTS.md
├── README.md
├── .github/
│   └── copilot-instructions.md
└── docs/
    ├── PROJECT.md          # 新しい開発の目的・正本・合意を記入
    ├── STATUS.md           # 新しい開発の現状を記入
    ├── WORKING_RULES.md    # 汎用的な作業ルール
    ├── LESSONS.md          # 成功・失敗と次の判断
    ├── KIKIMARU.md         # キャラクター・素材の再利用時の注意
    └── SOURCES.md          # 教訓の出典・確認範囲
```

依存・CI・公開設定・Git hooks・ゲームコード・画像・音源は同梱していません。Skillsやカスタムエージェントを追加せず、通常のAgentが読める文書と入口だけで引き継げます。既存の大量調査Skillは読み取り専用の調査用途なので、この一式の利用には不要です。

## 読む順番

作業判断は [WORKING_RULES](docs/WORKING_RULES.md)、背景は [LESSONS](docs/LESSONS.md)、素材を使う場合は [KIKIMARU](docs/KIKIMARU.md) を参照します。具体的な2Dゲームの実装は、[SOURCES](docs/SOURCES.md) の出典へ戻って確認してください。

## 情報を蓄積する

- 新しい事例は [LESSONS](docs/LESSONS.md) の書式で追加します。失敗だけでなく成功も残し、事実・判断・適用条件を記録します。
- 出典と確認日は [SOURCES](docs/SOURCES.md) へ追加します。未確認の推測を成功実績に数えません。
- 普遍的な判断基準が変わったときだけ [WORKING_RULES](docs/WORKING_RULES.md) を更新します。プロジェクト固有の設定・許可・残件は [PROJECT](docs/PROJECT.md) と [STATUS](docs/STATUS.md) に記録します。
- 完了した依頼文・同じ検証結果の繰り返し・生ログを引き継ぎ文書に積み上げず、次の判断に必要な根拠を残します。
