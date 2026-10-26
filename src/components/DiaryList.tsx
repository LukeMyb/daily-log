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
    <aside className="w-[340px] shrink-0 border-r border-zinc-800 bg-[#1E1E1E] flex flex-col h-full select-none">
      {/* 上部：検索窓UI（Step 3で検索ロジック実装予定） */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex flex-row gap-2 w-full">
          <div className="relative grow flex items-center">
            <input
              type="text"
              placeholder="キーワードを入力..."
              className="p-2.5 bg-[#27272a] rounded-md text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 w-full min-w-0"
            />
          </div>
          <button
            type="button"
            className="p-2.5 bg-[#27272a] hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-md transition-colors flex items-center justify-center shrink-0"
            title="検索"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
      </div>

      {/* エクスプローラー詳細表示風の列ヘッダー */}
      <div className="grid grid-cols-[105px_1fr] gap-2 px-3 py-2 border-b border-white/10 bg-zinc-900/60 text-xs font-medium text-zinc-400">
        <span>日付</span>
        <span>本文プレビュー</span>
      </div>

      {/* 一覧リスト */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-zinc-500">読み込み中...</div>
        ) : diaries.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">
            日記はまだありません
          </div>
        ) : (
          diaries.map((diary) => (
            <div
              key={diary.date}
              className="grid grid-cols-[105px_1fr] gap-2 items-center px-3 py-3 border-b border-white/5 last:border-0 hover:bg-zinc-800 transition-colors"
            >
              <span className="font-mono text-xs text-zinc-400 shrink-0">
                {diary.date}
              </span>
              <span className="truncate text-sm text-zinc-200">
                {formatPreview(diary.content)}
              </span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
