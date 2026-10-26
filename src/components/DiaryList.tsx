"use client";

export type DiaryItem = {
  date: string;
  content: string;
  updatedAt?: string;
};

type DiaryListProps = {
  diaries: DiaryItem[];
  isLoading?: boolean;
};

function formatPreview(content: string): string {
  const singleLine = content.replace(/\r?\n/g, " ").trim();
  if (singleLine.length > 30) {
    return `${singleLine.slice(0, 30)}...`;
  }
  return singleLine;
}

export default function DiaryList({ diaries, isLoading = false }: DiaryListProps) {
  return (
    <aside className="w-[320px] shrink-0 border-r border-zinc-200 bg-zinc-50 flex flex-col h-full select-none">
      {/* 上部：検索窓UI（Step 3で検索ロジック実装予定） */}
      <div className="p-3 border-b border-zinc-200 bg-zinc-100/70">
        <input
          type="text"
          placeholder="キーワード検索..."
          className="w-full rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {/* エクスプローラー詳細表示風の列ヘッダー */}
      <div className="grid grid-cols-[100px_1fr] gap-2 px-3 py-1.5 border-b border-zinc-200 bg-zinc-100 text-xs font-medium text-zinc-500">
        <span>日付</span>
        <span>本文プレビュー</span>
      </div>

      {/* 一覧リスト */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-200/70">
        {isLoading ? (
          <div className="px-3 py-4 text-xs text-zinc-400">読み込み中...</div>
        ) : diaries.length === 0 ? (
          <div className="px-3 py-4 text-xs text-zinc-400">
            日記はまだありません
          </div>
        ) : (
          diaries.map((diary) => (
            <div
              key={diary.date}
              className="grid grid-cols-[100px_1fr] gap-2 items-center px-3 py-2 text-sm hover:bg-zinc-100 transition-colors"
            >
              <span className="font-mono text-xs text-zinc-600 shrink-0">
                {diary.date}
              </span>
              <span className="truncate text-zinc-800">
                {formatPreview(diary.content)}
              </span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
