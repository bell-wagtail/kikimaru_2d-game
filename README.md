# ききまるのおさんぽ

既存のパーツ素材を使った、Phaser＋TypeScript＋Viteの2Dブラウザゲームです。

## 目的別の入口

| 知りたいこと | 正本 |
|---|---|
| 現在の到達点・確認状況・次セッションの2段階の依頼文 | [STATUS](docs/STATUS.md) |
| 開発環境を準備する | [SETUP](docs/SETUP.md) |
| デモを起動して遊ぶ | [RUN](docs/RUN.md) |
| 文字マップで岩・穴・アイテム・スタート・ゴールの配置を編集する | [STAGES](docs/STAGES.md) |
| 変更後に検証する | [CHECKS](docs/CHECKS.md) |
| 素材の仕様・組み込み上の制約 | [素材README](src/kikimaru-assets/README.md) |
| Agentの作業ルール | [共通指示](.github/copilot-instructions.md)（Codexの入口は [AGENTS.md](AGENTS.md)） |

## 数値・設定の正本（SSoT）

説明書には設定値を複製せず、次のファイルを参照します。変更時は正本を更新してください。

| 情報 | 正本 |
|---|---|
| Node.jsのバージョン | [mise.toml](mise.toml) |
| 直接依存・実行コマンド | [package.json](package.json) |
| 解決済み依存関係・整合性情報 | [package-lock.json](package-lock.json) |
| npmの導入方針 | [.npmrc](.npmrc) |
| サーバー・ビルドの設定 | [vite.config.js](vite.config.js) |
| 画像パス・実寸・切り出し情報 | [manifest.json](src/kikimaru-assets/manifest.json) |
| キャラクターの配置・描画順・初期色 | [rig-layout.json](src/kikimaru-assets/rig-layout.json) |
| 移動・ジャンプの定数 | [movement.ts](src/movement.ts) |
| ステージごとの背景・スクロール倍率・継ぎ目補正・文字マップの対応／マス寸法／原点・座標指定 | [stages.ts](src/stages.ts) の `STAGES` / `STAGE_MAP_GRID` / `TRAIL_MAP_GRID` |
| 文字マップによる岩・穴・アイテムの配置 | [現行マップ](src/stage-maps/tea-river.txt)・[寄り道マップ](src/stage-maps/tea-river-trail.txt) |
| 文字マップの記号・座標への変換 | [stageMap.ts](src/stageMap.ts) |
| スタート・ゴールの記号・足元位置・安全な足場の検証 | [endpoints.ts](src/endpoints.ts) |
| スタート・ゴールの表示と接触・座標補正・専用演出の設定 | [stageEndpoints.ts](src/stageEndpoints.ts) |
| 開始・結果・再挑戦の画面 | [MilestoneOverlay.ts](src/MilestoneOverlay.ts) |
| ゴール結果の一度だけの確定と記録 | [playResult.ts](src/playResult.ts) |
| 音源とゲームイベントの対応・長さ・相対音量・既定音量・BGMの曲長 | [audioDefinition.ts](src/audioDefinition.ts) |
| オリジナル音源の楽譜・音色・音合成・ループ端処理・WAV形式 | [audioSynthesis.ts](src/audioSynthesis.ts) |
| 音源の出自と再生成方針 | [音源README](src/audio-assets/README.md) |
| 音声の開始・クイズ・ゴール・リセット・ミュート・フォーカスの再生方針 | [audioSession.ts](src/audioSession.ts) |
| 音源読み込み・Phaser再生・初回操作の解放・再生失敗とシーン終了の処理 | [WalkAudio.ts](src/WalkAudio.ts) |
| 音量・ミュートの操作画面 | [AudioControls.ts](src/AudioControls.ts) |
| アイテムの種類・素材キー・文字マップ記号・効果・持続時間・名前・発光色と大きさ | [items.ts](src/items.ts) の `ITEM_TYPES` |
| プレイヤーの能力・残り時間 | [powerUps.ts](src/powerUps.ts) |
| アイテムの表示・取得済み状態・取得判定・座標補正 | [StageItems.ts](src/StageItems.ts) |
| スコアの初期値・下限・能力付き／種類ごとの配点・クイズの正誤配点・配置からの満点計算と上限制御 | [score.ts](src/score.ts) の `SCORE_RULES` / `stageTotals` / `ScoreState` |
| クイズの問題文・4択・正解・一文豆知識・出典URL | [quizData.ts](src/quizData.ts) の `QUIZ_QUESTIONS` |
| 未出題からのランダム出題・一巡と出題履歴・選択肢の並べ替え・回答済み状態・プレイ中の回答数と正答数 | [quiz.ts](src/quiz.ts) |
| クイズの選択肢・正誤と正解・点数変化・豆知識・再開ボタン | [QuizOverlay.ts](src/QuizOverlay.ts) |
| 取得・終了通知の時間、終了前の明滅周期、発光の透明度・中心高さ | [feedback.ts](src/feedback.ts) の `ITEM_FEEDBACK` |
| キャラクターに追従する円形発光・画面に固定する短い通知 | [ItemFeedback.ts](src/ItemFeedback.ts) |
| ダッシュのスピード線の色・太さ・長さ・本数・流れる速さ | [dashFeedback.ts](src/dashFeedback.ts) の `DASH_FEEDBACK` |
| 実際の横速度に応じたスピード線の表示・追従 | [SpeedLines.ts](src/SpeedLines.ts) |
| 反復位置・長距離移動時の座標補正 | [scrolling.ts](src/scrolling.ts) |
| 固定障害物の表示・物理ボディ・座標補正 | [FixedObstacles.ts](src/FixedObstacles.ts) |
| 穴の表示・床の物理ボディ・座標補正・落下判定の基準 | [StageGround.ts](src/StageGround.ts) |
| 地面と穴に共通の色・草の帯・土の模様・描画用テクスチャ | [groundTextures.ts](src/groundTextures.ts) |
| 穴の定義と床区間・着地条件の計算 | [ground.ts](src/ground.ts) |

## フォルダの役割

- `src/`：現行ゲーム。入口は `index.html` → `main.ts`。`scenes/` はPhaserのシーン。
- `src/stage-maps/`：ステージごとの文字マップ。
- `src/audio-assets/`：このゲーム用に合成したBGM・効果音。`scripts/generate-audio.mjs` で再生成します。
- `src/kikimaru-assets/`：現行コードが参照する素材と仕様。
- `tests/`：入力・移動・地形・アイテム・演出の単体テストと、Phaser上の結合テスト。
- `docs/`：上記の目的別文書。
- `.github/`：Agent共通指示・CIなどの運用設定。
- `git-setup/`・`docker/`：既存のGit・セキュリティ検査用の補助環境。
- `archive/`：旧デモ・過去資料。通常の開発対象・仕様の正本ではありません。履歴を調べる場合のみ [案内](archive/README.md) を参照。
