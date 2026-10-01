# ききまるのおさんぽ

既存のパーツ素材を使った、Phaser＋TypeScript＋Viteの2Dブラウザゲームです。

## 目的別の入口

| 知りたいこと | 正本 |
|---|---|
| 現在の到達点・確認状況・未実装の構想 | [STATUS](docs/STATUS.md) |
| 開発環境を準備する | [SETUP](docs/SETUP.md) |
| デモを起動して遊ぶ | [RUN](docs/RUN.md) |
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
| ステージごとの背景・スクロール倍率・継ぎ目補正・障害物の種類／配置／寸法 | [stages.ts](src/stages.ts) |
| 反復位置・長距離移動時の座標補正 | [scrolling.ts](src/scrolling.ts) |
| 固定障害物の表示・物理ボディ・座標補正 | [FixedObstacles.ts](src/FixedObstacles.ts) |

## フォルダの役割

- `src/`：現行ゲーム。入口は `index.html` → `main.ts`。`scenes/` はPhaserのシーン。
- `src/kikimaru-assets/`：現行コードが参照する素材と仕様。
- `tests/`：入力・移動ロジックのテスト。
- `docs/`：上記の目的別文書。
- `.github/`：Agent共通指示・CIなどの運用設定。
- `git-setup/`・`docker/`：既存のGit・セキュリティ検査用の補助環境。
- `archive/`：旧デモ・過去資料。通常の開発対象・仕様の正本ではありません。履歴を調べる場合のみ [案内](archive/README.md) を参照。
