"use client";

import { useCallback, useEffect, useState } from "react";
import DiaryList, { type DiaryItem } from "@/components/DiaryList";
import DiaryEditor from "@/components/DiaryEditor";

export default function Home() {
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  return (
    <main className="flex h-screen w-full overflow-hidden bg-zinc-900 text-zinc-200">
      <DiaryList diaries={diaries} isLoading={isLoading} />
      <DiaryEditor onSaved={fetchDiaries} />
    </main>
  );
}
