import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const calendar = new URL(request.url).searchParams.get("calendar");

  if (!calendar || !calendar.startsWith("BEGIN:VCALENDAR")) {
    return NextResponse.json({ error: "Calendar data is required" }, { status: 400 });
  }

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="dinners.ics"',
      "Cache-Control": "no-store",
    },
  });
}