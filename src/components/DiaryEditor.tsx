"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DiaryEditorProps = {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSaved: () => Promise<void> | void;
  onDeleted: () => Promise<void> | void;
  onOpenMobileList?: () => void;
  recordedDates?: string[];
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

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

function parseYearMonth(dateStr: string): { year: number; month: number } {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 0 && m <= 11) {
      return { year: y, month: m };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default function DiaryEditor({
  selectedDate,
  onDateChange,
  onSaved,
  onDeleted,
  onOpenMobileList,
  recordedDates = [],
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

  // カスタムカレンダーポップオーバー用のState
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const initialYM = parseYearMonth(selectedDate);
  const [viewYear, setViewYear] = useState<number>(initialYM.year);
  const [viewMonth, setViewMonth] = useState<number>(initialYM.month);
  const calendarRef = useRef<HTMLDivElement>(null);

  const recordedDateSet = useMemo(
    () => new Set(recordedDates),
    [recordedDates]
  );

  // 選択中の日付が外部（一覧クリック等）から変わった際、カレンダーの表示年月も追従させる
  useEffect(() => {
    const { year, month } = parseYearMonth(selectedDate);
    setViewYear(year);
    setViewMonth(month);
  }, [selectedDate]);

  // カレンダー枠外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // カレンダーのセル生成
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

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

  const todayStr = getTodayLocalDate();
  const todayYM = parseYearMonth(todayStr);
  const isNextMonthDisabled =
    viewYear > todayYM.year ||
    (viewYear === todayYM.year && viewMonth >= todayYM.month);

  return (
    <>
      <section className="flex-1 flex flex-col h-full bg-zinc-900 min-w-0">
        {/* 上部ツールバー：一覧切替ボタン(スマホのみ)・日付選択・保存ボタン・削除ボタン */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 md:px-6 md:py-3 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* スマホ表示時のみ：一覧画面へ切り替えるメニューボタン */}
            {onOpenMobileList && (
              <button
                type="button"
                onClick={onOpenMobileList}
                className="md:hidden p-2.5 bg-[#27272a] hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-md transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                title="日記一覧を表示"
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
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </button>
            )}

            <span className="hidden sm:inline text-sm font-medium text-zinc-400 shrink-0">
              日付
            </span>

            {/* カスタムカレンダー付き日付選択 */}
            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setIsCalendarOpen((prev) => !prev)}
                suppressHydrationWarning
                className="px-3 py-2 md:py-2.5 bg-[#27272a] hover:bg-zinc-700 rounded-md font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <span suppressHydrationWarning>{selectedDate}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-400"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </button>

              {/* カレンダーポップオーバー */}
              {isCalendarOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-72 p-4 bg-[#1E1E1E] border border-white/15 rounded-xl shadow-2xl z-50 select-none">
                  {/* 年月ヘッダーと月移動ボタン */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                      title="前月"
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
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>

                    <span className="text-sm font-medium text-white">
                      {viewYear}年 {viewMonth + 1}月
                    </span>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      disabled={isNextMonthDisabled}
                      className={`p-1.5 rounded-md transition-colors ${
                        isNextMonthDisabled
                          ? "text-zinc-700 cursor-not-allowed"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                      }`}
                      title="次月"
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
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>

                  {/* 曜日行 */}
                  <div className="grid grid-cols-7 text-center text-xs text-zinc-500 mb-1">
                    {WEEKDAYS.map((dayName) => (
                      <span key={dayName} className="py-1">
                        {dayName}
                      </span>
                    ))}
                  </div>

                  {/* 日付グリッド */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} className="h-9" />;
                      }

                      const dateStr = `${viewYear}-${String(
                        viewMonth + 1
                      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isSelected = dateStr === selectedDate;
                      const isToday = dateStr === todayStr;
                      const isFuture = dateStr > todayStr;
                      const hasDiary = recordedDateSet.has(dateStr);

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={isFuture}
                          onClick={() => {
                            if (isFuture) return;
                            onDateChange(dateStr);
                            setIsCalendarOpen(false);
                          }}
                          className={`h-9 rounded-md flex flex-col items-center justify-center transition-colors ${
                            isFuture
                              ? "text-zinc-600 cursor-not-allowed opacity-50"
                              : isSelected
                              ? "bg-blue-600/25 ring-1 ring-blue-500 text-white font-semibold cursor-pointer"
                              : isToday
                              ? "bg-zinc-800 text-zinc-100 font-semibold hover:bg-zinc-700 cursor-pointer"
                              : "text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                          }`}
                        >
                          <span className="text-xs leading-none">{day}</span>
                          {/* 記録がある日付の下に青い点を表示 */}
                          <span
                            className={`mt-1 h-1.5 w-1.5 rounded-full ${
                              hasDiary ? "bg-blue-500" : "bg-transparent"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* フッター：凡例と「今日」ボタン */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/10 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                      <span>日記あり</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const today = getTodayLocalDate();
                        onDateChange(today);
                        setIsCalendarOpen(false);
                      }}
                      className="px-2 py-1 text-blue-400 hover:text-blue-300 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    >
                      今日へ移動
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isLoadingDiary && (
              <span className="hidden sm:inline text-xs text-zinc-500 shrink-0">
                読み込み中...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {statusMessage && (
              <span
                className={`text-xs sm:text-sm mr-1 ${
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
              className={`px-3.5 py-2 md:px-4 md:py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center shrink-0 ${
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
              className={`p-2 md:p-2.5 rounded-md transition-colors flex items-center justify-center shrink-0 ${
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
        <div className="flex-1 flex flex-col p-3 md:p-6">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (statusMessage) setStatusMessage(null);
            }}
            placeholder="今日の日記を入力..."
            className="w-full flex-1 resize-none p-3.5 md:p-4 bg-[#27272a] rounded-md text-base leading-relaxed text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
