"use client";

import { useState } from "react";

type DiaryEditorProps = {
  onSaved: () => Promise<void> | void;
};

/**
 * ローカルタイムゾーン基準で今日の日付を YYYY-MM-DD 形式で取得する
 */
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DiaryEditor({ onSaved }: DiaryEditorProps) {
  const [date, setDate] = useState<string>(() => getTodayLocalDate());
  const [content, setContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleSave = async () => {
    if (!date) return;

    setIsSaving(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/diaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date, content }),
      });

      if (!response.ok) {
        throw new Error("保存に失敗しました");
      }

      await onSaved();
      setStatusMessage("保存しました");
    } catch (error) {
      console.error(error);
      setStatusMessage("エラー：保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="flex-1 flex flex-col h-full bg-white min-w-0">
      {/* 上部ツールバー：日付選択と保存ボタン */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-zinc-200 bg-zinc-50/50">
        <div className="flex items-center gap-3">
          <label htmlFor="diary-date" className="text-xs font-medium text-zinc-600">
            日付
          </label>
          <input
            id="diary-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStatusMessage("");
            }}
            suppressHydrationWarning
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          {statusMessage && (
            <span className="text-xs text-zinc-500">{statusMessage}</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !date}
            className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* 下部：本文入力用テキストエリア */}
      <div className="flex-1 flex flex-col p-6">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (statusMessage) setStatusMessage("");
          }}
          placeholder="今日の日記を入力..."
          className="w-full flex-1 resize-none rounded border border-zinc-200 bg-white p-4 text-base leading-relaxed text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
        />
      </div>
    </section>
  );
}
