# 変更後の検証

前提：[環境準備](SETUP.md)が完了していること。検証結果はここに蓄積せず、[STATUS](STATUS.md)に記録します。

## 自動検証

プロジェクトルートで実行します。コマンド定義は [package.json](../package.json) の `scripts` が正本です。

```powershell
mise exec -- npm.cmd --cache .npm-cache run check
mise exec -- npm.cmd --cache .npm-cache test
mise exec -- npm.cmd --cache .npm-cache run build
```

- `check`：TypeScriptの型チェック。
- `test`：入力・移動のロジック検証。ブラウザ描画やPhaserの実際の物理動作を保証するテストではありません。
- `build`：型チェックを含む配信用ファイルの生成。出力先・消去方針は [vite.config.js](../vite.config.js) を参照。

変更内容に必要な検証だけを選びます。`build`を実行する場合、直前の`check`は省略できます。
Phaserのチャンクサイズ警告が出る場合は、ビルドの終了結果と区別して扱ってください。
現在は出力先を自動消去しない設定なので、公開前には古い生成ファイルの扱いを確認します。

## 手動確認

[起動・操作手順](RUN.md)に従ってデモを起動し、変更の影響がある項目を確認します。

- 左右移動・キーを離したときの停止・左右同時押し・画面端での停止。
- 地上からのジャンプ、着地、移動しながらのジャンプ。
- 押しっぱなしで自動連続ジャンプしないこと、空中で再ジャンプしないこと。
- 「まんなかに戻る」と、別タブ・別ウィンドウへ移った際の入力解除。
- タッチ対応を変更した場合は、移動とジャンプの同時操作をスマホ実機で確認。

ビルド結果を確認するときは、`build`の成功後に次を実行し、表示されるURLを開きます。これは公開操作ではありません。

```powershell
mise exec -- npm.cmd --cache .npm-cache run preview
```
