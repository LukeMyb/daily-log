import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ date: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { date } = await params;

    const diary = await prisma.diary.findUnique({
      where: { date },
    });

    return NextResponse.json(diary);
  } catch (error) {
    console.error("Failed to fetch diary by date:", error);
    return NextResponse.json(
      { error: "日記の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { date } = await params;

    await prisma.diary.deleteMany({
      where: { date },
    });

    return NextResponse.json({ deleted: true, date });
  } catch (error) {
    console.error("Failed to delete diary:", error);
    return NextResponse.json(
      { error: "日記の削除に失敗しました。" },
      { status: 500 }
    );
  }
}
