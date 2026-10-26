"use client";

import { useEffect, useState } from "react";

type DiaryEditorProps = {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSaved: () => Promise<void> | void;
  onDeleted: () => Promise<void> | void;
};

/**
 * ローカルタイムゾーン基準で今日の日付を YYYY-MM-DD 形式で取得する
 */
export function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DiaryEditor({
  selectedDate,
  onDateChange,
  onSaved,
  onDeleted,
}: DiaryEditorProps) {
  const [content, setContent] = useState<string>("");
  const [existsInDb, setExistsInDb] = useState<boolean>(false);
  const [isLoadingDiary, setIsLoadingDiary] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 日付が変更されたら該当日の日記データを自動読み込みする
  useEffect(() => {
    if (!selectedDate) {
      setContent("");
      setExistsInDb(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingDiary(true);
    setStatusMessage(null);

    fetch(`/api/diaries/${encodeURIComponent(selectedDate)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("日記の読み込みに失敗しました");
        }
        return res.json();
      })
      .then((data) => {
        if (data && typeof data.content === "string") {
          setContent(data.content);
          setExistsInDb(true);
        } else {
          setContent("");
          setExistsInDb(false);
        }
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        console.error(error);
        setStatusMessage({
          type: "error",
          text: "日記の読み込みに失敗しました",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingDiary(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedDate]);

  const handleSave = async () => {
    if (!selectedDate) return;

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/diaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: selectedDate, content }),
      });

      if (!response.ok) {
        throw new Error("保存に失敗しました");
      }

      setExistsInDb(true);
      await onSaved();
      setStatusMessage({ type: "success", text: "保存しました" });
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDate) return;

    setIsDeleting(true);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `/api/diaries/${encodeURIComponent(selectedDate)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("削除に失敗しました");
      }

      setContent("");
      setExistsInDb(false);
      setIsDeleteDialogOpen(false);
      await onDeleted();
      setStatusMessage({ type: "success", text: "削除しました" });
    } catch (error) {
      console.error(error);
      setIsDeleteDialogOpen(false);
      setStatusMessage({ type: "error", text: "削除に失敗しました" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <section className="flex-1 flex flex-col h-full bg-zinc-900 min-w-0">
        {/* 上部ツールバー：日付選択・保存ボタン・削除ボタン */}
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
              value={selectedDate}
              onChange={(e) => {
                onDateChange(e.target.value);
              }}
              suppressHydrationWarning
              className="p-2.5 bg-[#27272a] rounded-md font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors [color-scheme:dark]"
            />
            {isLoadingDiary && (
              <span className="text-xs text-zinc-500">読み込み中...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {statusMessage && (
              <span
                className={`text-sm mr-2 ${
                  statusMessage.type === "success"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {statusMessage.text}
              </span>
            )}

            {/* 保存ボタン */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isDeleting || !selectedDate}
              className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center shrink-0 ${
                isSaving || isDeleting || !selectedDate
                  ? "bg-[#27272a] text-zinc-600 cursor-not-allowed"
                  : "bg-[#27272a] hover:bg-zinc-700 text-zinc-200 hover:text-white cursor-pointer"
              }`}
            >
              {isSaving ? "保存中..." : "保存"}
            </button>

            {/* 削除ボタン */}
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={!existsInDb || isSaving || isDeleting || !selectedDate}
              title="この日の日記を削除"
              className={`p-2.5 rounded-md transition-colors flex items-center justify-center shrink-0 ${
                !existsInDb || isSaving || isDeleting || !selectedDate
                  ? "bg-[#27272a] text-zinc-600 cursor-not-allowed"
                  : "bg-[#27272a] hover:bg-zinc-700 text-zinc-400 hover:text-red-400 cursor-pointer"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
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

      {/* 日記の削除確認ダイアログ */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setIsDeleteDialogOpen(false)}
          />

          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h3 className="text-lg font-medium text-white">日記の削除</h3>

            <p className="text-zinc-300 text-sm">
              「<span className="font-bold font-mono text-white">{selectedDate}</span>
              」の日記を削除しますか？
              <br />
              （この操作は元に戻せません）
            </p>

            <div className="flex flex-row justify-end gap-2 mt-4">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors font-medium cursor-pointer"
              >
                {isDeleting ? "削除中..." : "削除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
