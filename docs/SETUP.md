# Windows開発環境の準備

目的：miseで指定したNode.jsを用意し、ロックファイルどおりにゲームの依存関係を導入する。
実行者はユーザーです。各段階の成功を確認してから次へ進んでください。

## 1. miseを導入する（PCで最初の1回）

PowerShellで実行します。miseが導入済みならインストールは省略します。

```powershell
winget --version
winget install --id jdx.mise --exact --source winget
```

PowerShellを開き直します。エディタ内のターミナルを使う場合はエディタも再起動します。

```powershell
mise --version
```

バージョンが表示されれば導入完了です。`winget` が見つからない場合はWindowsの「アプリ インストーラー」を確認してください。
参考：[mise公式・Windowsへの導入](https://mise.jdx.dev/installing-mise.html#windows-winget)

## 2. プロジェクトの設定を確認する

以降は、`src` ではなくプロジェクトルートで実行します。

```powershell
Set-Location -LiteralPath 'D:\work\029_BellFloworks\11_2d-game'
Get-Content -LiteralPath .\mise.toml
Get-Content -LiteralPath .\package.json
Get-Content -LiteralPath .\.npmrc
Test-Path -LiteralPath .\package-lock.json
```

使用バージョンは [mise.toml](../mise.toml)・[package.json](../package.json)、解決済み依存は [package-lock.json](../package-lock.json) が正本です。
最後の出力が `True` であることを確認します。既存設定を使用するので、プロジェクトの再生成や最新版への更新は不要です。

## 3. mise管理のNode.jsを用意する

内容を確認した設定を信頼対象に登録し、指定されたNode.jsを導入します。

```powershell
mise trust .\mise.toml
mise install
mise exec -- node --version
mise exec -- node -p "process.execPath"
mise exec -- where.exe npm.cmd
mise exec -- npm.cmd --version
```

- Node.jsのバージョンが `mise.toml` と一致すること。
- Node.jsの実行場所と、最初に見つかる `npm.cmd` がmise管理領域を指すこと。

既存のホストNode.jsが選ばれていれば、作業場所と設定を確認してから進みます。
毎回 `mise exec --` を付ける運用なので、PowerShellプロファイルへの追加設定は不要です。
`npm.cmd` を使うため、`npm.ps1` のために実行ポリシーを変更する必要もありません。
参考：[mise公式・Node.js](https://mise.jdx.dev/lang/node.html)

## 4. 依存関係を導入する

**`npm ci` は既存の `node_modules` があれば置き換えます。** ソースとロックファイルは変更しません。

```powershell
mise exec -- npm.cmd --cache .npm-cache ci --ignore-scripts
mise exec -- npm.cmd --cache .npm-cache ls --depth=0
mise exec -- npm.cmd --cache .npm-cache config get ignore-scripts
mise exec -- npm.cmd --cache .npm-cache config get cache
```

直接依存が `package.json` と一致し、`ignore-scripts` が `true`、キャッシュがプロジェクト内の `.npm-cache` を指すことを確認します。これで環境準備は完了です。

Node.js本体はmiseの管理領域、ゲームの依存は `node_modules/` に配置されます。
キャッシュ指定はコマンドごとに必要です。ゲームのツールをグローバル導入する必要はありません。
ロックとの不一致や導入エラーが出た場合はそこで止め、設定を確認します。ロック削除やスクリプト制限の一括解除で回避しないでください。
参考：[npm公式・npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
