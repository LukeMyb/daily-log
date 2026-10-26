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
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSave = async () => {
    if (!date) return;

    setIsSaving(true);
    setStatusMessage(null);

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
      setStatusMessage({ type: "success", text: "保存しました" });
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="flex-1 flex flex-col h-full bg-zinc-900 min-w-0">
      {/* 上部ツールバー：日付選択と保存ボタン */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <label
            htmlFor="diary-date"
            className="text-sm font-medium text-zinc-400"
          >
            日付
          </label>
          <input
            id="diary-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStatusMessage(null);
            }}
            suppressHydrationWarning
            className="p-2.5 bg-[#27272a] rounded-md font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors [color-scheme:dark]"
          />
        </div>

        <div className="flex items-center gap-3">
          {statusMessage && (
            <span
              className={`text-sm ${
                statusMessage.type === "success"
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {statusMessage.text}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !date}
            className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center shrink-0 ${
              isSaving || !date
                ? "bg-[#27272a] text-zinc-600 cursor-not-allowed"
                : "bg-[#27272a] hover:bg-zinc-700 text-zinc-200 hover:text-white cursor-pointer"
            }`}
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
            if (statusMessage) setStatusMessage(null);
          }}
          placeholder="今日の日記を入力..."
          className="w-full flex-1 resize-none p-4 bg-[#27272a] rounded-md text-base leading-relaxed text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
    </section>
  );
}
