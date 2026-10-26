# daily-log 全体設計書（SPEC）

自分専用のシンプルな日記Webアプリ「daily-log」の設計仕様書および実装ロードマップです。

---

## 1. 技術スタック・環境

- **フレームワーク**: Next.js (App Router) + TypeScript
- **スタイリング**: Tailwind CSS
  - ダークテーマ基調（背景: `bg-zinc-900` / `bg-[#1E1E1E]`、入力欄・ボタン: `bg-[#27272a]`、ホバー: `hover:bg-zinc-700` / `hover:bg-zinc-800`、境界線: `border-zinc-800` / `border-white/5`、フォーカスリング: `focus:ring-2 focus:ring-blue-600`）
- **ORM / データベース**: Prisma v6 + SQLite（設定および初回マイグレーション完了済み）

---

## 2. データベース定義（`prisma/schema.prisma`）

- **モデル名**: `Diary`
  - `date`: `String` (`@id`) - `YYYY-MM-DD` 形式の文字列（主キー・1日1件の制約）
  - `content`: `String` - 日記の本文
  - `updatedAt`: `DateTime` (`@updatedAt`) - 更新日時

---

## 3. ディレクトリ構造

```text
.
├── SPEC.md                               # 全体設計書
├── prisma/
│   └── schema.prisma                     # Prismaスキーマ定義
└── src/
    ├── lib/
    │   └── prisma.ts                     # PrismaClientのシングルトン
    ├── components/
    │   ├── DiaryList.tsx                 # 左ペイン：日記の一覧表示（＋検索窓UI）
    │   └── DiaryEditor.tsx               # 右ペイン：日付選択＋本文入力＋保存（＋削除はStep 3）
    └── app/
        ├── api/
        │   └── diaries/
        │       ├── route.ts              # 一覧取得(GET) / 新規作成・上書き更新(POST)
        │       └── [date]/
        │           └── route.ts          # 特定日の取得(GET) / 削除(DELETE) ※Step 3で作成
        ├── page.tsx                      # メイン画面（左右2ペインの親）
        ├── layout.tsx                    # ルートレイアウト
        └── globals.css                   # グローバルスタイル
```

---

## 4. 実装ロードマップ

- **【Step 1】環境構築とDB構築**（完了済み）
  - Next.js (App Router / TypeScript / Tailwind CSS) 初期構築
  - Prisma v6 + SQLite のセットアップおよび初回マイグレーション
- **【Step 2】PC向け2ペイン画面と「保存・一覧表示」の実装**（現在）
  - `SPEC.md`、`src/lib/prisma.ts` の作成
  - `GET /api/diaries`（日付降順一覧取得）と `POST /api/diaries`（`upsert` による保存・更新）の実装
  - 左ペイン（`DiaryList`）と右ペイン（`DiaryEditor`）の2ペインUIおよび連携の実装
- **【Step 3】日付連動の自動読み込みと「削除・キーワード検索」の実装**
  - `src/app/api/diaries/[date]/route.ts`（特定日取得 `GET`・削除 `DELETE`）の作成
  - 日付変更時・一覧クリック時の本文自動読み込み
  - 日記の削除処理とキーワード検索ロジックの実装
- **【Step 4】スマホ画面（レスポンシブ切り替え）の最適化**
  - モバイル表示時のペイン切り替え・操作性の最適化
- **【Step 5】PWA対応と自宅サーバーでの本番稼働設定**
  - マニフェスト・アイコン等のPWA化とセルフホスト向け本番設定

---

## 5. 実装しない機能（スコープ外）

以下の機能はシンプルさを保つため実装しません。

- ログイン・認証機能
- カレンダーUI
- エクスポート機能
- 画像添付
- タグ付け
- Markdownプレビュー
