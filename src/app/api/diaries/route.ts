import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    const diaries = await prisma.diary.findMany({
      where: q
        ? {
            OR: [
              { content: { contains: q } },
              { date: { contains: q } },
            ],
          }
        : undefined,
      orderBy: {
        date: "desc",
      },
    });
    return NextResponse.json(diaries);
  } catch (error) {
    console.error("Failed to fetch diaries:", error);
    return NextResponse.json(
      { error: "日記一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, content } = body;

    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "date（YYYY-MM-DD）は必須です。" },
        { status: 400 }
      );
    }

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "contentは文字列で指定してください。" },
        { status: 400 }
      );
    }

    const diary = await prisma.diary.upsert({
      where: { date },
      update: { content },
      create: { date, content },
    });

    return NextResponse.json(diary);
  } catch (error) {
    console.error("Failed to save diary:", error);
    return NextResponse.json(
      { error: "日記の保存に失敗しました。" },
      { status: 500 }
    );
  }
}
