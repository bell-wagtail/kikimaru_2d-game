# Windows環境準備手順書 — mise / Phaser / TypeScript / Vite

作成日：2026-09-28

この手順は、利用者がPowerShellで順番に実行するためのものです。
既存の設定・ソース・ロックファイルを使い、miseでNode.jsを選択してから依存関係を準備します。
各コマンドが成功したことを確認してから次へ進んでください。

## 1. 今回用意する環境

| 対象 | 採用バージョン | 管理するファイル |
|---|---|---|
| Node.js | 24.17.0 | `mise.toml` |
| Phaser | 3.90.0 | `package.json` / `package-lock.json` |
| TypeScript | 5.9.3 | `package.json` / `package-lock.json` |
| Vite | 8.3.1 | `package.json` / `package-lock.json` |
| npm | miseで導入するNode.jsに付属するもの | 導入後にバージョン・実行場所を確認 |

これは現在のファイルに記載されたバージョンです。最新版への更新を行う手順ではありません。

配置先は次のように分かれます。

- mise本体・mise管理のNode.js：プロジェクト外のツール管理領域。
- ゲームの依存関係：このプロジェクトの `node_modules/`。
- この手順で使用するnpmキャッシュ：このプロジェクトの `.npm-cache/`。
- ビルド結果：このプロジェクトの `dist/`。

Phaser・TypeScript・Viteのグローバルインストールは行いません。
既存のNode.jsをアンインストールする必要もありません。
Python・Docker・WSLは、このゲームの起動には不要です。

## 2. miseを導入する（PCで最初の1回）

PowerShellを開き、Windows Package Managerが使えることを確認します。

```powershell
winget --version
```

使える場合は、miseを導入します。

```powershell
winget install --id jdx.mise --exact --source winget
```

インストール後、PowerShellを閉じて開き直します。VS Code内のターミナルで作業する場合は、VS Codeも再起動してください。

```powershell
mise --version
```

miseのバージョンが表示されたら次へ進みます。
すでにmiseが導入されている場合は、インストールを繰り返さず、この確認から始めてください。

`winget`が見つからない場合は、Microsoftの「アプリ インストーラー」の導入状況を確認してください。
Scoopをすでに利用している場合は、公式の別経路である `scoop install mise` も選べます。両方の方法で重複導入する必要はありません。

参考：[mise公式・Windowsへの導入](https://mise.jdx.dev/installing-mise.html#windows-winget)

## 3. プロジェクトへ移動し、設定を確認する

以降のコマンドは、すべて `11_2d-game` 直下で実行します。`src` 内ではありません。

```powershell
Set-Location -LiteralPath 'D:\work\029_BellFloworks\11_2d-game'
Get-Content -LiteralPath .\mise.toml
Get-Content -LiteralPath .\package.json
Get-Content -LiteralPath .\.npmrc
Test-Path -LiteralPath .\package-lock.json
```

確認する内容：

- `mise.toml` のNode.jsが `24.17.0`。
- `package.json` の3つの直接依存が上の表と一致。
- `.npmrc` に `ignore-scripts=true`、`save-exact=true`、`engine-strict=true`、公式npmレジストリの指定がある。
- 最後の出力が `True`。ロックファイルがない場合はここで止め、配置を確認する。

既存の設定ファイルがあるので、`npm init`、`npm create vite`、`mise use ...@latest` は不要です。

## 4. mise管理のNode.jsを導入・確認する

内容を確認した、このプロジェクトのmise設定を信頼対象に登録します。

```powershell
mise trust .\mise.toml
mise install
```

続いて、バージョンだけでなく実行ファイルの場所も確認します。

```powershell
mise exec -- node --version
mise exec -- node -p "process.execPath"
mise exec -- where.exe npm.cmd
mise exec -- npm.cmd --version
```

確認する内容：

- Node.jsは `v24.17.0`。
- `process.execPath` はmiseの管理領域にあるNode.jsを指す。
- `where.exe npm.cmd` の最初の候補は、そのNode.jsに付属するnpmを指す。
- npmのバージョンが表示される。

既存の `C:\Program Files\nodejs\node.exe` が選ばれている場合は、まだ意図した環境ではありません。依存関係の準備へ進まず、設定と作業ディレクトリを確認してください。
複数のnpm候補が表示されても、最初の候補がmise管理下なら構いません。

この手順では、毎回 `mise exec --` を付けます。PowerShellプロファイルの変更や `mise activate` は不要です。
`npm.cmd` を指定するため、`npm.ps1` のためにPowerShellの実行ポリシーを変更する必要もありません。

参考：[mise公式・Node.js](https://mise.jdx.dev/lang/node.html)、[設定の信頼](https://mise.jdx.dev/cli/trust.html)、[mise exec](https://mise.jdx.dev/cli/exec.html)

## 5. ロックファイルから依存関係を準備する

**このコマンドは、既存の `node_modules` があれば置き換えます。**
途中まで作成した依存ファイルを、mise管理のNode.jsでロックファイルどおりに再構築するための操作です。
ソースや `package-lock.json` は書き換えません。手作業でのフォルダ削除は不要です。

```powershell
mise exec -- npm.cmd --cache .npm-cache ci --ignore-scripts
```

`ci` は `package-lock.json` に記録された依存関係を導入します。
Phaserなどを個別に `npm install` する必要はありません。
`--ignore-scripts` は依存パッケージのインストール時スクリプトを抑止します。

導入後、直接依存と設定を確認します。

```powershell
mise exec -- npm.cmd --cache .npm-cache ls --depth=0
mise exec -- npm.cmd --cache .npm-cache config get ignore-scripts
mise exec -- npm.cmd --cache .npm-cache config get cache
```

確認する内容：

- `phaser@3.90.0`、`typescript@5.9.3`、`vite@8.3.1` が表示される。
- `ignore-scripts` が `true`。
- キャッシュの場所が `11_2d-game\.npm-cache` を指す。

キャッシュ指定はコマンドごとの指定です。この手順のnpmコマンドでは毎回付けています。
`node_modules/`・`.npm-cache/`・`dist/` は、既存の `.gitignore` でGit管理対象外になっています。

参考：[npm公式・npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

## 6. 検証して開発サーバーを起動する

```powershell
mise exec -- npm.cmd --cache .npm-cache run check
mise exec -- npm.cmd --cache .npm-cache test
mise exec -- npm.cmd --cache .npm-cache run build
```

型チェック・テスト・ビルドが成功したら起動します。

```powershell
mise exec -- npm.cmd --cache .npm-cache run dev
```

PowerShellは起動したままにして、ブラウザで [開発画面](http://127.0.0.1:5173/) を開きます。
停止するときは、起動したPowerShellで **Ctrl+C** を押してください。

現在の途中実装では、次の操作を確認する想定です。

- 左右矢印キー / A・D：移動。
- Space：ジャンプ。移動との同時操作が可能。
- 画面左下の矢印：移動。右下のボタン：ジャンプ。
- 「まんなかに戻る」：開始位置へ戻る。

**Phaser版はHTMLのダブルクリックでは起動しません。** `file:///.../index.html` の古いタブではなく、上の開発画面を開いてください。
サーバーは `127.0.0.1` のみに接続を受け付ける設定です。このままでは別のスマホから接続できません。スマホでの実機確認用の設定は別途扱います。

## 7. 次回からの起動

初回の準備が済んだ後は、この2行で起動できます。

```powershell
Set-Location -LiteralPath 'D:\work\029_BellFloworks\11_2d-game'
mise exec -- npm.cmd --cache .npm-cache run dev
```

依存関係を変更していなければ、毎回 `npm ci` を実行する必要はありません。

## 8. 既存ファイルと確認済み範囲

| ファイル・フォルダ | 現在の役割 |
|---|---|
| `mise.toml` | Node.jsの固定バージョン |
| `package.json` / `package-lock.json` / `.npmrc` | 依存関係・コマンド・インストール方針 |
| `vite.config.js` / `tsconfig.json` | ViteとTypeScriptの設定 |
| `src/index.html` / `src/main.ts` / `src/scenes/WalkScene.ts` | Phaser版の途中実装 |
| `src/input.ts` / `src/movement.ts` / `tests/` | 入力・移動処理とテスト |
| `src/kikimaru-assets/` | 既存画像素材 |
| `src/legacy.html` / `src/game.js` / `src/rig-data.js` | 以前の左右移動デモ。Phaser版からは読み込まない |
| `README.md` | 以前のデモの説明。新しい環境の起動は本手順書を参照 |

旧デモを参照する場合は `src/legacy.html` をブラウザで開けます。既存ファイルはそのまま残して構いません。

手順書作成前の作業では、既存のNode.js 24.17.0 / npm 11.17.0を使い、インストール時スクリプトを無効にした導入・6件のテスト・型チェック・ビルドが成功しました。
**mise経由の導入と、Phaser版のブラウザ操作・スマホ実機確認は未実施です。** これらを実行済みとみなさず、上記の手順で確認してください。

## 9. つまずいた場合

| 状況 | 対応 |
|---|---|
| `mise` が見つからない | 導入後にPowerShell・エディタを開き直す。まだ見つからない場合は導入状況を確認 |
| Node.jsのバージョンや場所が異なる | `11_2d-game` にいるか、`mise exec --` を付けているか確認 |
| `npm ci` が設定とロックの不一致で停止 | 両ファイルの組み合わせを確認。ロックファイルの削除や最新依存の再導入で回避しない |
| インストール・ビルドが失敗 | エラーメッセージを確認。`ignore-scripts` を一括解除せず、必要な対応を個別に判断 |
| ポート5173が使用中 | 既存の開発サーバーがあれば、そのターミナルで停止。起動済みか不明なプロセスは終了しない |
| ビルドで大きなチャンクの警告 | Phaser本体のサイズによる警告が出る場合がある。ビルド成功か失敗かを終了結果で確認 |

`dist/` は現在の設定ではビルド時に自動消去されません。繰り返しビルドすると古い生成ファイルが残る場合があります。公開用成果物の整理は公開準備時に行います。
