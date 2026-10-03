# GitHub Pagesで公開・更新する

対象リポジトリは [bell-wagtail/kikimaru_2d-game](https://github.com/bell-wagtail/kikimaru_2d-game) です。公開先は [ききまるのおさんぽ](https://bell-wagtail.github.io/kikimaru_2d-game/) です。2026-10-03の初回配信と公開URLの表示を確認済みです。以後の配信成功は、Actionsの配信結果とSettings → Pagesで確認します。

配信処理・対象ブランチ・権限・公開パスの正本は [pages.yml](../.github/workflows/pages.yml) です。標準のプロジェクトURLを対象にし、独自ドメインやユーザーサイトのルートへの配信は今回の対象外です。

Git操作・ブランチ運用・公開の実行範囲は [共通指示の作業合意](../.github/copilot-instructions.md#git操作ブランチ運用公開の合意) に従います。本書は操作方法を示し、Agentへの実行許可を与えるものではありません。初回公開で行った作業ブランチからmainへの直接マージは、正式なブランチ戦略として採用しません。

## 初回の準備

1. 既存のブランチ運用に沿って準備内容を統合します。履歴では作業ブランチをdevelopへ統合しています。基点・PRの統合先・developからmainへのリリース経路を確認し、実行するGit操作をユーザーと合意します。
2. PRの `GitHub Pages / build` が成功していることを確認します。この段階では公開しません。ローカルでのWebGL／Canvas・配信用ビルドの確認は [CHECKS](CHECKS.md) を参照してください。
3. リリース内容を確認し、合意した経路で既定ブランチへ反映します。GitHubの手動実行ワークフローは既定ブランチに置く必要がありますが、作業ブランチから直接マージする必要はありません。
4. リポジトリのSettings → Pages → Build and deployment → Sourceで **GitHub Actions** を選択します。専用のアクセストークンやSecretsの登録は不要です。
5. `github-pages` Environmentに配信ブランチの制限がある場合は、既定ブランチを許可します。

## 初回公開・更新

1. Actions → **GitHub Pages** → **Run workflow** を開き、既定ブランチを選んで実行します。
2. `build` と `deploy` の成功を確認します。`deploy` のEnvironmentに表示されるURLを開きます。
3. ゲームの表示・開始・移動・ジャンプ・音声・クイズ・ゴール結果を確認します。スマホでも同じURLを開けます。タッチの実機確認は [CHECKS](CHECKS.md) を参照してください。

公開後も、合意したブランチ運用で変更を確認して既定ブランチへ反映し、公開操作の明示的な依頼がある場合に同じ手動実行で更新します。pushやPRだけでは公開内容を変更しません。手動実行で既定ブランチ以外を選んだ場合も、buildとdeployは実行しません。

## 配信する内容

Actionsの新しいチェックアウトでmiseの指定ツールを導入し、ロックファイルどおりの既存依存を導入します。単体テストと型チェック付きビルドが成功したときだけ、生成した `dist` をアップロードします。古いローカル生成物は使わず、`dist` のGit管理も不要です。

Pagesが配信するのはゲームのHTML・JavaScript・CSS・画像・音源です。開発サーバーやテストページ・文書・旧資料は配信しません。GitHubの公開リポジトリ内のソース・文書・履歴は、Pagesとは別にGitHubで閲覧できます。

ローカルのmise・依存関係・通常起動の接続設定は変更しません。音声は公開後もブラウザの初回操作が必要で、ページを開いただけでは鳴りません。

## 配信に失敗した場合

- `build`：Node.jsの指定、依存の整合性、単体テスト、型チェックのどこで失敗したかをActionsのログで確認します。指定を最新版へ変更して回避しません。
- `Configure Pages`：Settings → PagesのSourceがGitHub Actionsになっているか確認します。
- `deploy`：Actionsの権限と `github-pages` Environmentのブランチ制限・承認待ちを確認します。
- 画像・音源の404：公開URLの末尾 `/` と、プロジェクト名を含むビルドパスを確認します。独自ドメインを追加する場合はパス設定を見直します。

参考：[Vite公式のGitHub Pages配信](https://vite.dev/guide/static-deploy#github-pages)、[GitHub公式のカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[手動ワークフローの実行条件](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-running-a-workflow)。
