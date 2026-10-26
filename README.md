# daily-log

シンプルな日記Webアプリケーションです。  
PCでは一覧とエディタを並べた2ペイン表示、スマートフォンでは1ペイン切り替え表示で快適に日記を記録・検索・閲覧できます。

---

## 主な機能

- **日記の保存・上書き更新（1日1件）**: 日付（`YYYY-MM-DD`）を主キーとして保存・更新（Upsert）
- **日付降順の一覧表示**: 左ペインに日付と本文プレビュー（1行）をエクスプローラー詳細表示風に一覧化
- **日付連動の自動読み込み**: 一覧の行クリックや日付ピッカーの変更に応じて、該当日の日記を自動読み込み
- **キーワード検索**: 本文や日付に対するリアルタイム絞り込み検索（クリアボタン付き）
- **日記の削除**: 誤操作を防ぐ確認モーダルダイアログ付きの削除機能
- **レスポンシブ対応**: PC（`768px` 以上）は左右2ペイン同時表示、スマホ（`768px` 未満）は「編集画面 ⇔ 一覧画面」の1ペイン切り替え表示
- **PWA（Progressive Web App）対応**: スマホの「ホーム画面に追加」からネイティブアプリのように起動可能

---

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router) / React 19 / TypeScript
- **スタイリング**: Tailwind CSS v4（ダークテーマ基調）
- **ORM / データベース**: Prisma v6 + SQLite

---

## 環境変数（`.env`）

プロジェクトルートの `.env` にデータベース接続先および待受けホスト・ポートを設定します。

```env
DATABASE_URL="file:./diary.db"
HOST="0.0.0.0"
PORT="3000"
```

> Tailscale 等を経由してスマホから自宅PCへアクセスする場合は、`HOST` に Tailscale の IPv4 アドレス、または `0.0.0.0` を指定してください。

---

## セットアップ・起動方法

### 1. 初回セットアップ（別環境へ移行した場合）

```bash
npm install
npx prisma migrate dev
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

`.env` の `HOST` と `PORT` を読み込んで起動します。

### 3. 本番ビルドと起動（自宅サーバー稼働）

```bash
npm run build
npm run start
```

### 4. Windows バックグラウンド起動（VBScript）

事前に `npm run build` を実行した上で、プロジェクトルートの **`start_daily-log.vbs`** をダブルクリックすると、コマンドプロンプト画面を表示せずにバックグラウンドで本番サーバーが起動します。

- **PC起動時の自動起動**: `Win + R` → `shell:startup` で開くスタートアップフォルダに `start_daily-log.vbs` のショートカットを配置します。
- **停止方法**: タスクマネージャーから `node.exe` を終了するか、以下を実行します。
  ```powershell
  taskkill /F /IM node.exe
  ```

---

## スマホでのPWA利用（ホーム画面に追加）

1. スマホのブラウザから `http://<HOST>:<PORT>` にアクセスします。
2. ブラウザのメニュー（iOS Safari は「共有」ボタン、Android Chrome は右上メニュー）から **「ホーム画面に追加」** を選択します。
3. ホーム画面に追加された `DL`（`daily-log`）アイコンからいつでも起動できます。

---

## ディレクトリ構造

```text
.
├── README.md                             # 本ドキュメント
├── start_daily-log.vbs                   # Windows バックグラウンド起動用スクリプト
├── public/
│   └── sw.js                             # PWA用 Service Worker
├── prisma/
│   └── schema.prisma                     # Prisma スキーマ定義 (Diaryモデル)
└── src/
    ├── lib/
    │   └── prisma.ts                     # PrismaClient シングルトン
    ├── components/
    │   ├── DiaryList.tsx                 # 左ペイン：日記一覧・キーワード検索
    │   └── DiaryEditor.tsx               # 右ペイン：日付選択・本文入力・保存・削除
    └── app/
        ├── api/
        │   └── diaries/
        │       ├── route.ts              # 一覧取得・検索(GET) / 保存・更新(POST)
        │       └── [date]/
        │           └── route.ts          # 特定日の取得(GET) / 削除(DELETE)
        ├── manifest.ts                   # PWA Web App Manifest
        ├── icon.tsx                      # アプリアイコン生成 (512x512)
        ├── apple-icon.tsx                # iOS ホーム画面用アイコン生成 (180x180)
        ├── page.tsx                      # メイン画面（2ペイン / 1ペイン切替制御）
        ├── layout.tsx                    # ルートレイアウト・メタデータ設定
        └── globals.css                   # グローバルスタイル
```
