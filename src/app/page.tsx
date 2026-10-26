"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DiaryList, { type DiaryItem } from "@/components/DiaryList";
import DiaryEditor, { getTodayLocalDate } from "@/components/DiaryEditor";

export default function Home() {
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getTodayLocalDate()
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  // スマホ表示時（md未満）のペイン切り替え状態（"editor" | "list"）
  const [mobilePane, setMobilePane] = useState<"editor" | "list">("editor");

  // PWA用サービスワーカーの登録
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }
  }, []);

  const fetchDiaries = useCallback(async () => {
    try {
      const response = await fetch("/api/diaries", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("日記一覧の取得に失敗しました");
      }
      const data: DiaryItem[] = await response.json();
      setDiaries(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  // キーワード入力に応じたリアルタイム絞り込み（本文または日付に部分一致）
  const filteredDiaries = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return diaries;
    return diaries.filter(
      (diary) =>
        diary.content.toLowerCase().includes(keyword) ||
        diary.date.toLowerCase().includes(keyword)
    );
  }, [diaries, searchQuery]);

  // 記録が存在するすべての日付一覧（カレンダーの青いドット表示用）
  const recordedDates = useMemo(
    () => diaries.map((diary) => diary.date),
    [diaries]
  );

  // 一覧から日付を選択した際、スマホ画面では自動的にエディタ表示へ切り替える
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setMobilePane("editor");
  };

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-zinc-900 text-zinc-200">
      <div
        className={`${
          mobilePane === "list" ? "flex" : "hidden"
        } md:flex w-full md:w-auto h-full shrink-0`}
      >
        <DiaryList
          diaries={filteredDiaries}
          isLoading={isLoading}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchSubmit={() => fetchDiaries()}
          onCloseMobileList={() => setMobilePane("editor")}
        />
      </div>

      <div
        className={`${
          mobilePane === "editor" ? "flex" : "hidden"
        } md:flex flex-1 h-full min-w-0`}
      >
        <DiaryEditor
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onSaved={fetchDiaries}
          onDeleted={fetchDiaries}
          onOpenMobileList={() => setMobilePane("list")}
          recordedDates={recordedDates}
        />
      </div>
    </main>
  );
}
