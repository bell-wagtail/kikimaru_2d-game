# GitHub Pagesで公開・更新する

対象リポジトリは [bell-wagtail/kikimaru_2d-game](https://github.com/bell-wagtail/kikimaru_2d-game) です。公開先は [ききまるのおさんぽ](https://bell-wagtail.github.io/kikimaru_2d-game/) です。2026-10-03の初回配信と公開URLの表示を確認済みです。2026-10-04にユーザーが `main` 反映後の自動配信を確認しました。

配信処理・対象ブランチ・権限・公開パスの正本は [pages.yml](../.github/workflows/pages.yml) です。標準のプロジェクトURLを対象にし、独自ドメインやユーザーサイトのルートへの配信は今回の対象外です。

Git操作・ブランチ運用・公開の実行範囲は [共通指示の作業合意](../.github/copilot-instructions.md#git操作ブランチ運用公開の合意) に従います。本書は操作方法を示し、Agentへの実行許可を与えるものではありません。初回公開で行った作業ブランチからmainへの直接マージは、正式なブランチ戦略として採用しません。

## 配信の前提

1. 合意したブランチ運用で変更を確認します。`main` へのPRではSecurity Scan・依存監査・単体テスト・型チェック付きビルドを行います。必須の `GitHub Pages / build` が成功し、保護ルールのレビュー条件も満たした場合だけ `main` へマージします。PR時に配信はしません。
2. Settings → Pages → Build and deployment → Sourceは **GitHub Actions** を選択します。`github-pages` Environmentの配信ブランチは `main` だけを許可します。専用のアクセストークンやSecretsの登録は不要です。
3. `main` の保護と書き込み権限者は [保護設定の手順](../git-setup/README.md#mainブランチの保護) に従ってユーザーが管理します。Actionsのチェック成功だけでPRをマージ可能にしないよう、承認・最新push後の再承認・管理者への適用を維持します。承認者は特に `.github/workflows/`、依存定義とロックファイル、`docker/` の変更を確認します。

## 自動更新

`main` にマージされると **GitHub Pages** ワークフローが自動起動します。Security Scanの両ジョブが成功し、依存監査・単体テスト・型チェック付きビルドが成功した場合だけ生成済み成果物を配信します。どこかで失敗した場合、`deploy` は実行されず公開済みの版が残ります。`develop` へのpushでは配信しません。

Actionsの `security / semgrep`、`security / gitleaks`、`build`、`deploy` の成功を確認し、`deploy` のEnvironmentに表示されるURLを開きます。ゲームの表示・開始・移動・ジャンプ・音声・クイズ・ゴール結果を確認します。スマホでの実機確認は [CHECKS](CHECKS.md) を参照してください。

自動実行が失敗した場合は原因を修正して、保護された経路で `main` へ再反映します。必要なときはActions → **GitHub Pages** → **Run workflow** から `main` を選び、手動で同じ検査と配信を再実行できます。`main` 以外を選んでもbuild・deployは実行しません。AgentによるGit操作や配信実行には上記の作業合意が適用されます。

## 配信する内容

Actionsの新しいチェックアウトでmiseの指定ツールを導入し、ロックファイルどおりの既存依存を導入します。インストール時のスクリプトは実行しません。Security Scan・依存監査・単体テスト・型チェック付きビルドが成功したときだけ、生成した `dist` をアップロードします。古いローカル生成物は使わず、`dist` のGit管理も不要です。

Pagesが配信するのはゲームのHTML・JavaScript・CSS・画像・音源です。開発サーバーやテストページ・文書・旧資料は配信しません。GitHubの公開リポジトリ内のソース・文書・履歴は、Pagesとは別にGitHubで閲覧できます。

ローカルのmise・依存関係・通常起動の接続設定は変更しません。音声は公開後もブラウザの初回操作が必要で、ページを開いただけでは鳴りません。

## 配信に失敗した場合

- `security`：Semgrep・gitleaksのログとレポートを確認します。検査が失敗・中断された場合、必須の `build` も失敗します。
- `build`：Node.jsの指定、依存の整合性、依存監査、単体テスト、型チェックのどこで失敗したかをActionsのログで確認します。指定を最新版へ変更して回避しません。
- `Configure Pages`：Settings → PagesのSourceがGitHub Actionsになっているか確認します。
- `deploy`：Actionsの権限と `github-pages` Environmentのブランチ制限・承認待ちを確認します。
- 画像・音源の404：公開URLの末尾 `/` と、プロジェクト名を含むビルドパスを確認します。独自ドメインを追加する場合はパス設定を見直します。

参考：[Vite公式のGitHub Pages配信](https://vite.dev/guide/static-deploy#github-pages)、[GitHub公式のカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[再利用ワークフロー](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)、[手動ワークフローの実行条件](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-running-a-workflow)。
