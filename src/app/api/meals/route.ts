import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { MealLists } from "@/lib/dinnerData";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "meals.json");

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

export async function GET() {
  try {
    await ensureDataDir();
    const content = await readFile(DATA_FILE, "utf-8");
    const stored = JSON.parse(content) as MealLists & { schedule?: Record<string, unknown> };
    return NextResponse.json({
      dinner: stored.dinner ?? {},
      lunch: stored.lunch ?? {},
      breakfast: stored.breakfast ?? {},
      schedule: stored.schedule ?? {},
    });
  } catch {
    return NextResponse.json({ dinner: {}, lunch: {}, breakfast: {}, schedule: {} });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDataDir();
    const lists = (await request.json()) as MealLists;
    // Atomic-ish write: write to a temp file then rename
    const tmp = DATA_FILE + ".tmp";
    await writeFile(tmp, JSON.stringify(lists, null, 2), "utf-8");
    const { rename } = await import("fs/promises");
    await rename(tmp, DATA_FILE);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save meals:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
